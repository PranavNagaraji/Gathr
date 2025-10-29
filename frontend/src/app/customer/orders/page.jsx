'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Orders = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [total, setTotal] = useState(0);

  const statusStyles = {
    ordered: "bg-blue-100 text-blue-800",
    accepted: "bg-amber-100 text-amber-800",
    ontheway: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const getStatusStyle = (s) =>
    statusStyles[s?.toLowerCase?.()?.replace(/'/g, "")] ||
    "bg-[var(--muted)] text-[var(--muted-foreground)]";

  const paymentStyles = {
    paid: "bg-emerald-100 text-emerald-800",
    success: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    declined: "bg-red-100 text-red-800",
    refunded: "bg-sky-100 text-sky-800",
  };
  const getPaymentStyle = (s) =>
    paymentStyles[s?.toLowerCase?.()] || "bg-[var(--muted)] text-[var(--muted-foreground)]";

  const deliverySteps = ["pending", "accepted", "ontheway", "delivered"];
  const deliveryLabels = {
    pending: "Pending",
    accepted: "Accepted",
    ontheway: "Ontheway",
    delivered: "Delivered",
  };

  const formatOrderId = (id) => {
    const s = String(id || "");
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  useEffect(() => {
    const getOrders = async () => {
      if (!isLoaded || !isSignedIn || !user) return;
      try {
        const token = await getToken();
        setLoading(true);
        const res = await axios.get(
          `${API_URL}/api/customer/getcarthistory/${user.id}?page=${page}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.carts || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getOrders();
  }, [user, isLoaded, isSignedIn, page, limit]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 text-center">
          <div className="h-8 w-48 bg-[var(--muted)] rounded mx-auto animate-pulse" />
          <div className="h-4 w-64 bg-[var(--muted)] rounded mx-auto mt-3 animate-pulse" />
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse">
              <div className="h-5 w-40 bg-[var(--muted)] rounded" />
              <div className="h-3 w-28 bg-[var(--muted)] rounded mt-2" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full bg-[var(--muted)] rounded" />
                <div className="h-3 w-5/6 bg-[var(--muted)] rounded" />
                <div className="h-3 w-2/3 bg-[var(--muted)] rounded" />
                <div className="h-3 w-1/2 bg-[var(--muted)] rounded" />
              </div>
              <div className="mt-4 h-8 w-full bg-[var(--muted)] rounded" />
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-8 w-16 bg-[var(--muted)] rounded" />
          <div className="h-4 w-32 bg-[var(--muted)] rounded" />
          <div className="h-8 w-16 bg-[var(--muted)] rounded" />
        </div>
      </div>
    );
  }

  if (!orders.length)
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mt-10 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-2xl p-10 bg-[var(--card)]/40">
          <div className="w-24 h-24 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-[var(--muted-foreground)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h3l.4 2M7 13h10l2-8H6.4M7 13l-1.293 1.293A1 1 0 006 15h2m-1-2v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold">No orders yet</h2>
          <p className="mt-2 text-[var(--muted-foreground)] max-w-md">You haven’t placed any orders. Start exploring shops and add items to your cart.</p>
          <a href="/customer/getShops" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold hover:opacity-90">
            Browse Shops
          </a>
        </div>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Your Orders</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">View recent purchases and their status</p>
      </header>
      <motion.section
        role="list"
        aria-label="Orders list"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div
              role="listitem"
              key={order.cart_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <Link href={`/customer/orders/${order.cart_id}`} className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Order #{formatOrderId(order.id)}</h2>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPaymentStyle(order.payment_status)} capitalize`}>
                      {order.payment_status}
                    </span>
                  </div>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Amount Paid</dt><dd className="font-medium">₹{order.amount_paid}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Method</dt><dd className="font-medium">{order.payment_method?.toUpperCase?.() || '-'}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Delivery</dt><dd className="font-medium capitalize">{order.status.replace(/'/g,'')}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Address ID</dt><dd className="font-medium">{order.address_id}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Shop</dt><dd className="truncate max-w-[60%] text-right font-medium">{order.Shops.shop_name}</dd></div>
                </dl>
                {order.Users ? (
                  <div className="mt-4 flex items-center gap-3">
                    <img
                      src={order.Users?.delivery_details?.profile?.url || '/avatar.png'}
                      alt="Delivery profile"
                      className="w-8 h-8 rounded-full object-cover border border-[var(--border)]"
                    />
                    <div className="text-sm">
                      <p className="font-medium leading-tight">{[order.Users?.first_name, order.Users?.last_name].filter(Boolean).join(' ') || 'Delivery Partner'}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{order.Users?.delivery_details?.phone || 'Phone N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-[var(--muted-foreground)]">Delivery partner not assigned yet</p>
                )}

                <div className="mt-4">
                  <div className="grid grid-cols-4 items-center gap-2">
                    {deliverySteps.map((step, idx) => {
                      const current = order.status?.toLowerCase?.()?.replace(/'/g, "");
                      const currentIdx = deliverySteps.indexOf(current);
                      const completed = currentIdx >= idx;
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div className="flex items-center w-full">
                            {idx > 0 && (
                              <div className={`h-0.5 flex-1 ${currentIdx > idx - 1 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                            )}
                            <div className={`h-2.5 w-2.5 rounded-full ${completed ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                            {idx < deliverySteps.length - 1 && (
                              <div className={`h-0.5 flex-1 ${currentIdx > idx ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                            )}
                          </div>
                          <span className="mt-1 text-[11px] text-[var(--muted-foreground)]">{deliveryLabels[step]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.section>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          className="px-3 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Prev
        </button>
        <span className="text-sm text-[var(--muted-foreground)]">
          Page {page} of {Math.max(1, Math.ceil(total / limit))}
        </span>
        <button
          className="px-3 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Orders;
