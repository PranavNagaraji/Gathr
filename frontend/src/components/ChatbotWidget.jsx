"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  MessageSquare,
  ShoppingCart,
  Star,
  Zap,
  Clock,
} from "lucide-react";

/**
 * Professional Ecommerce Chatbot Widget
 * - polished product cards in suggestions
 * - typing indicator + loading state
 * - keyboard accessibility (Esc to close, Enter to send)
 * - focus handling & scroll-to-bottom
 * - responsive, supports Tailwind dark: variants
 * - keeps your backend fallback/local-search logic intact
 *
 * Keep your CSS variables (e.g. --primary) or rely on Tailwind's dark: utilities.
 */

export default function ChatbotWidget({ items = [], shopId }) {
  const router = useRouter();
  const { getToken } = useAuth();

  // UI state
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi 👋 I can help you find items, categories, deals or give recommendations. Try: “under 200” or “chips”.",
    },
  ]);
  const [mounted, setMounted] = useState(false);

  // Refs
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);

  // Utils for parsing/searching (kept and slightly improved)
  const searchable = useMemo(() => {
    const parsePrice = (p) => {
      if (p == null) return Number.POSITIVE_INFINITY;
      if (typeof p === "number") return p;
      if (typeof p === "string") {
        const m = p.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
      }
      return Number.POSITIVE_INFINITY;
    };
    const normalizeCats = (c) => {
      if (!c) return [];
      if (Array.isArray(c)) return c.map((x) => String(x).trim()).filter(Boolean);
      if (typeof c === "string") return c.split(/,|\//).map((x) => x.trim()).filter(Boolean);
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
        rating: it.rating ?? null, // optional
      };
    });
  }, [items]);

  const categories = useMemo(() => Array.from(new Set(searchable.flatMap((s) => s.categories))), [searchable]);

  const simpleIntent = (q) => {
    const text = q.toLowerCase();
    const under =
      text.match(/under\s*(?:rs\.?|inr|₹)?\s*(\d+)/i) ||
      text.match(/below\s*(\d+)/i) ||
      text.match(/less than\s*(\d+)/i);
    const maxPrice = under ? Number(under[1]) : null;
    const cat = categories.find((c) => text.includes(String(c).toLowerCase())) || null;
    return { maxPrice, category: cat };
  };

  const fuzzyScore = (text, queryTerms) => {
    const t = text.toLowerCase();
    let score = 0;
    for (const q of queryTerms) {
      if (t.includes(q)) score += 4; // exact
      else if (q.length > 3) {
        const part = q.slice(0, Math.ceil(q.length * 0.7));
        if (t.includes(part)) score += 1;
      }
      // small bonus if term matches category words
    }
    return score;
  };

  const localSearch = (q) => {
    const query = q.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const intent = simpleIntent(query);

    const stop = new Set(["under", "below", "less", "than", "inr", "rs", "₹"]);
    const termsForScoring = terms.filter((t) => !/^\d+$/.test(t) && !stop.has(t));

    const filtered = searchable.filter((it) => {
      const priceOk = intent.maxPrice ? it.priceNum <= intent.maxPrice : true;
      const catOk = intent.category ? it.categories.map((c) => c.toLowerCase()).includes(intent.category.toLowerCase()) : true;
      return priceOk && catOk;
    });

    const scored = filtered.map((it) => {
      const blob = `${it.name} ${it.description} ${it.category}`;
      const score = termsForScoring.length ? fuzzyScore(blob, termsForScoring) : 1;
      return { item: it, score };
    });

    let list = (termsForScoring.length
      ? scored.filter((s) => s.score > 0)
      : scored
    )
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ap = Number(a.item.priceNum ?? Infinity);
        const bp = Number(b.item.priceNum ?? Infinity);
        if (ap !== bp) return ap - bp;
        return (a.item.name || "").localeCompare(b.item.name || "");
      })
      .slice(0, 6)
      .map((s) => s.item);

    if (!list.length && filtered.length) {
      list = [...filtered].sort((a, b) => (a.priceNum ?? Infinity) - (b.priceNum ?? Infinity)).slice(0, 6);
    }

    return list;
  };

  // Backend call
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

  // Send handler
  const handleSend = async (textArg) => {
    const q = (typeof textArg === "string" ? textArg : input).trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");

    // Attempt backend
    const data = await sendToBackend(q);
    if (data && (data.text || (data.suggestions && data.suggestions.length))) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.text || `I found ${data.suggestions?.length ?? 0} items.`,
          suggestions: data.suggestions ?? [],
        },
      ]);
      return;
    }

    // Local fallback
    const matches = localSearch(q);
    if (!matches.length) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "I couldn't find matching items. Try different keywords, a category, or a price filter like 'under 200'.",
        },
      ]);
      return;
    }

    setMessages((m) => [
      ...m,
      {
        role: "bot",
        text: `I found ${matches.length} ${matches.length > 1 ? "items" : "item"}. Tap one to view details.`,
        suggestions: matches,
      },
    ]);
  };

  const goToItem = (id) => {
    setOpen(false);
    router.push(`/customer/getShops/${shopId}/item/${id}`);
  };

  const quickPrompts = useMemo(() => {
    const base = ["popular", "under 200", "under 500", "deals"];
    const catPicks = categories.slice(0, 4);
    return [...base, ...catPicks];
  }, [categories]);

  // UI helpers
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // focus input when opened
    setTimeout(() => {
      inputRef.current?.focus();
    }, 160);
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, loading]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd+K toggles the widget for quick access
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Enter" && (document.activeElement === inputRef.current)) {
        // handled by onKeyDown on input as well, but keep as safety
        handleSend();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [input, messages]);

  // For accessibility: trap focus when open (simple)
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onFocus = (e) => {
      const container = document.getElementById("gathr-chatbot");
      if (!container) return;
      if (!container.contains(e.target)) {
        e.stopPropagation();
        container.focus();
      }
    };
    document.addEventListener("focus", onFocus, true);
    return () => {
      document.removeEventListener("focus", onFocus, true);
      prev?.focus?.();
    };
  }, [open]);

  // small UI components
  const BotBubble = ({ text }) => (
    <div className="inline-block max-w-[85%] bg-slate-800 dark:bg-neutral-800 text-neutral-100 dark:text-neutral-100 rounded-2xl px-4 py-2 border border-slate-700 break-words overflow-hidden">
      {text}
    </div>
  );
  const UserBubble = ({ text }) => (
    <div className="inline-block max-w-[85%] bg-[var(--primary)] text-[var(--primary-foreground)] rounded-2xl px-4 py-2 border border-[var(--primary)] break-words overflow-hidden">
      {text}
    </div>
  );

  // render product suggestion card
  const ProductCard = ({ s }) => (
    <button
      onClick={() => goToItem(s.id)}
      className="w-full flex items-center gap-3 p-2 rounded-lg border border-slate-700 hover:shadow-md transition-shadow duration-150 bg-[color:var(--card)] overflow-hidden"
      aria-label={`Open ${s.name}`}
    >
      <img src={s.image} alt={s.name} className="w-14 h-14 rounded-md object-cover flex-shrink-0" />
      <div className="min-w-0 text-left overflow-hidden">
        <div className="text-sm font-medium truncate">{s.name}</div>
        {/* Description intentionally hidden per request */}
        <div className="mt-1 flex items-center gap-2">
          <div className="text-sm font-semibold">₹{s.price}</div>
          {s.rating ? (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <Star size={12} />
              <span>{s.rating}</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="ml-auto">
        <ShoppingCart size={18} />
      </div>
    </button>
  );

  // widget
  const widget = (
    <div
      id="gathr-chatbot"
      className="fixed z-[9999] bottom-6 right-6 pointer-events-none"
      aria-hidden={!open}
    >
      {/* Launcher */}
      <div className="flex flex-col items-end pointer-events-auto">
        <motion.button
          ref={launcherRef}
          aria-expanded={open}
          aria-label={open ? "Close assistant" : "Open assistant"}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ring)] transition transform"
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence initial={false}>
            {!open ? (
              <motion.img
                key="open"
                src="/AI.png"
                alt="assistant"
                className="w-6 h-6"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
              />
            ) : (
              <motion.div
                key="close"
                initial={{ opacity: 0, rotate: 10 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: -10 }}
                className="text-lg font-bold"
              >
                <X size={18} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mt-3 w-[92vw] sm:w-96 max-h-[75vh] bg-white dark:bg-[#0b1220] rounded-xl border border-slate-700 shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Shop assistant"
            >
              {/* header */}
              <div
  className="
    px-4 py-3 flex items-center justify-between
    bg-gradient-to-r from-[var(--muted)] to-[var(--background)]
    border-b border-[var(--border)]
  "
>
  <div>
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-md bg-[var(--primary)]/10">
            <MessageSquare size={16} />
      </div>
      <h2 className="text-[var(--foreground)] font-semibold text-sm sm:text-base">
        Shop Assistant
      </h2>
    </div>
    <p className="text-xs text-[var(--muted-foreground)] mt-1">
      Find items, categories, deals, and recommendations
    </p>
  </div>

  <div className="flex items-center gap-2">
    <button className="text-xs px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] transition">
      ⚡ Smart
    </button>
    <button className="text-xs px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] transition">
      🕒 Fast
    </button>
  </div>
</div>


              {/* quick prompts */}
              <div className="px-3 py-2 border-b border-slate-700 bg-[var(--card)]">
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((p, i) => (
                    <button
                      key={p + i}
                      onClick={() => {
                        setInput(p);
                        setTimeout(() => {
                          inputRef.current?.focus();
                        }, 50);
                      }}
                      className="text-xs px-3 py-1 rounded-full border border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900/60 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-[var(--card)]">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%]">
                      {m.role === "user" ? <UserBubble text={m.text} /> : <BotBubble text={m.text} />}

                      {m.suggestions && Array.isArray(m.suggestions) && (
                        <div className="mt-2 grid gap-2 overflow-hidden">
                          {m.suggestions.map((s) => (
                            <ProductCard key={s.id} s={s} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <div className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
                    Thinking...
                  </div>
                )}
              </div>

              {/* input */}
              <div className="px-3 py-3 border-t border-slate-700 bg-[var(--card)]">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    placeholder="Search items, categories or price filters (e.g. 'under 200')"
                    className="flex-1 px-3 py-2 rounded-lg bg-transparent border border-slate-700 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    aria-label="Ask the shop assistant"
                  />
                  <button
                    onClick={() => handleSend()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-95 transition disabled:opacity-60"
                    disabled={loading}
                    aria-label="Send message"
                  >
                    <Send size={16} />
                    <span className="hidden sm:inline text-sm">Send</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(widget, document.body);
}
