"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ChatbotWidget from "../../../../components/ChatbotWidget.jsx";
 
import { Heart, Plus, Minus } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ShopItems() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
 
  const { shop_id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [items, setItems] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [isWlLoading, setIsWlLoading] = useState(false);
  const [quantities, setQuantities] = useState({});
  // Filter states
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "All",
    priceRange: [0, 10000],
    inStock: false,
    sortBy: "featured",
    rating: 0
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Get unique values for filters
  const priceMin = 0;
  const priceMax = Math.max(...items.map(item => item.price || 0), 1000);
  const ratings = [4, 3, 2, 1];
  const sortOptions = [
    { value: "featured", label: "Featured" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A to Z" },
    { value: "name-desc", label: "Name: Z to A" },
    { value: "newest", label: "Newest First" }
  ];

  // --- Fetch items ---
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchItems = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/api/customer/getShopItem/${shop_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Add mock data for demonstration
        const fetchedItems = (res.data.items || []).map(item => ({
          ...item,
          rating: Math.floor(Math.random() * 5) + 1, // Mock rating 1-5
          stock: Math.floor(Math.random() * 100), // Mock stock
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() // Mock creation date
        }));
        
        setItems(fetchedItems);

        // Extract unique categories
        const allCategories = new Set(fetchedItems.flatMap((item) => item.category || []));
        setCategories(Array.from(allCategories).sort());

        // Set initial price range
        if (fetchedItems.length > 0) {
          const maxPrice = Math.ceil(Math.max(...fetchedItems.map(item => item.price || 0)) / 500) * 500; // Round up to nearest 500
          setFilters(prev => ({
            ...prev,
            priceRange: [0, Math.max(maxPrice, 1000)] // Ensure at least 1000 max price
          }));
        }
      } catch (err) {
        console.error('Error fetching items:', err);
      }
    };

    fetchItems();
  }, [user, isLoaded, isSignedIn, getToken, shop_id]);

  useEffect(() => {
    const loadWishlist = async () => {
      if (!isSignedIn || !user?.id) return;
      setIsWlLoading(true);
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/customer/wishlist/list`,
          { clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ids = new Set((res?.data?.items || []).map((it) => it.id));
        setWishlistIds(ids);
      } catch (_) {
        setWishlistIds(new Set());
      } finally {
        setIsWlLoading(false);
      }
    };
    loadWishlist();
  }, [isSignedIn, user?.id, getToken, API_URL]);

  // --- Filter items ---
  const filteredItems = items
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filters.category === "All" || item.category?.includes(filters.category);
      const matchesPrice = item.price >= filters.priceRange[0] && item.price <= filters.priceRange[1];
      const matchesStock = !filters.inStock || item.stock > 0;
      const matchesRating = item.rating >= filters.rating;
      
      return matchesSearch && matchesCategory && matchesPrice && matchesStock && matchesRating;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return 0; // featured - keep original order
      }
    });

  // --- Animations ---
  const gridVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
        when: "beforeChildren"
      } 
    },
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.98
    },
    show: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 100, 
        damping: 15,
        mass: 0.5
      } 
    },
    hover: { 
      y: -4,
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transition: { 
        duration: 0.2, 
        ease: [0.4, 0, 0.2, 1] 
      } 
    },
    tap: {
      scale: 0.98
    }
  };

  const toggleWishlist = async (itemId) => {
    if (!user?.id) return;
    const inWl = wishlistIds.has(itemId);
    try {
      const token = await getToken();
      if (inWl) {
        await axios.post(
          `${API_URL}/api/customer/wishlist/remove`,
          { clerkId: user.id, itemId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const next = new Set(wishlistIds);
        next.delete(itemId);
        setWishlistIds(next);
        window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { delta: -1 } }));
      } else {
        await axios.post(
          `${API_URL}/api/customer/wishlist/add`,
          { clerkId: user.id, itemId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const next = new Set(wishlistIds);
        next.add(itemId);
        setWishlistIds(next);
        window.dispatchEvent(new CustomEvent('wishlist:changed', { detail: { delta: 1 } }));
      }
    } catch (err) {
      console.error('Wishlist toggle failed', err);
      toast.error('Failed to update wishlist');
    }
  };

  const getQty = (id) => quantities[id] || 1;
  const incQty = (id) => setQuantities((prev) => ({ ...prev, [id]: Math.min((prev[id] || 1) + 1, 99) }));
  const decQty = (id) => setQuantities((prev) => ({ ...prev, [id]: Math.max((prev[id] || 1) - 1, 1) }));

  const addToCartQuick = async (itemId) => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      return;
    }
    const quantity = getQty(itemId);
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addToCart`,
        { itemId, quantity, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res?.data?.message === "Not enough stock available") {
        toast.error("Not enough stock available");
      } else {
        toast.success("Added to cart");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to add to cart";
      toast.error(msg);
    }
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
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col gap-6">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items by name or description..."
              className="w-full px-5 py-3 pl-12 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 rounded-full transition-all duration-200"
            />
            <svg className="w-5 h-5 text-[var(--muted-foreground)] absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
                {Object.values(filters).some(val => 
                  (Array.isArray(val) && (val[0] > priceMin || val[1] < priceMax)) || 
                  (typeof val === 'string' && val !== 'All' && val !== 'featured') ||
                  (typeof val === 'number' && val > 0) ||
                  (typeof val === 'boolean' && val)
                ) && (
                  <span className="w-2 h-2 bg-[var(--primary)] rounded-full"></span>
                )}
              </button>
              <span className="text-sm text-[var(--muted-foreground)]">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
              </span>
            </div>

            <div className="w-full sm:w-48">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="w-full px-4 py-2 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-lg overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="font-medium mb-3 text-[var(--foreground)]">Category</h3>
                  <div className="space-y-2">
                    {['All', ...categories].map((category) => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={filters.category === category}
                          onChange={() => setFilters({...filters, category})}
                          className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)]"
                        />
                        <span className="text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <h3 className="font-medium mb-3 text-[var(--foreground)]">
                    Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
                  </h3>
                  <div className="px-2">
                    <input
                      type="range"
                      min={priceMin}
                      max={priceMax}
                      value={filters.priceRange[1]}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: [filters.priceRange[0], parseInt(e.target.value)]
                      })}
                      className="w-full h-2 bg-[var(--muted)] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                      <span>₹{priceMin}</span>
                      <span>₹{priceMax}+</span>
                    </div>
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <h3 className="font-medium mb-3 text-[var(--foreground)]">Rating</h3>
                  <div className="space-y-2">
                    {[0, ...ratings].map((rating) => (
                      <div key={rating} className="flex items-center">
                        <input
                          type="radio"
                          id={`rating-${rating}`}
                          name="rating"
                          checked={filters.rating === rating}
                          onChange={() => setFilters({...filters, rating})}
                          className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)]"
                        />
                        <label htmlFor={`rating-${rating}`} className="ml-2 flex items-center cursor-pointer">
                          {rating === 0 ? (
                            <span className="text-sm">All Ratings</span>
                          ) : (
                            <>
                              {[...Array(5)].map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="ml-1 text-xs text-[var(--muted-foreground)]">& Up</span>
                            </>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stock Status */}
                <div>
                  <h3 className="font-medium mb-3 text-[var(--foreground)]">Stock Status</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="inStock"
                      checked={filters.inStock}
                      onChange={(e) => setFilters({...filters, inStock: e.target.checked})}
                      className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)] rounded"
                    />
                    <label htmlFor="inStock" className="text-sm cursor-pointer">In Stock Only</label>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setFilters({
                    category: "All",
                    priceRange: [priceMin, priceMax],
                    inStock: false,
                    sortBy: "featured",
                    rating: 0
                  })}
                  className="px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-full hover:bg-[var(--primary)]/90 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-[var(--foreground)]">No items found</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Try adjusting your search or filter to find what you're looking for.</p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setSearch('');
                  setFilters({
                    category: "All",
                    priceRange: [priceMin, priceMax],
                    inStock: false,
                    sortBy: "featured",
                    rating: 0
                  });
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]"
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-xl shadow-md overflow-hidden border border-[var(--border)] hover:bg-[var(--muted)]/40 dark:hover:bg-[var(--muted)]/20 transition-colors duration-200"
                >
                  <div className="block">
                    <motion.div whileTap={{ scale: 0.99 }} className="overflow-hidden shadow-md transition">
                      <div className="relative h-44 md:h-48 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                        <Link href={`/customer/getShops/${shop_id}/item/${item.id}`} className="absolute inset-0 block" />
                        <img
                          src={item.images?.[0]?.url || "/placeholder.png"}
                          alt={item.name}
                          className="w-full h-full object-cover object-center"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(item.id); }}
                          className="absolute top-2 right-2 p-2 rounded-full bg-[var(--card)]/80 border border-[var(--border)] hover:bg-[var(--muted)]/70"
                          aria-pressed={wishlistIds.has(item.id)}
                        >
                          <Heart className={wishlistIds.has(item.id) ? "text-red-500" : "text-[var(--foreground)]"} fill={wishlistIds.has(item.id) ? "currentColor" : "none"} size={18} />
                        </button>
                      </div>

                      <div className="bg-[var(--card)] p-4 md:p-5">
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

                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => decQty(item.id)}
                              aria-label="Decrease quantity"
                              className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/60"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="min-w-10 px-2 h-9 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-semibold">
                              {getQty(item.id)}
                            </div>
                            <button
                              type="button"
                              onClick={() => incQty(item.id)}
                              aria-label="Increase quantity"
                              className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/60"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCartQuick(item.id)}
                            className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full text-center text-[var(--muted-foreground)] mt-8">
                No items found.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
        )}
      </div>

      {/* Chatbot Widget */}
      <ChatbotWidget items={items} shopId={shop_id} />
    </div>
  );
}
