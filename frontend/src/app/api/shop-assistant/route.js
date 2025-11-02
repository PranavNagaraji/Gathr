import { NextResponse } from "next/server";

const apiKey = process.env.GOOGLE_API_KEY;

/* ------------------------------------------------------------
   🔹 INTENT CLASSIFIER (Hybrid local + Gemini fallback)
------------------------------------------------------------ */
async function classifyQuery(message) {
  const msg = message.toLowerCase().trim();

  // --- Local rules first for reliability
  if (
    /(where.*shop|address|location|map|situated|find.*shop|owner|shopkeeper|contact|phone|number|email|open|timing|hours|manager)/.test(
      msg
    )
  ) {
    return "shop_info";
  }

  if (
    /(price|cost|buy|product|item|available|availability|stock|recommend|suggest|category|offer|discount|cheap|expensive)/.test(
      msg
    )
  ) {
    return "product";
  }

  if (/(hi|hello|hey|thank|thanks|good|morning|evening|help|how are you)/.test(msg)) {
    return "general";
  }

  // --- Gemini fallback for uncertain queries
  const prompt = `
You are an intent classification module for a store assistant.
Return ONLY valid JSON like this:
{"intent":"shop_info"} OR {"intent":"product"} OR {"intent":"general"}

User message: "${message}"
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
    const parsed = JSON.parse(raw);

    if (["shop_info", "product", "general"].includes(parsed.intent)) {
      return parsed.intent;
    }
  } catch (e) {
    console.warn("⚠️ Gemini intent parse failed:", e.message);
  }

  return "general";
}

/* ------------------------------------------------------------
   🔹 HELPERS
------------------------------------------------------------ */

// Fetch shop info + owner details
async function fetchShopDetails(shopId) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/customer/getShopOwnerInfo/${shopId}`
  );
  if (!res.ok) throw new Error("Failed to fetch shop details");
  return res.json();
}

// Fetch items from database
async function fetchShopProducts(shopId) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/customer/getShopItems/${shopId}`
  );
  if (!res.ok) throw new Error("Failed to fetch shop products");
  const data = await res.json();
  return data.items || [];
}

/* ------------------------------------------------------------
   🔹 MAIN HANDLER
------------------------------------------------------------ */
export async function POST(req) {
  try {
    const { shopId, message } = await req.json();

    if (!shopId || !message) {
      return NextResponse.json(
        { reply: "Missing shopId or message.", suggestions: null },
        { status: 400 }
      );
    }

    const intent = await classifyQuery(message);
    console.log("🧩 Intent:", intent);

    /* --------------------------------------------------------
       🏪 SHOP INFO INTENT
    -------------------------------------------------------- */
    if (intent === "shop_info") {
      const shopData = await fetchShopDetails(shopId);
      const shop = shopData.shop || {};
      const owner = shopData.owner || {};

      let reply = "";

      if (shop.name) reply += `🏪 Our shop name is **${shop.name}**.\n`;
      if (shop.address)
        reply += `📍 We are located at **${shop.address}**.\n`;
      if (shop.Location)
        reply += `🗺️ Find us here: [Google Maps](https://www.google.com/maps?q=${encodeURIComponent(
          shop.Location
        )})\n`;
      if (owner?.name)
        reply += `👤 The shop is owned by **${owner.name}**.\n`;
      if (owner?.email)
        reply += `📧 You can reach us at **${owner.email}**.\n`;

      if (!reply)
        reply =
          "Sorry, I couldn’t retrieve the shop details right now.";

      return NextResponse.json({ reply, suggestions: null });
    }

    /* --------------------------------------------------------
       🛍️ PRODUCT INTENT
    -------------------------------------------------------- */
    if (intent === "product") {
      const products = await fetchShopProducts(shopId);
      if (!products || products.length === 0) {
        return NextResponse.json({
          reply: "I couldn’t find any products right now.",
          suggestions: null,
        });
      }

      const productList = products
        .slice(0, 15)
        .map(
          (p) =>
            `${p.name} (₹${p.price || "?"}) in category ${
              p.category || "Uncategorized"
            }`
        )
        .join(", ");

      const prompt = `
You are a helpful shop assistant.
Use ONLY the following available products to answer the customer's question or recommendation request.
If the customer asks for a specific product and it's not in the list, politely say it's not available.

Products: ${productList}

Customer: "${message}"
`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await geminiRes.json();
      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "I'm sorry, I couldn't find that info.";

      return NextResponse.json({
        reply: aiText,
        suggestions: products.slice(0, 3), // top 3 products to show as cards
      });
    }

    /* --------------------------------------------------------
       💬 GENERAL INTENT
    -------------------------------------------------------- */
    const genPrompt = `
You are a friendly chatbot for a local store.
Respond briefly and politely.
User: "${message}"
`;

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: genPrompt }] }],
        }),
      }
    );

    const genData = await genRes.json();
    const generalText =
      genData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Hi there! How can I help you today?";

    return NextResponse.json({ reply: generalText, suggestions: null });
  } catch (err) {
    console.error("❌ Assistant Error:", err);
    return NextResponse.json(
      { reply: "Something went wrong.", suggestions: null, error: err.message },
      { status: 500 }
    );
  }
}
