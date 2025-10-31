"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerDashboard() {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  const [recs, setRecs] = useState([]);
  const [recLoading, setRecLoading] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Get geolocation (and cache in localStorage for continuity)
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
      } catch (e) {
        try {
          const cached = JSON.parse(localStorage.getItem("userLocation") || "null");
          if (cached) setLocation(cached);
        } catch {}
      }
    }
    fetchLocation();
  }, [isLoaded, isSignedIn, user]);

  // Fetch nearby shops (limited)
  useEffect(() => {
    if (!location) return;
    let ignore = false;
    (async () => {
      try {
        setShopsLoading(true);
        const token = await getToken();
        const result = await axios.post(
          `${API_URL}/api/customer/getShops`,
          { lat: location.latitude, long: location.longitude },
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        if (!ignore) setShops(result.data.shops || []);
      } catch {
        if (!ignore) setShops([]);
      } finally {
        if (!ignore) setShopsLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [location, API_URL, getToken]);

  // Fetch personalized recommendations (hot items)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    let ignore = false;
    (async () => {
      try {
        setRecLoading(true);
        const token = await getToken();
        const loc = location || (() => {
          try { return JSON.parse(localStorage.getItem("userLocation") || "null"); } catch { return null; }
        })();
        const qs = new URLSearchParams({ limit: "12" });
        if (loc?.latitude && loc?.longitude) {
          qs.set("lat", String(loc.latitude));
          qs.set("long", String(loc.longitude));
        }
        const res = await axios.get(`${API_URL}/api/customer/recommendations/${user.id}?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ignore) setRecs(res?.data?.recommendations || []);
      } catch {
        if (!ignore) setRecs([]);
      } finally {
        if (!ignore) setRecLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [isLoaded, isSignedIn, user?.id, API_URL, getToken, location]);

  // Fetch recent orders (small snapshot)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    let ignore = false;
    (async () => {
      try {
        setOrdersLoading(true);
        const token = await getToken();
        const res = await axios.get(`${API_URL}/api/customer/getcarthistory/${user.id}?page=1&limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!ignore) setOrders(res.data.carts || []);
      } catch {
        if (!ignore) setOrders([]);
      } finally {
        if (!ignore) setOrdersLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [isLoaded, isSignedIn, user, API_URL, getToken]);

  // Fetch counts for quick actions
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    let ignore = false;
    (async () => {
      try {
        const token = await getToken();
        const API = API_URL;
        const [cartRes, wishRes] = await Promise.all([
          axios.post(`${API}/api/customer/getCart`, { clerkId: user.id }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }),
          axios.post(`${API}/api/customer/wishlist/count`, { clerkId: user.id }, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!ignore) setCartCount(cartRes?.data?.cartItems?.length || 0);
        if (!ignore) setWishlistCount(wishRes?.data?.count || 0);
      } catch {
        if (!ignore) { setCartCount(0); setWishlistCount(0); }
      }
    })();
    return () => { ignore = true; };
  }, [isLoaded, isSignedIn, user, getToken, API_URL]);

  const name = useMemo(() => user?.firstName || user?.fullName || user?.username || "There", [user]);

  const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    hover: { y: -2, transition: { duration: 0.15 } },
  };

  const formatOrderId = (id) => {
    const s = String(id || "");
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Hi {name},</h1>
            <p className="text-[var(--muted-foreground)] mt-1">Here’s what’s happening nearby</p>
          </div>
          <div className="flex gap-2">
            <Link href="/customer/getShops" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold hover:opacity-90">Browse Shops</Link>
            <Link href="/customer/cart" className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] font-semibold hover:bg-[var(--muted)]/40">View Cart</Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/customer/orders" className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--muted)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">Orders</span>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">Recent</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{orders.length || 0}</div>
        </Link>
        <Link href="/customer/wishlist" className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--muted)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">Wishlist</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{wishlistCount}</div>
        </Link>
        <Link href="/customer/cart" className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--muted)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">Cart</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{cartCount}</div>
        </Link>
        <Link href="/customer/profile" className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:bg-[var(--muted)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">Profile</span>
          </div>
          <div className="mt-2 text-2xl font-bold">→</div>
        </Link>
      </div>

      {/* Hot Items (Recommendations) */}
      <div className="max-w-7xl mx-auto mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Hot items near you</h2>
          <Link href="/customer/getShops" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">View all</Link>
        </div>
        {recLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
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
        ) : recs.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">No hot items yet. Start exploring nearby shops.</p>
        ) : (
          <>
            {/* Mobile carousel */}
            <div className="md:hidden -mx-4 px-4 overflow-x-auto">
              <div className="flex gap-4 snap-x snap-mandatory pb-2">
                {recs.slice(0, 8).map((it) => (
                  <Link key={it.id} href={`/customer/getShops/${it.shop_id}/item/${it.id}`} className="min-w-[70%] sm:min-w-[260px] snap-start">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
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
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop grid */}
            <motion.div initial="hidden" animate="show" variants={gridVariants} className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {recs.slice(0, 8).map((it) => (
                  <motion.div key={it.id} variants={cardVariants} whileHover="hover" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
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
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      {/* Nearby Shops */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Nearby shops</h2>
          <Link href="/customer/getShops" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">See more</Link>
        </div>
        {shopsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        ) : shops.length === 0 ? (
          <div className="mt-4 text-[var(--muted-foreground)]">No shops found near your location.</div>
        ) : (
          <>
            {/* Mobile carousel */}
            <div className="md:hidden -mx-4 px-4 overflow-x-auto">
              <div className="flex gap-4 snap-x snap-mandatory pb-2">
                {shops.slice(0, 6).map((shop) => (
                  <Link key={shop.id} href={`/customer/getShops/${shop.id}`} className="min-w-[80%] sm:min-w-[300px] snap-start">
                    <div className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)]">
                      <div className="h-44 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                        <img src={shop.image?.url || "/placeholder.png"} alt={shop.shop_name} className="w-full h-full object-cover object-center" />
                      </div>
                      <div className="bg-[var(--card)] p-4">
                        <h3 className="text-lg font-semibold truncate">{shop.shop_name}</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">{shop.address}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {shop.category?.slice(0, 3).map((cat, i) => (
                            <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop grid */}
            <motion.div initial="hidden" animate="show" variants={gridVariants} className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {shops.slice(0, 6).map((shop) => (
                  <motion.div key={shop.id} variants={cardVariants} whileHover="hover" className="relative bg-[var(--card)] text-[var(--card-foreground)] rounded-2xl shadow-md overflow-hidden border border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors duration-200">
                    <Link href={`/customer/getShops/${shop.id}`} className="block">
                      <div className="h-44 md:h-48 bg-gradient-to-b from-[var(--muted)] to-[var(--card)] overflow-hidden">
                        <img src={shop.image?.url || "/placeholder.png"} alt={shop.shop_name} className="w-full h-full object-cover object-center" />
                      </div>
                      <div className="bg-[var(--card)] p-4">
                        <h3 className="text-lg font-semibold truncate">{shop.shop_name}</h3>
                        <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">{shop.address}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {shop.category?.slice(0, 3).map((cat, i) => (
                            <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{cat}</span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div className="max-w-7xl mx-auto mt-12 mb-16">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Recent orders</h2>
          <Link href="/customer/orders" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">View orders</Link>
        </div>
        {ordersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse">
                <div className="h-5 w-40 bg-[var(--muted)] rounded" />
                <div className="h-3 w-28 bg-[var(--muted)] rounded mt-2" />
                <div className="mt-4 h-8 w-full bg-[var(--muted)] rounded" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">No recent orders.</p>
        ) : (
          <motion.div initial="hidden" animate="show" variants={gridVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {orders.map((order) => (
              <motion.div key={order.cart_id} variants={cardVariants} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-sm transition">
                <Link href={`/customer/orders/${order.cart_id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">Order #{formatOrderId(order.id)}</h3>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] capitalize">{order.payment_status}</span>
                  </div>
                  <div className="mt-3 text-sm flex items-center justify-between">
                    <div className="text-[var(--muted-foreground)]">Amount</div>
                    <div className="font-medium">₹{order.amount_paid}</div>
                  </div>
                  <div className="mt-1 text-sm flex items-center justify-between">
                    <div className="text-[var(--muted-foreground)]">Shop</div>
                    <div className="font-medium truncate max-w-[60%] text-right">{order.Shops?.shop_name}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
