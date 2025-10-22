"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function ChatbotWidget({ items, shopId }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask me to find items, categories, or deals in this shop." }
  ]);
  const scrollRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const searchable = useMemo(() => {
    return (items || []).map((it) => ({
      id: it.id,
      name: it.name || "",
      description: it.description || "",
      categories: it.category || [],
      category: (it.category || []).join(" "),
      price: it.price,
      image: it.images?.[0]?.url || "/placeholder.png",
    }));
  }, [items]);

  const categories = useMemo(() => {
    return Array.from(new Set(searchable.flatMap((s) => s.categories)));
  }, [searchable]);

  const simpleIntent = (q) => {
    const text = q.toLowerCase();
    const under = text.match(/under\s*(?:rs\.?|inr|₹)?\s*(\d+)/i) || text.match(/below\s*(\d+)/i) || text.match(/less than\s*(\d+)/i);
    const maxPrice = under ? Number(under[1]) : null;
    const cat = categories.find((c) => text.includes(String(c).toLowerCase())) || null;
    return { maxPrice, category: cat };
  };

  const fuzzyScore = (text, queryTerms) => {
    const t = text.toLowerCase();
    let score = 0;
    for (const q of queryTerms) {
      if (t.includes(q)) score += 2; // exact
      else if (q.length > 3) {
        // loose contains of 70% of the term
        const part = q.slice(0, Math.ceil(q.length * 0.7));
        if (t.includes(part)) score += 1;
      }
    }
    return score;
  };

  const localSearch = (q) => {
    const query = q.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const intent = simpleIntent(query);
    const filtered = searchable.filter((it) => {
      const priceOk = intent.maxPrice ? Number(it.price) <= intent.maxPrice : true;
      const catOk = intent.category ? it.categories.includes(intent.category) : true;
      return priceOk && catOk;
    });
    const scored = filtered.map((it) => {
      const blob = `${it.name} ${it.description} ${it.category}`;
      return { item: it, score: fuzzyScore(blob, terms) };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || (a.item.name || "").localeCompare(b.item.name || ""))
      .slice(0, 6)
      .map((s) => s.item);
  };

  const sendToBackend = async (q) => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch("/api/shop-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ shopId, message: q, history: messages.slice(-6) }),
      });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      return data;
    } catch (e) {
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const q = input;
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");

    // Try backend
    const data = await sendToBackend(q);
    if (data) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: data.text || "Here are some items:", suggestions: data.suggestions || [] },
      ]);
      return;
    }

    // Fallback to local
    const matches = localSearch(q);
    if (matches.length === 0) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "I couldn't find matching items. Try different keywords, a category name, or a price filter like 'under 200'." },
      ]);
      return;
    }
    setMessages((m) => [
      ...m,
      {
        role: "bot",
        text: `I found ${matches.length} item${matches.length > 1 ? "s" : ""}. Tap one to view details.`,
        suggestions: matches,
      },
    ]);
  };

  const goToItem = (id) => {
    router.push(`/customer/getShops/${shopId}/item/${id}`);
    setOpen(false);
  };

  const quickPrompts = useMemo(() => {
    const base = ["popular", "under 200", "under 500"];
    const catPicks = categories.slice(0, 3);
    return [...base, ...catPicks];
  }, [categories]);

  const widget = (
    <div className="fixed z-[9999] bottom-6 right-6 pointer-events-none">
      <button
        onClick={() => setOpen((o) => !o)}
        className="
          pointer-events-auto 
          rounded-full 
    bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#3A506B] 
    hover:from-[#1C2541] hover:to-[#3A506B] 
          text-white 
          w-14 h-14 
          flex items-center justify-center 
          shadow-lg 
          hover:scale-110 
          active:scale-95 
          transition 
          transform 
          duration-200 
          ease-in-out
        "
        aria-label={open ? "Close shop assistant" : "Open shop assistant"}
      >
        {open ? (
          <span className="text-2xl font-bold">×</span>
        ) : (
          <img src="/AI.png" alt="Chatbot" className="w-6 h-6" />
        )}
      </button>
      {open && (
        <div className="pointer-events-auto mt-3 w-80 sm:w-96 max-h-[70vh] bg-white border border-gray-200 shadow-2xl rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-[#0B132B] text-white font-semibold">Shop Assistant</div>
          <div className="px-3 pt-3 flex flex-wrap gap-2 bg-[#FAF7F5] border-b border-gray-200">
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => setInput(p)} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50">{p}</button>
            ))}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#FAF7F5]">
            {messages.map((m, idx) => (
              <div key={idx} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}>
                <div className={`${m.role === "user" ? "bg-[#0B132B] text-white" : "bg-white text-[#0B132B]"} rounded-2xl px-3 py-2 shadow-sm border border-gray-200`}>{m.text}</div>
                {m.suggestions && (
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {m.suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => goToItem(s.id)}
                        className="flex items-center gap-3 text-left bg-white border border-gray-200 rounded-lg p-2 hover:bg-gray-50"
                      >
                        <img src={s.image} alt={s.name} className="w-10 h-10 rounded object-cover" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          {s.description && (
                            <div className="text-xs text-gray-500 truncate" title={s.description}>{s.description}</div>
                          )}
                          <div className="text-xs text-gray-600 truncate">₹{s.price}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (<div className="text-xs text-gray-500">Thinking…</div>)}
          </div>
          <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask: 'chips', 'dairy', 'under 200'"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F85B57]/30"
            />
            <button onClick={handleSend} className="px-4 py-2 bg-[#F85B57] text-white rounded-lg hover:opacity-90 disabled:opacity-50" disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;
  return createPortal(widget, document.body);
}
