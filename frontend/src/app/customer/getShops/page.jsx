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
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    async function fetchLocation() {
      try {
        if (!("geolocation" in navigator)) return;

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, long: longitude };

        localStorage.setItem("userLocation", JSON.stringify(loc));
        setLocation(loc);
      } catch (err) {
        console.error("Error getting location:", err);
      }
    }

    fetchLocation();

    const get_shops = async () => {
      try {
        const token = await getToken();
        const result = await axios.post(
          `${API_URL}/api/customer/getShops`,
          { lat: location.lat, long: location.long },
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );

        const shopList = result.data.shops || [];
        setShops(shopList);

        const allCategories = new Set();
        shopList.forEach((shop) => shop.category?.forEach((cat) => allCategories.add(cat)));
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error("Error fetching shops:", err);
      }
    };
    get_shops();
  }, [isLoaded, isSignedIn, user]);

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
      </div>

      <div className="max-w-7xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8" role="list" aria-label="Shops">
          <AnimatePresence>
            {filteredShops.length > 0 ? (
              filteredShops.map((shop, idx) => (
                <motion.div
                  key={shop.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  whileHover="hover"
                  delay={idx * 0.1}
                  className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)] hover:bg-[var(--muted)]/40 dark:hover:bg-[var(--muted)]/20 transition-colors duration-200"
                >
                  <Link href={`/customer/getShops/${shop.id}`} className="block">
                    {/* Card wrapper */}
                    <motion.div whileTap={{ scale: 0.99 }} className="rounded-2xl overflow-hidden shadow-md transition">
                      {/* Top image area (large visual) */}
                      <div className="h-44 md:h-48 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                        <img
                          src={shop.image?.url || "/placeholder.png"}
                          alt={shop.shop_name}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>

                      {/* Bottom info area */}
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

                          {/* categories / tags */}
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

                          {/* small stat row (uses your real data where available) */}
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* avatars placeholder - show up to 4 images if available in shop.membersImages */}
                              <div className="flex -space-x-2">
                                {/* If you have images array on shop, it could be used. Here we keep it minimal and only show nothing if not present */}
                                {/* Example small avatars area retained for visual parity with EmviUI */}
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

                            {/* small CTA-like text button */}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center text-[var(--muted-foreground)] mt-8">
                No shops found.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

    </div>
  );
}
