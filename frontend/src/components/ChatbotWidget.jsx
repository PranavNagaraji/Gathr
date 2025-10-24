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
    const parsePrice = (p) => {
      if (p == null) return Number.POSITIVE_INFINITY;
      if (typeof p === 'number') return p;
      if (typeof p === 'string') {
        const m = p.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
      }
      return Number.POSITIVE_INFINITY;
    };
    const normalizeCats = (c) => {
      if (!c) return [];
      if (Array.isArray(c)) return c.map((x) => String(x).trim()).filter(Boolean);
      if (typeof c === 'string') return c.split(/,|\//).map((x) => x.trim()).filter(Boolean);
      return [];
    };
    return (items || []).map((it) => {
      const cats = normalizeCats(it.category);
      const priceNum = parsePrice(it.price);
      return {
        id: it.id,
        name: it.name || "",
        description: it.description || "",
        categories: cats,
        category: cats.join(" "),
        price: it.price,
        priceNum,
        image: it.images?.[0]?.url || "/placeholder.png",
      };
    });
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

    // Exclude numeric and price-keyword-only terms from scoring
    const stop = new Set(['under', 'below', 'less', 'than', 'inr', 'rs', '₹']);
    const termsForScoring = terms.filter((t) => !/^\d+$/.test(t) && !stop.has(t));

    const filtered = searchable.filter((it) => {
      const priceOk = intent.maxPrice ? it.priceNum <= intent.maxPrice : true;
      const catOk = intent.category ? it.categories.map((c)=>String(c).toLowerCase()).includes(String(intent.category).toLowerCase()) : true;
      return priceOk && catOk;
    });

    const scored = filtered.map((it) => {
      const blob = `${it.name} ${it.description} ${it.category}`;
      const score = termsForScoring.length ? fuzzyScore(blob, termsForScoring) : 1; // allow price-only queries
      return { item: it, score };
    });

    let list = (termsForScoring.length
      ? scored.filter((s) => s.score > 0)
      : scored // don't filter out for price-only queries
    )
      .sort((a, b) => {
        // Prefer higher score; for ties, lower price then name
        if (b.score !== a.score) return b.score - a.score;
        const ap = Number(a.item.priceNum ?? Infinity);
        const bp = Number(b.item.priceNum ?? Infinity);
        if (ap !== bp) return ap - bp;
        return (a.item.name || '').localeCompare(b.item.name || '');
      })
      .slice(0, 6)
      .map((s) => s.item);

    // Fallback: if no results after scoring (e.g., very narrow terms), show cheapest filtered items
    if (!list.length && filtered.length) {
      list = [...filtered]
        .sort((a, b) => (a.priceNum ?? Infinity) - (b.priceNum ?? Infinity))
        .slice(0, 6);
    }

    return list;
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
          bg-[var(--primary)] text-[var(--primary-foreground)]
          w-14 h-14 
          flex items-center justify-center 
          shadow-lg hover:shadow-xl
          hover:scale-110 active:scale-95 
          transition transform duration-200 ease-in-out
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
        <div className="pointer-events-auto mt-3 w-80 sm:w-96 max-h-[70vh] bg-[var(--card)] border border-[var(--border)] shadow-2xl rounded-xl flex flex-col overflow-hidden text-[var(--card-foreground)]">
          <div className="px-4 py-3 bg-[var(--muted)] text-[var(--muted-foreground)] font-semibold">Shop Assistant</div>
          <div className="px-3 pt-3 flex flex-wrap gap-2 bg-[var(--card)] border-b border-[var(--border)]">
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => setInput(p)} className="text-xs rounded-full px-3 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] hover:opacity-90 transition border border-[var(--border)]">{p}</button>
            ))}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[var(--card)]">
            {messages.map((m, idx) => (
              <div key={idx} className={`max-w-[85%] ${m.role === "user" ? "ml-auto" : "mr-auto"} transition-transform duration-200`}>
                <div className={`${m.role === "user" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"} rounded-2xl px-3 py-2 shadow-sm border border-[var(--border)]`}>{m.text}</div>
                {m.suggestions && (
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {m.suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => goToItem(s.id)}
                        className="flex items-center gap-3 text-left bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] rounded-lg p-2 hover:opacity-90 transition"
                      >
                        <img src={s.image} alt={s.name} className="w-10 h-10 rounded object-cover" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          {s.description && (
                            <div className="text-xs text-[var(--muted-foreground)] truncate" title={s.description}>{s.description}</div>
                          )}
                          <div className="text-xs text-[var(--muted-foreground)] truncate">₹{s.price}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (<div className="text-xs text-[var(--muted-foreground)] animate-pulse">Thinking…</div>)}
          </div>
          <div className="p-3 bg-[var(--card)] border-t border-[var(--border)] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask: 'chips', 'dairy', 'under 200'"
              className="flex-1 px-3 py-2 rounded-lg bg-transparent border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <button onClick={handleSend} className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 disabled:opacity-50" disabled={loading}>Send</button>
          </div>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;
  return createPortal(widget, document.body);
}
