"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";

export default function WishlistPage() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  // Load wishlist and hydrate with item details
  useEffect(() => {
    const loadWishlist = async () => {
      if (!isSignedIn || !user?.id) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/customer/wishlist/list`,
          { clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setItems((res?.data?.items || []).filter(Boolean));
      } catch (e) {
        console.error("Failed to load wishlist", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [isSignedIn, user?.id, API_URL, getToken]);

  const removeFromWishlist = async (itemId) => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/api/customer/wishlist/remove`,
        { clerkId: user.id, itemId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      window.dispatchEvent(new CustomEvent("wishlist:changed", { detail: { delta: -1 } }));
      toast.success("Removed from wishlist");
    } catch (e) {
      console.error("Failed to remove from wishlist", e);
      toast.error("Failed to remove");
    }
  };

  const addToCart = async (itemId) => {
    if (!user) {
      toast.error("Please sign in to add items to cart");
      return;
    }
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/customer/addToCart`,
        { itemId, quantity: 1, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res?.data?.message === "Not enough stock available") {
        toast.error("Not enough stock available");
      } else {
        toast.success("Added to cart");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to add to cart";
      toast.error(msg);
    }
  };

  const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const cardVariants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/customer/getShops">
              <button className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="font-extrabold text-4xl sm:text-5xl tracking-tight">Your Wishlist</h1>
              <p className="mt-2 text-[var(--muted-foreground)]">Save items you love and add them to cart anytime.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="h-48 bg-[var(--muted)]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 w-2/3 bg-[var(--muted)] rounded" />
                  <div className="h-4 w-1/2 bg-[var(--muted)] rounded" />
                  <div className="h-8 w-full bg-[var(--muted)] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="mx-auto h-16 w-16 text-[var(--muted-foreground)] mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Your wishlist is empty</h3>
            <p className="text-[var(--muted-foreground)] mb-8">Browse shops and add items to your wishlist by clicking the heart icon.</p>
            <Link href="/customer/getShops">
              <button className="px-6 py-3 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity font-semibold">
                Explore Shops
              </button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-[var(--muted-foreground)]">
                {items.length} {items.length === 1 ? 'item' : 'items'} in your wishlist
              </p>
            </div>
            
            <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div 
                    key={item.id} 
                    variants={cardVariants}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Link href={`/customer/getShops/${item.shop_id}/item/${item.id}`}>
                      <div className="h-48 bg-[var(--muted)] overflow-hidden">
                        <img 
                          src={item.images?.[0]?.url || "/placeholder.png"} 
                          alt={item.name} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                    </Link>
                    
                    <div className="p-4">
                      <div className="mb-3">
                        <Link href={`/customer/getShops/${item.shop_id}/item/${item.id}`}>
                          <h3 className="text-lg font-semibold hover:text-[var(--primary)] transition-colors line-clamp-1">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xl font-bold text-[var(--primary)]">
                            ₹{item.price}
                          </span>
                          {item.category && item.category.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                              {item.category[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => addToCart(item.id)} 
                          className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium"
                        >
                          <ShoppingCart size={16} /> 
                          Add to Cart
                        </button>
                        <button 
                          onClick={() => removeFromWishlist(item.id)} 
                          className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/60 transition-colors flex items-center gap-1 text-red-500"
                          title="Remove from wishlist"
                        >
                          <Heart size={16} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}