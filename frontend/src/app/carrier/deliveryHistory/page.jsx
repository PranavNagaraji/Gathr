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
                <motion.div role="listitem" key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="border border-[var(--border)] rounded-lg shadow-sm p-3 bg-[var(--card)] text-[var(--card-foreground)] flex flex-col md:flex-row gap-4">
        {/* Left: Order & Details */}
        <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Order ID: {order.id}</h2>
            </div>
            <p><strong>Amount:</strong> ₹{order.amount_paid}</p>

            <div>
            <h3 className="font-semibold text-sm">Shop:</h3>
            <p className="text-sm">{order.Shops.shop_name}</p>
            <p className="text-sm">{order.Shops.address}</p>
            </div>

            <div>
            <h3 className="font-semibold text-sm">Delivery:</h3>
            <p className="text-sm">{order.Addresses.title}</p>
            <p className="text-sm">{order.Addresses.address}</p>
            </div>
        </div>

        </motion.div>
            ))
        ) : (
            <p className="text-[var(--muted-foreground)]">No orders yet.</p>
        )}
        </motion.div>
    </div>
  );
}
