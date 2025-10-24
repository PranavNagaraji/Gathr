'use client';
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import DeliveryRouteMap from '../../../components/DeliveryRouteMap';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AssignedDeliveries() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [carrierLocation, setCarrierLocation] = useState(null);

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
        const res = await axios.post(
          `${API_URL}/api/delivery/getOntheWay`,
          { clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.ShopsAndAddresses || []);
        console.log(res.data.ShopsAndAddresses);
      } catch (err) {
        console.log(err);
      }
    };

    const getCarrierLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setCarrierLocation({ lat: latitude, lng: longitude });
          },
          () => {
            setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
          }
        );
      } else {
        setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
      }
    };

    fetchCarrier();
    fetchOrders();
    getCarrierLocation();
  }, [user, isLoaded, isSignedIn]);

  const handelDeliveryComplete = async (orderId) => {
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/completeDelivery`,
          { orderId , clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        } }
        );
        toast.success(res.data.message || 'Delivery completed');
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      } catch (error) {
        console.error("Error accepting order:", error);
        toast.error('Failed to complete delivery');
      }
  }

  return (
    <div className="p-4 bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-2xl font-bold mb-4">Assigned Deliveries</h1>

      {orders.length === 0 && <p className="text-[var(--muted-foreground)]">No deliveries on the way.</p>}

      <motion.div className="grid gap-4" role="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <AnimatePresence>
          {orders.map((order) => (
            <motion.div
              role="listitem"
              key={order.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="border border-[var(--border)] rounded-xl p-4 cursor-pointer bg-[var(--card)] text-[var(--card-foreground)] hover:shadow-md transition-shadow flex items-center justify-between"
              onClick={() => router.push(`/carrier/assignedDeliveries/${order.id}`)}
            >
              <div className="space-y-1">
                <p className="text-sm"><strong>Order ID:</strong> {order.id} <span className="mx-2">|</span> <strong>Status:</strong> {order.status}</p>
                <p className="text-sm"><strong>Shop:</strong> {order.Shops.shop_name}</p>
                <p className="text-sm text-[var(--muted-foreground)]"><strong>Delivery:</strong> {order.Addresses.title}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">View</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {/* Map moved to detail page */}
    </div>
  );
}
