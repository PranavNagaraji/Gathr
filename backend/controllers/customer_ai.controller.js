// Simple in-process memoization (LRU-ish) and cooldown to reduce free-tier usage
const AI_CACHE = new Map(); // key -> { value, ts }
const AI_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const AI_CACHE_MAX = 500;
const LAST_CALL = new Map(); // clerkId -> ts
const PER_USER_COOLDOWN_MS = 8000; // 8 seconds per user

function cacheKey({ base64Image, imageUrl, hints }) {
  try {
    const h = crypto.createHash('sha256');
    if (imageUrl) h.update(`url:${imageUrl}`);
    if (base64Image) {
      // hash only first 120KB to avoid huge memory but stay distinctive
      const slice = base64Image.slice(0, 120 * 1024);
      h.update(`b64:${slice}`);
      h.update(`len:${base64Image.length}`);
    }
    h.update(`hints:${String(hints||'').toLowerCase().slice(0,200)}`);
    return h.digest('hex');
  } catch {
    return `${imageUrl || ''}|${(base64Image||'').length}|${String(hints||'').slice(0,50)}`;
  }
}

function buildShortName(description, categories) {
  try {
    // Prefer the first non-generic category if available
    const generic = new Set(['product','item','goods','thing','object','stuff']);
    const cats = (Array.isArray(categories) ? categories : []).map(c=>String(c||'').toLowerCase());
    for (const c of cats) {
      if (c && !generic.has(c) && c.length >= 3) return c.split(/\s+/).slice(0,3).join(' ');
    }
    const text = String(description || '').toLowerCase();
    const tokens = text.replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
    const stop = new Set(['the','a','an','and','or','for','of','with','to','from','by','on','in','at','is','are','this','that','these','those','it','its','as','be','been','being','new','best','top','quality','very','good','nice']);
    const words = tokens.filter(t => t.length >= 3 && !stop.has(t));
    return words.slice(0,3).join(' ');
  } catch {
    return String((categories||[])[0] || '').split(/\s+/).slice(0,3).join(' ');
  }
}

function cacheGet(key) {
  const entry = AI_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > AI_CACHE_TTL_MS) { AI_CACHE.delete(key); return null; }
  // touch for LRU behavior
  AI_CACHE.delete(key); AI_CACHE.set(key, entry);
  return entry.value;
}

function cacheSet(key, value) {
  if (AI_CACHE.size >= AI_CACHE_MAX) {
    // delete oldest
    const firstKey = AI_CACHE.keys().next().value;
    if (firstKey) AI_CACHE.delete(firstKey);
  }
  AI_CACHE.set(key, { value, ts: Date.now() });
}
import supabase from "../db.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import crypto from "crypto";

dotenv.config();

async function assertCustomer(clerkId) {
  const { data: user, error } = await supabase
    .from("Users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .single();
  if (error || !user) return { error: "User not found" };
  if (user.role !== "customer") return { error: "Unauthorized: Only customers" };
  return { user };
}

function buildPrompt(hints) {
  const base = `You are assisting a merchant to create a product listing.
Return STRICT JSON only with keys: name (string), description (string, 2-4 sentences), categories (array of strings, 1-3 entries), price (number in INR, reasonable starting MRP).
Do not include markdown fences.
Keep it accurate to the image. ${hints ? "Hints: " + hints : ""}`;
  return base;
}

async function fetchImageToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch image");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buf = await res.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  return { data: b64, mime: contentType };
}

// Build a compact search query from description and categories
function buildSearchQuery(description, categories) {
  try {
    const cat = Array.isArray(categories) ? categories.join(' ') : '';
    const text = `${cat} ${String(description || '')}`.toLowerCase();
    const tokens = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const stop = new Set(['the','a','an','and','or','for','of','with','to','from','by','on','in','at','is','are','this','that','these','those','it','its','as','be','been','being','new','best','top','quality']);
    const freq = new Map();
    for (const t of tokens) {
      if (t.length < 3 || stop.has(t)) continue;
      freq.set(t, (freq.get(t) || 0) + 1);
    }
    const sorted = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).map(([w])=>w);
    const top = sorted.slice(0, 5);
    return top.join(' ');
  } catch {
    return String((categories||[]).join(' ')).trim();
  }
}

function parseGeminiJSON(text) {
  try {
    let t = String(text || '').trim();
    // strip common code fences ```json ... ``` or ``` ... ```
    if (t.startsWith("```")) {
      t = t.replace(/^```[a-zA-Z]*\n?|```$/g, "");
    }
    return JSON.parse(t);
  } catch {
    try {
      // try to extract JSON substring
      const m = String(text || '').match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

export async function describeImage(req, res) {
  try {
    const { clerkId, imageUrl, base64Image, hints } = req.body || {};
    if (!clerkId) return res.status(400).json({ message: "Missing clerkId" });

    const { user, error } = await assertCustomer(clerkId);
    if (error) return res.status(403).json({ message: error });

    // per-user cooldown
    const last = LAST_CALL.get(clerkId) || 0;
    const now = Date.now();
    if (now - last < PER_USER_COOLDOWN_MS) {
      return res.status(429).json({ message: 'Throttled' });
    }
    LAST_CALL.set(clerkId, now);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "GEMINI_API_KEY not configured" });

    let inline;
    if (base64Image) {
      inline = { data: base64Image, mime: "image/png" };
    } else if (imageUrl) {
      inline = await fetchImageToBase64(imageUrl);
    } else {
      return res.status(400).json({ message: "Provide imageUrl or base64Image" });
    }

    // cache check
    const key = cacheKey({ base64Image, imageUrl, hints });
    const cached = cacheGet(key);
    if (cached) {
      return res.status(200).json(cached);
    }

    const prompt = buildPrompt(hints);
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: inline.mime, data: inline.data } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 512 },
    };

    let data, ok = false, status = 0, lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
        status = resp.status;
        data = await resp.json().catch(() => ({}));
        if (resp.ok) { ok = true; break; }
        // backoff for rate limit/overload
        if (status === 429 || String(data?.error?.message || '').toLowerCase().includes('overload')) {
          await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        break;
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    if (!ok) {
      const msg = String(data?.error?.message || lastErr?.message || 'Gemini request failed');
      const overloaded = status === 429 || msg.toLowerCase().includes('overload');
      if (overloaded) {
        return res.status(503).json({ message: 'ModelOverloaded' });
      }
      console.error("Gemini error", data || lastErr);
      return res.status(500).json({ message: msg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "";
    const parsed = parseGeminiJSON(text);
    if (parsed && parsed.description) {
      const categories = Array.isArray(parsed.categories) ? parsed.categories.slice(0, 5) : [];
      const description = String(parsed.description).slice(0, 2000);
      const searchQuery = buildSearchQuery(description, categories);
      const shortName = buildShortName(description, categories);
      const result = { description, categories, searchQuery, shortName };
      cacheSet(key, result);
      return res.status(200).json(result);
    }
    // Fallback: use raw text as description if strict JSON was not returned
    const fallback = String(text || '').trim();
    if (fallback) {
      const description = fallback.slice(0, 2000);
      const searchQuery = buildSearchQuery(description, []);
      const shortName = buildShortName(description, []);
      const result = { description, categories: [], searchQuery, shortName };
      cacheSet(key, result);
      return res.status(200).json(result);
    }
    return res.status(500).json({ message: "Model did not return expected JSON", raw: text });
  } catch (e) {
    console.error("describeImage error:", e);
    return res.status(500).json({ message: e.message || "Internal server error" });
  }
}
