import supabase from "../db.js";
import { Clerk } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

async function assertMerchant(clerkId) {
  const { data: user, error } = await supabase
    .from("Users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .single();
  if (error || !user) return { error: "User not found" };
  if (user.role !== "merchant") return { error: "Unauthorized: Only merchants" };
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

function parseGeminiJSON(text) {
  try {
    const raw = String(text || '').trim();
    // First, handle fenced code blocks like ```json ... ``` or ``` ... ```
    const fenced = raw.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      const inner = fenced[1].trim();
      try { return JSON.parse(inner); } catch {}
    }

    // Strip any stray backtick fences if present and try parse again
    const defenced = raw
      .replace(/```(?:json|javascript|js)?/gi, '')
      .replace(/```/g, '')
      .trim();
    try { return JSON.parse(defenced); } catch {}

    // Fall back: extract the largest JSON-looking block between first { and last }
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      const candidate = raw.slice(first, last + 1);
      try { return JSON.parse(candidate); } catch {}
    }
  } catch {}
  return null;
}

export async function generateItemFromImage(req, res) {
  try {
    const { clerkId, imageUrl, base64Image, hints } = req.body || {};
    if (!clerkId) return res.status(400).json({ message: "Missing clerkId" });
    const { user, error } = await assertMerchant(clerkId);
    if (error) return res.status(403).json({ message: error });

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

    // Helper to call Gemini with a given prompt and generation config
    async function geminiGenerate(prompt, genCfg) {
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
        generationConfig: { ...genCfg },
      };
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error?.message || "Gemini request failed");
      }
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("\n") || "";
      return text;
    }

    // Try 1: normal prompt
    const prompt1 = buildPrompt(hints);
    let text = await geminiGenerate(prompt1, { temperature: 0.2, topP: 0.9, maxOutputTokens: 512 });
    let parsed = parseGeminiJSON(text);
    
    // Try 2: stricter prompt + lower temperature if parsing failed
    if (!parsed || !parsed.name || !parsed.description) {
      const prompt2 = `${prompt1}\nReturn ONLY a single valid JSON object. Do NOT include any explanation or code fences.`;
      try {
        text = await geminiGenerate(prompt2, { temperature: 0, topP: 0.8, maxOutputTokens: 512 });
        parsed = parseGeminiJSON(text);
      } catch (e) {
        // fall through to error below with raw text if still failing
      }
    }
    if (!parsed || !parsed.name || !parsed.description) {
      return res.status(500).json({ message: "Model did not return expected JSON", raw: text });
    }

    // sanitize categories and price
    const categories = Array.isArray(parsed.categories) ? parsed.categories.slice(0, 5) : [];
    const price = Number(parsed.price) > 0 ? Math.round(Number(parsed.price)) : 100;

    return res.status(200).json({
      name: String(parsed.name).slice(0, 120),
      description: String(parsed.description).slice(0, 2000),
      categories,
      price,
    });
  } catch (e) {
    console.error("generateItemFromImage error:", e);
    return res.status(500).json({ message: e.message || "Internal server error" });
  }
}
