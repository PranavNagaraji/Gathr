export const dynamic = "force-dynamic";

/**
 * Full-featured, grounded recommendation endpoint.
 * - Uses LLM (Gemini) only to extract structured intent and a brief response hint.
 * - Expands user attributes via a semanticMap (no hallucination).
 * - Filters and ranks actual shop items only (never invents items).
 */

/* -------------------- Utilities & Semantic Data -------------------- */

function normalizeText(s = "") {
  return String(s).toLowerCase();
}

// Try to read a numeric rating from common fields (kept defensive)
function getItemRating(it) {
  const cand = [
    it?.rating,
    it?.ratings,
    it?.averageRating,
    it?.avgRating,
    it?.reviewAvg,
    it?.stars,
  ];
  for (const v of cand) {
    const n = Number(v);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 0;
}

const semanticMap = {
  cheesy: ["pizza", "burger", "sandwich", "pasta", "fries", "naan"],
  cheese: ["pizza", "burger", "sandwich", "paneer", "cheese-toast"],
  spicy: ["tacos", "curry", "nachos", "samosa", "hot-wings"],
  sweet: ["cake", "cookie", "ice cream", "pastry", "donut"],
  crispy: ["fries", "chips", "nachos", "crisps", "pakora"],
  healthy: ["salad", "smoothie", "juice", "wrap"],
  drink: ["juice", "milkshake", "shake", "coffee", "tea"],
  dessert: ["cake", "ice cream", "pastry", "muffin"],
  savory: ["burger", "pizza", "sandwich", "pasta"],
};

// Simple intrinsic attributes inferred from item name (keeps things grounded)
function intrinsicAttributesForName(name) {
  const n = normalizeText(name);
  const tags = new Set();
  const add = (...arr) => arr.forEach(t => tags.add(t));
  if (/pizza/.test(n)) add("cheesy", "savory", "cheese");
  if (/(cake|pastry|doughnut|donut|muffin|cupcake)/.test(n)) add("sweet", "dessert", "creamy");
  if (/cookie|cookies/.test(n)) add("sweet", "dessert");
  if (/pasta|noodles|spaghetti|macaroni/.test(n)) add("savory");
  if (/burger|sandwich|bread|wrap/.test(n)) add("savory");
  if (/chips|nachos|fries|crisps|pakora/.test(n)) add("crispy", "savory");
  if (/salad/.test(n)) add("fresh", "healthy", "vegetarian");
  if (/ice\s*cream|milkshake|shake/.test(n)) add("sweet", "creamy", "dessert");
  if (/juice/.test(n)) add("sweet", "drink", "healthy");
  if (/coffee/.test(n)) add("bitter", "drink");
  if (/tea/.test(n)) add("drink");
  if (/chocolate/.test(n)) add("sweet", "dessert");
  if (/cheese|cheesy/.test(n)) add("cheese", "cheesy", "savory");
  if (/soup|curry|gravy|hot/.test(n)) add("savory", "spicy");
  return Array.from(tags);
}

function parsePriceMention(q) {
  if (!q) return null;
  const underMatch = q.match(/\b(?:under|below|less than)\s*(?:rs\.?|inr|₹)?\s*(\d{1,7})\b/i);
  if (underMatch) return Number(underMatch[1]);
  const uptoMatch = q.match(/\bup to\s*(?:rs\.?|inr|₹)?\s*(\d{1,7})\b/i);
  if (uptoMatch) return Number(uptoMatch[1]);
  return null;
}

function parseWithAttributes(message) {
  // capture "with cheese and extra chilli" or "with cheese"
  const t = (message || "").toLowerCase();
  const m = t.match(/with\s+([a-z0-9\s, and-]+)$/i);
  if (!m) return [];
  const raw = m[1].trim();
  return raw.split(/\s+and\s+|,\s*|\s+/).map(s => s.trim()).filter(Boolean);
}

function expandTerms(list = []) {
  const base = new Set();
  for (const term of list || []) {
    const t = normalizeText(term);
    if (!t) continue;
    base.add(t);
    if (t === "cheese" || t === "cheesy") { base.add("cheese"); base.add("cheesy"); }
    if (t === "savory") { base.add("savory"); base.add("umami"); }
    if (t === "spicy") { base.add("spicy"); base.add("hot"); base.add("chili"); base.add("chilli"); }
    if (t === "sweet") { base.add("sweet"); base.add("dessert"); base.add("sugary"); }
    if (t === "crispy") { base.add("crispy"); base.add("crunchy"); }
    if (semanticMap[t]) semanticMap[t].forEach(x => base.add(x));
  }
  return Array.from(base);
}

/* -------------------- LLM Intent Extraction (Gemini) -------------------- */

async function analyzeQueryIntentGemini({ message, history = [], categories = [] , shopName = "this shop" }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Use only last 5 history turns to keep prompt compact
  const historyText = (Array.isArray(history) ? history.slice(-5) : []).map(m => `${m.role}: ${m.text}`).join("\n");

  // Important: instruct LLM NOT to invent items or facts.
  const userPrompt = [
    `You are a strict structured intent parser for a shop assistant for ${shopName}.`,
    `Do NOT invent any items, prices, or categories. Only extract intent from the user's query text.`,
    `Available categories: ${categories.join(", ") || "none"}.`,
    `Return STRICT JSON with exactly the fields below (no extra commentary):`,
    `{"intent":"search" or "qa","keywords":[...strings...],"category":string or null,"maxPrice":number or null,"attributes":[...strings...],"responseHint":"short 1-2 sentence answer hint"}`,
    `User message: ${message}`,
    historyText ? `Chat history:\n${historyText}` : `Chat history: (none)`
  ].join("\n\n");

  const payload = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.0,
      topP: 0.8,
      maxOutputTokens: 300
    }
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    // Parse JSON strictly
    const parsed = JSON.parse(text);
    // Normalise
    parsed.keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(k=>String(k).toLowerCase()) : [];
    parsed.attributes = Array.isArray(parsed.attributes) ? parsed.attributes.map(a=>String(a).toLowerCase()) : [];
    parsed.category = parsed.category || null;
    parsed.maxPrice = parsed.maxPrice != null ? Number(parsed.maxPrice) : null;
    parsed.intent = parsed.intent || (parsed.keywords.length || parsed.category || parsed.maxPrice ? "search" : "qa");
    return parsed;
  } catch (e) {
    // If parsing fails, return null to trigger fallback
    return null;
  }
}

/* -------------------- Heuristic Intent Extraction Fallbacks -------------------- */

function simpleIntentHeuristic(message, categories = []) {
  const t = normalizeText(message || "");
  const keywords = t.split(/\s+/).filter(Boolean);
  const maxPrice = parsePriceMention(t);
  let category = null;
  if (Array.isArray(categories)) {
    for (const c of categories) {
      if (t.includes(String(c).toLowerCase())) { category = c; break; }
    }
  }
  const questionWords = ["what","which","do you","can you","how","where","price","cost"];
  const verbs = ["find","show","recommend","buy","get","available","suggest","give me","show me"];
  const looksLikeSearch = Boolean(maxPrice || keywords.some(k => verbs.some(v => k.includes(v))) || category || /\b\d+\b/.test(t));
  const looksLikeQuestion = /\?$/.test(t) || questionWords.some(q => t.includes(q)) || ["hi","hello","hey","yo","hola","namaste"].includes(t.trim());
  const intent = looksLikeSearch ? "search" : (looksLikeQuestion ? "qa" : "search");
  return { intent, keywords, category, maxPrice, attributes: [] };
}

/* -------------------- Scoring & Ranking -------------------- */

/* -------------------- Scoring & Ranking (FIXED) -------------------- */

function buildDesiredAttributeSets(desiredAttrs = []) {
  const pos = new Set(desiredAttrs || []);
  const neg = new Set();
  const has = k => pos.has(k);

  // --- NEW LOGIC ---
  // Infer broad categories from specific attributes
  const wantsSavory = has('savory') || has('umami') || has('cheesy') || has('cheese') || has('spicy');
  const wantsSweet = has('sweet') || has('dessert') || has('pastry') || has('cake') || has('cookie');

  // If they ask for sweet, penalize savory/spicy things.
  if (wantsSweet) {
    neg.add('savory');
    neg.add('spicy');
    neg.add('umami');
    neg.add('cheesy');
  }

  // **THIS IS THE KEY FIX FOR YOUR PROBLEM**
  // If they ask for savory/cheesy, penalize sweet things.
  // We add "!wantsSweet" so we don't penalize "sweet and spicy" requests.
  if (wantsSavory && !wantsSweet) {
    neg.add('sweet');
    neg.add('dessert');
  }
  // --- END NEW LOGIC ---

  return { positive: Array.from(pos), negative: Array.from(neg) };
}

function scoreItem(item, { searchTerms = [], attributes = [], desiredCategory = null, wantsPopular = false, weights = {} }) {
  const blob = `${item.name || ""} ${item.description || ""} ${(item.category || []).join(" ")}`.toLowerCase();
  const intrinsic = intrinsicAttributesForName(item.name);
  const { positive: desiredPos, negative: desiredNeg } = buildDesiredAttributeSets(attributes || []);
  let score = 0;

  // keyword matches
  for (const k of searchTerms) {
    if (!k) continue;
    if (blob.includes(k)) score += (weights.keywordExact || 3);
    else if (k.length > 3) {
      const part = k.slice(0, Math.ceil(k.length * 0.7));
      if (blob.includes(part)) score += (weights.keywordFuzzy || 1);
    }
  }

  // attributes match (explicit)
  for (const attr of attributes || []) {
    if (!attr) continue;
    if (blob.includes(attr)) score += (weights.attrExact || 2);
    if (intrinsic.includes(attr)) score += (weights.attrIntrinsic || 3);
  }

  // bonus for category match
  if (desiredCategory && Array.isArray(item.category) && item.category.includes(desiredCategory)) {
    score += (weights.categoryMatch || 2);
  }

  // small bonus for price proximity (if price provided as number)
  if (typeof item.price === "number" && typeof weights.priceBonus === "number") {
    // no-op here; price handled by filter outside; optionally small bonus for lower price
    // score += Math.max(0, (weights.priceBonus * (100 - Math.min(100, item.price / 10))));
  }

  // penalty logic
  for (const bad of desiredNeg) {
    if (intrinsic.includes(bad)) score -= (weights.contradiction || 3);
  }

  // Popularity boost using rating
  const rating = getItemRating(item); // usually 0-5
  if (rating > 0) {
    const norm = Math.max(0, Math.min(5, rating)) / 5; // 0..1
    score += norm * (wantsPopular ? (weights.ratingPopularBoost || 8) : (weights.ratingGeneralBoost || 2));
  }

  return score;
}

/* -------------------- Gemini assistance for recommendation text (optional) -------------------- */

async function maybeGeminiTextSuggestion(message, shopName, topItems = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const itemsSummary = topItems.slice(0, 6).map(it => `${it.name} - ₹${it.price}`).join("\n");
    const payload = {
      contents: [
        { role: "user", parts: [{ text: `You are a concise assistant for ${shopName}. User message: ${message}. Available items:\n${itemsSummary}\nProvide a short 1-2 sentence suggestion referencing up to 3 items (do NOT invent anything new).` }] }
      ],
      generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 120 }
    };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (e) {
    return null;
  }
}

/* -------------------- Main POST handler -------------------- */

export async function POST(req) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const body = await req.json();
    const { shopId, message, history } = body || {};
    if (!shopId || !message) {
      return new Response(JSON.stringify({ error: "shopId and message are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Forward auth header to backend if present
    const authHeader = req.headers.get("authorization") || "";

    // Fetch items from backend
    let items = [];
    let shopName = "this shop";
    try {
      const itemsRes = await fetch(`${API_URL}/api/customer/getShopItem/${shopId}`, {
        headers: { Authorization: authHeader }
      });
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        items = Array.isArray(data.items) ? data.items : (data.items || []);
        shopName = data.shopName || shopName;
      } else {
        // If backend returns not-ok, continue with empty items
        items = [];
      }
    } catch (e) {
      items = [];
    }

    // Build categories list (unique)
    const categories = Array.from(new Set(items.flatMap(it => (it.category || []))));

    // 1) Use Gemini to analyze intent (preferred)
    let aiIntent = await analyzeQueryIntentGemini({ message, history, categories, shopName });

    // 2) Fallback to heuristics if LLM missing or failed
    if (!aiIntent) {
      aiIntent = simpleIntentHeuristic(message, categories);
    }

    // Merge heuristic price parse to ensure we don't miss explicit "under 200"
    const explicitMaxPrice = parsePriceMention(message);
    if (!aiIntent.maxPrice && explicitMaxPrice) aiIntent.maxPrice = explicitMaxPrice;

    // If AI says QA (not a search), return a helpful reply (use aiIntent.responseHint if available)
    if (aiIntent.intent === "qa") {
      const hint = aiIntent.responseHint || `I can help you search items in ${shopName}. Try "cheesy snacks under 200" or "vegan drinks".`;
      return new Response(JSON.stringify({ text: hint, suggestions: [], aiUsed: Boolean(aiIntent) }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Build initial search terms & attributes
    let searchTerms = Array.isArray(aiIntent.keywords) ? aiIntent.keywords.map(k => normalizeText(k)) : [];
    let attributes = Array.isArray(aiIntent.attributes) ? aiIntent.attributes.map(a => normalizeText(a)) : [];

    // Parse "with X" attributes in message
    const withAttrs = parseWithAttributes(message);
    if (withAttrs.length) attributes.push(...withAttrs.map(a => normalizeText(a)));

    // Expand attributes and terms via semantic map & synonyms
    const expandedAttributes = expandTerms(attributes);
    const expandedTerms = expandTerms(searchTerms);

    // Add semantic expansions for each attribute (e.g., cheesy -> pizza, burger)
    for (const attr of expandedAttributes) {
      if (semanticMap[attr]) {
        semanticMap[attr].forEach(x => expandedTerms.push(x));
      }
    }

    // De-dup terms
    const uniqueSearchTerms = Array.from(new Set(expandedTerms.map(t => normalizeText(t)).filter(Boolean)));
    const uniqueAttributes = Array.from(new Set(expandedAttributes.map(t => normalizeText(t)).filter(Boolean)));

    // Detect popularity intent
    const wantsPopular = /\b(popular|top rated|top-rated|highest rated|most rated|most popular|best)\b/i.test(message);

    // Filter items by price and category as hard constraints first (no hallucination)
    const maxPrice = aiIntent.maxPrice || null;
    const desiredCategory = aiIntent.category || null;
    let filtered = items.filter(it => {
      const inPrice = maxPrice ? Number(it.price) <= Number(maxPrice) : true;
      const inCat = desiredCategory ? (Array.isArray(it.category) && it.category.includes(desiredCategory)) : true;
      return inPrice && inCat;
    });

    // If no items after strict filter but maxPrice or category were provided, try relaxing one constraint (broad search)
    if (filtered.length === 0 && (maxPrice || desiredCategory)) {
      // try relaxing category first
      if (desiredCategory) {
        filtered = items.filter(it => {
          const inPrice = maxPrice ? Number(it.price) <= Number(maxPrice) : true;
          return inPrice;
        });
      }
      // if still nothing and maxPrice existed, relax price
      if (filtered.length === 0 && maxPrice) {
        filtered = items.filter(it => {
          const inCat = desiredCategory ? Array.isArray(it.category) && it.category.includes(desiredCategory) : true;
          return inCat;
        });
      }
    }

    // If still empty, fallback to all items (we'll rank them)
    if (!filtered.length) filtered = items;

    // Scoring weights (tweakable)
    const weights = {
      keywordExact: 3,
      keywordFuzzy: 1,
      attrExact: 2,
      attrIntrinsic: 3,
      categoryMatch: 2,
      contradiction: 3
    };

    // Score items
    const scored = filtered.map(it => {
      const score = scoreItem(it, { searchTerms: uniqueSearchTerms, attributes: uniqueAttributes, desiredCategory, wantsPopular, weights });
      return { item: it, score };
    });

    // Sort and keep top N
    let ranked = scored
      .filter(s => s.score > 0) // require positive signal
      .sort((a,b) => {
        if (wantsPopular) {
          const br = getItemRating(b.item);
          const ar = getItemRating(a.item);
          if (br !== ar) return br - ar; // primary: rating desc
        }
        return b.score - a.score; // secondary: score desc
      })
      .slice(0, 12)
      .map(s => s.item);

    // If no ranked items (no positive score), broaden and allow fuzzy matches lightly
    let finalRanked = ranked;
    if (finalRanked.length === 0) {
      const broadScored = filtered.map(it => {
        // Looser weights for broad search
        const looseWeights = { ...weights, keywordExact: 2, keywordFuzzy: 1, attrExact: 1, attrIntrinsic: 2, categoryMatch: 1, contradiction: 2 };
        const score = scoreItem(it, { searchTerms: uniqueSearchTerms, attributes: uniqueAttributes, desiredCategory, wantsPopular, weights: looseWeights });
        return { item: it, score };
      }).sort((a,b) => b.score - a.score);
      finalRanked = broadScored.filter(s => s.score > 0).slice(0, 12).map(s => s.item);
    }

    // If still nothing but popular requested, pick top-rated items irrespective of terms
    if (finalRanked.length === 0 && wantsPopular) {
      const topByRating = (filtered.length ? filtered : items)
        .slice()
        .sort((a,b) => getItemRating(b) - getItemRating(a))
        .filter(it => getItemRating(it) > 0)
        .slice(0, 6);
      finalRanked = topByRating;
    }

    // Prepare suggestions
    const suggestions = finalRanked.slice(0, 6).map(it => ({
      id: it.id,
      name: it.name,
      price: it.price,
      description: it.description || "",
      image: (it.images && it.images[0] && it.images[0].url) || "/placeholder.png",
      category: it.category || []
    }));

    // Try to generate a concise human-friendly text using Gemini (but ask it NOT to invent)
    const aiText = await maybeGeminiTextSuggestion(message, shopName, suggestions);

    let fallbackText = aiIntent.responseHint || (suggestions.length ? `I found ${suggestions.length} item${suggestions.length>1?'s':''} that match your request.` : `No exact matches in ${shopName}. Try different keywords, remove the price, or try a broader category.`);
    if (wantsPopular && suggestions.length) {
      fallbackText = `Top rated picks for you.`;
    } else if (wantsPopular && !suggestions.length) {
      fallbackText = `Couldn't find rated items. Try a different shop or query.`;
    }

    return new Response(JSON.stringify({
      text: aiText || fallbackText,
      suggestions,
      aiUsed: Boolean(aiIntent),
      debug: {
        // debug fields are helpful during development; remove in production
        parsedIntent: aiIntent,
        searchTerms: uniqueSearchTerms,
        attributes: uniqueAttributes,
        filteredCount: filtered.length
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Recommendation error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
