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

  useEffect(() => {
    const getOrders = async () => {
      if (!isLoaded || !isSignedIn || !user) return;
      try {
        const token = await getToken();
        const res = await axios.get(
          `${API_URL}/api/customer/getcarthistory/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.carts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getOrders();
  }, [user, isLoaded, isSignedIn]);

  if (loading) return <div className="text-center mt-10 text-[var(--muted-foreground)]">Loading orders...</div>;

  if (!orders.length)
    return <div className="text-center mt-10 text-[var(--muted-foreground)]">No orders found.</div>;

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
              className="group rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <Link href={`/customer/orders/${order.cart_id}`} className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold">Order #{order.cart_id}</h2>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(order.status)}`}>
                      {order.status?.replace(/'/g, '')}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {order.payment_status}
                    </span>
                  </div>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Amount Paid</dt><dd>₹{order.amount_paid}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Method</dt><dd>{order.payment_method?.toUpperCase?.() || '-'}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Status</dt><dd>{order.status.replace(/'/g,'')}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Address ID</dt><dd>{order.address_id}</dd></div>
                  <div className="flex justify-between"><dt className="text-[var(--muted-foreground)]">Shop</dt><dd className="truncate max-w-[60%] text-right">{order.Shops.shop_name}</dd></div>
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
                <p className="text-xs text-[var(--muted-foreground)] mt-3">{new Date(order.created_at).toLocaleString()}</p>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.section>
    </div>
  );
};

export default Orders;
