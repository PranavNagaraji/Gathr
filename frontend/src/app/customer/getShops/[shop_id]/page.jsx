"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ChatbotWidget from "../../../../components/ChatbotWidget.jsx";

export default function ShopItems() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { shop_id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState([]);
  const [focused, setFocused] = useState(false);
  const [focused2, setFocused2] = useState(false);

  // --- Fetch items ---
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchItems = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/api/customer/getShopItem/${shop_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const fetchedItems = res.data.items || [];
        setItems(fetchedItems);

        const allCategories = new Set(fetchedItems.flatMap((item) => item.category || []));
        setCategories(["All", ...Array.from(allCategories)]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchItems();
  }, [user, isLoaded, isSignedIn, getToken, shop_id]);

  // --- Filter items ---
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // --- Animations ---
  const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 12 } },
    hover: { scale: 1.05, transition: { duration: 0.3 } },
  };

  return (
  <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20 relative">
      {/* Header */}
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl leading-tight tracking-tight text-[var(--foreground)]">
          Items in This Shop
        </h1>
        <p className="mt-4 text-[var(--muted-foreground)] text-base sm:text-lg max-w-2xl mx-auto">
          Browse and find the perfect items from this store.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="flex flex-col sm:flex-row gap-8 items-center justify-center">
          <div className="flex-1 w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full px-5 py-3 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/30 transition-transform duration-300 rounded-lg"
              style={{ transform: focused ? "scale(1.05)" : "scale(1)" }}
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              onFocus={() => setFocused2(true)}
              onBlur={() => setFocused2(false)}
              className="w-full px-4 py-3 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/30 transition-transform duration-300 rounded-lg"
              style={{ transform: focused2 ? "scale(1.05)" : "scale(1)" }}
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat} className="hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto">
        <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredItems.length > 0 ? (
              filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  whileHover="hover"
                  delay={idx * 0.1}
                  className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-xl shadow-md overflow-hidden border border-[var(--border)]"
                >
                  <Link href={`/customer/getShops/${shop_id}/item/${item.id}`} className="block">
                    <motion.div whileTap={{ scale: 0.99 }} className="overflow-hidden shadow-md hover:shadow-lg transition">
                      <div className="h-44 md:h-48 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                        <img
                          src={item.images?.[0]?.url || "/placeholder.png"}
                          alt={item.name}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>

                      <div className="bg-[var(--card)] p-4 md:p-5 hover:bg-[var(--muted)]/30 transition-colors duration-500">
                      <div className="flex justify-between mb-2">
                        <h3 className="text-[var(--card-foreground)] text-lg md:text-xl font-semibold truncate">{item.name}</h3>
                        <p className="text-md font-bold text-[var(--primary)] mt-1">₹{item.price}</p>
                      </div>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">{item.description}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.category?.map((cat, i) => (
                            <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center text-[var(--muted-foreground)] mt-8">
                No items found.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget items={items} shopId={shop_id} />
    </div>
  );
}
