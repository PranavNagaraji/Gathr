'use client';
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import OrderMapCard from '../../../components/OrdersMap';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const router = useRouter();

  const [orders, setOrders] = useState([]);

  const formatOrderId = (id) => {
    const s = String(id || "");
    return s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchCarrier = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/api/delivery/getCarrier/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res?.data?.carrier?.delivery_details) {
          router.push('/carrier/createCarrier');
        }
      } catch (err) {
        console.log(err);
      }
    };

    const fetchOrders = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(
          `${API_URL}/api/delivery/getAllOrders/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.ShopsAndAddresses);
        console.log(res.data.ShopsAndAddresses);    
      } catch (err) {
        console.log(err);
      }
    };
    fetchCarrier();
    fetchOrders();

}, [user, isLoaded, isSignedIn]);


  return (
    <div className="p-4 bg-[var(--background)] text-[var(--foreground)]">
        <h1 className="text-2xl font-bold mb-4">Delivery History</h1>

        <motion.div className="grid gap-6" role="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {orders.length ? (
              orders.map((order) => (
                <motion.div
                  role="listitem"
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-[var(--border)] rounded-2xl shadow-sm p-4 bg-[var(--card)] text-[var(--card-foreground)] flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">Order #{formatOrderId(order.id)}</h2>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">₹{order.amount_paid}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">Completed</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">Shop</h3>
                      <p className="text-sm">{order.Shops.shop_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{order.Shops.address}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">Delivery</h3>
                      <p className="text-sm">{order.Addresses.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{order.Addresses.address}</p>
                    </div>
                  </div>
                </motion.div>
            ))
        ) : (
            <div className="max-w-4xl mx-auto p-6">
              <div className="mt-6 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-2xl p-10 bg-[var(--card)]/40">
                <div className="w-24 h-24 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-[var(--muted-foreground)]">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7h4l2 4h8l2-4h2M7 17h10M9 21h6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold">No delivery history</h2>
                <p className="mt-2 text-[var(--muted-foreground)] max-w-md">Your completed deliveries will appear here. Keep delivering!</p>
              </div>
            </div>
        )}
        </motion.div>
    </div>
  );
}
