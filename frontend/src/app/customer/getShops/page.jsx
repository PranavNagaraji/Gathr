"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerDashboard() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [recs, setRecs] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [showRecs, setShowRecs] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [catOpen, setCatOpen] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(false);

  // Global item search states
  const [itemQuery, setItemQuery] = useState("");
  const [itemLoading, setItemLoading] = useState(false);
  const [itemResults, setItemResults] = useState([]);
  const [itemPage, setItemPage] = useState(1);
  const [itemTotalPages, setItemTotalPages] = useState(1);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    async function fetchLocation() {
      try {
        if (!("geolocation" in navigator)) return;

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;
        const loc = { latitude, longitude };

        localStorage.setItem("userLocation", JSON.stringify(loc));
        setLocation(loc);
      } catch (err) {
        console.error("Error getting location:", err);
      }
    }

    fetchLocation();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!location) return; // Only fetch shops once location is available

    const get_shops = async () => {
      try {
        setShopsLoading(true);
        const token = await getToken();
        const result = await axios.post(
          `${API_URL}/api/customer/getShops`,
          { lat: location.latitude, long: location.longitude },
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );

        const shopList = result.data.shops || [];
        setShops(shopList);

        const allCategories = new Set();
        shopList.forEach((shop) => shop.category?.forEach((cat) => allCategories.add(cat)));
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error("Error fetching shops:", err);
      } finally {
        setShopsLoading(false);
      }
    };

    get_shops();
  }, [location, getToken, API_URL]);

  // Global item search effect (debounced)
  useEffect(() => {
    if (!location) return;
    if (!itemQuery.trim()) {
      setItemResults([]);
      setItemPage(1);
      setItemTotalPages(1);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setItemLoading(true);
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/customer/searchLocalItems`,
          {
            lat: location.latitude,
            long: location.longitude,
            q: itemQuery,
            page: itemPage,
            limit: 12,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!cancelled) {
          setItemResults(res?.data?.items || []);
          setItemTotalPages(res?.data?.totalPages || 1);
        }
      } catch (e) {
        if (!cancelled) {
          setItemResults([]);
          setItemTotalPages(1);
        }
      } finally {
        if (!cancelled) setItemLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [itemQuery, itemPage, location, API_URL, getToken]);

  // Fetch personalized item recommendations
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    const fetchRecs = async () => {
      try {
        setRecLoading(true);
        const token = await getToken();
        // include location if available
        const qs = new URLSearchParams({ limit: '12' });
        const loc = location || (() => {
          try { return JSON.parse(localStorage.getItem('userLocation') || 'null'); } catch { return null; }
        })();
        if (loc?.latitude && loc?.longitude) {
          qs.set('lat', String(loc.latitude));
          qs.set('long', String(loc.longitude));
        }
        const res = await axios.get(`${API_URL}/api/customer/recommendations/${user.id}?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecs(res?.data?.recommendations || []);
      } catch (e) {
        // silent fail
      } finally {
        setRecLoading(false);
      }
    };
    fetchRecs();
  }, [isLoaded, isSignedIn, user?.id, API_URL, getToken, location]);

  const filteredShops = shops.filter((shop) => {
    const matchesSearch = shop.shop_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || shop.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // --- ANIMATION VARIANTS ---
  const shapesVariants = {
    float1: {
      y: [0, -10, 0],
      rotate: [0, 6, 0],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" },
    },
    float2: {
      y: [0, -8, 0],
      rotate: [0, -8, 0],
      transition: { duration: 5.2, repeat: Infinity, ease: "easeInOut" },
    },
    float3: {
      y: [0, -6, 0],
      rotate: [0, 5, 0],
      transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 12,
      },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  };

  const buttonTap = { scale: 0.97 };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20 relative">
      {/* Header */}
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl leading-tight tracking-tight text-[var(--foreground)]">
          Explore Shops Near You
        </h1>
        <p className="mt-4 text-[var(--muted-foreground)] text-base sm:text-lg max-w-2xl mx-auto">
          Discover and support authentic local merchants — curated for your neighbourhood.
        </p>
      </div>

      {/* Floating Button to open Recommendations */}
      <button
        type="button"
        onClick={() => setShowRecs(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full shadow-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
      >
        Show Recommendations
      </button>

      {/* Recommendations Overlay */}
      {showRecs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRecs(false)} />
          <div className="relative w-full sm:max-w-6xl max-h-[85vh] overflow-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold">Recommended for you</h2>
              <button
                type="button"
                onClick={() => setShowRecs(false)}
                className="px-3 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]/50"
              >
                Close
              </button>
            </div>
            {recLoading && (
              <p className="text-sm text-[var(--muted-foreground)] mb-3">Loading…</p>
            )}
            {recs?.length ? (
              <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {recs.map((it) => (
                  <motion.div key={it.id} variants={cardVariants} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                    <Link href={`/customer/getShops/${it.shop_id}/item/${it.id}`} className="block">
                      <div className="aspect-[4/3] bg-[var(--muted)]">
                        <img src={it.images?.[0]?.url || "/placeholder.png"} alt={it.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4">
                        <div className="mt-1 flex flex-wrap gap-2 min-h-[28px]">
                          {Array.isArray(it.category) ? (
                            it.category.map((cat, i) => (
                              <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
                            ))
                          ) : (
                            it.category ? (
                              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{it.category}</span>
                            ) : null
                          )}
                        </div>
                        <h3 className="font-bold text-lg mt-2 truncate">{it.name}</h3>
                        <p className="text-2xl font-bold text-[var(--primary)] mt-1">₹{it.price}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-[var(--muted-foreground)]">No recommendations yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex flex-col sm:flex-row gap-8 items-center justify-center">
          <div className="flex-1 w-full">
            <label className="sr-only">Search shops</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shops, eg. bakery, bookstore..."
                className="w-full px-5 py-3 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/30 rounded-lg"
              />
              <svg className="w-5 h-5 text-[var(--muted-foreground)] absolute right-4 top-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            </div>
          </div>

          <div className="w-full sm:w-64 relative">
            <button
              type="button"
              onClick={() => setCatOpen((o) => !o)}
              className="w-full px-4 py-3 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm rounded-lg flex items-center justify-between"
              aria-haspopup="listbox"
              aria-expanded={catOpen}
            >
              <span className="truncate">{selectedCategory}</span>
              <svg className={`w-4 h-4 transition-transform ${catOpen ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" /></svg>
            </button>
            {catOpen && (
              <ul role="listbox" className="absolute z-30 mt-2 w-full max-h-60 overflow-auto bg-[var(--popover)] text-[var(--popover-foreground)] border border-[var(--border)] rounded-lg shadow-lg">
                {categories.map((cat, idx) => (
                  <li
                    key={idx}
                    role="option"
                    aria-selected={selectedCategory === cat}
                    onClick={() => { setSelectedCategory(cat); setCatOpen(false); }}
                    className={`px-4 py-2 cursor-pointer hover:bg-[var(--accent)]/40 ${selectedCategory === cat ? "bg-[var(--accent)]/30" : ""}`}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* Global Item Search */}
        <div className="mt-6">
          <label className="sr-only">Search items nearby</label>
          <div className="relative">
            <input
              type="text"
              value={itemQuery}
              onChange={(e) => { setItemQuery(e.target.value); setItemPage(1); }}
              placeholder="Search items across nearby shops (e.g., bread, onions, shampoo)"
              className="w-full px-5 py-3 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/30 rounded-lg"
            />
            <svg className="w-5 h-5 text-[var(--muted-foreground)] absolute right-4 top-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Global Item Search Results */}
      {itemQuery.trim() && (
        <div className="max-w-7xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Items near you</h2>
            {itemTotalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                  disabled={itemPage <= 1 || itemLoading}
                  className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] disabled:opacity-50"
                >Prev</button>
                <span className="text-sm text-[var(--muted-foreground)]">Page {itemPage} of {itemTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setItemPage((p) => Math.min(itemTotalPages, p + 1))}
                  disabled={itemPage >= itemTotalPages || itemLoading}
                  className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] disabled:opacity-50"
                >Next</button>
              </div>
            )}
          </div>

          {itemLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-[var(--muted)]" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 w-2/3 bg-[var(--muted)] rounded" />
                    <div className="h-4 w-1/2 bg-[var(--muted)] rounded" />
                    <div className="h-7 w-1/3 bg-[var(--muted)] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : itemResults.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No items found nearby for "{itemQuery}".</p>
          ) : (
            <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {itemResults.map((it) => (
                <motion.div key={it.id} variants={cardVariants} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                  <Link href={`/customer/getShops/${it.shop_id}/item/${it.id}`} className="block">
                    <div className="aspect-[4/3] bg-[var(--muted)]">
                      <img src={it.images?.[0]?.url || "/placeholder.png"} alt={it.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4">
                      <div className="mt-1 flex flex-wrap gap-2 min-h-[28px]">
                        {Array.isArray(it.category) && it.category.slice(0, 2).map((cat, i) => (
                          <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
                        ))}
                      </div>
                      <h3 className="font-bold text-lg mt-2 truncate">{it.name}</h3>
                      <p className="text-2xl font-bold text-[var(--primary)] mt-1">₹{it.price}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {shopsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)] animate-pulse">
                <div className="h-44 md:h-48 bg-[var(--muted)]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-2/3 bg-[var(--muted)] rounded" />
                  <div className="h-4 w-1/2 bg-[var(--muted)] rounded" />
                  <div className="h-6 w-1/3 bg-[var(--muted)] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-2xl p-10 bg-[var(--card)]/40">
            <div className="w-24 h-24 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-[var(--muted-foreground)]">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h3l.4 2M7 13h10l2-8H6.4M7 13l-1.293 1.293A1 1 0 006 15h2m-1-2v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">No shops nearby</h2>
            <p className="mt-2 text-[var(--muted-foreground)] max-w-md">We couldn't find shops based on your current filters or location. Try adjusting filters or check again later.</p>
            <a href="/customer/getShops" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold hover:opacity-90">
              Refresh
            </a>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8" role="list" aria-label="Shops">
            <AnimatePresence>
              {filteredShops.map((shop, idx) => (
                <motion.div
                  key={shop.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  whileHover="hover"
                  delay={idx * 0.1}
                  className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)] hover:bg-[var(--muted)]/40 dark:hover:bg-[var(--muted)]/20 transition-colors duration-200"
                >
                  {/* Info icon top-right */}
                  <Link href={`/customer/getShops/${shop.id}/about`} aria-label="Shop details" className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--card)]/80 border border-[var(--border)] hover:bg-[var(--muted)]/60">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8h.01" />
                      <path d="M11 12h1v4h1" />
                    </svg>
                  </Link>

                  <Link href={`/customer/getShops/${shop.id}`} className="block">
                    <motion.div whileTap={{ scale: 0.99 }} className="rounded-2xl overflow-hidden shadow-md transition">
                      <div className="h-44 md:h-48 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                        <img
                          src={shop.image?.url || "/placeholder.png"}
                          alt={shop.shop_name}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>

                      <div className="bg-[var(--card)] p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[var(--card-foreground)] text-lg md:text-xl font-semibold truncate">
                              {shop.shop_name}
                            </h3>
                            <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">
                              {shop.address}
                            </p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {shop.category?.map((category, i) => {
                              const l = (category || "").toLowerCase();
                              const isHighlight = l.includes("popular") || l.includes("featured") || l.includes("best");
                              return (
                                <span
                                  key={i}
                                  className={`text-xs font-semibold px-3 py-1 rounded-full ${isHighlight ? "bg-[color-mix(in_oklab,var(--success),white_85%)] text-[var(--success)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
                                >
                                  {category}
                                </span>
                              );
                            })}
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                {Array.from({ length: Math.min(3, shop.memberAvatars?.length || 0) }).map((_, aIdx) => (
                                  <img
                                    key={aIdx}
                                    src={shop.memberAvatars[aIdx]}
                                    alt="member"
                                    className="w-7 h-7 rounded-full border-2 border-[var(--card)]"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
