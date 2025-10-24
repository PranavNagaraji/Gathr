'use client';
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import OrderMapCard from '../../../components/OrdersMap';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const router = useRouter();

  const [orders, setOrders] = useState([]);
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

    const fetchOrders = async (latitude, longitude) => {
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/getDelivery`,
          { clerkId: user.id, 
            lat: latitude,
            long: longitude
            // lat:  15.8281257,
            // long: 78.0372792
            },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.ordersAndShop);
        console.log(res.data.ordersAndShop);    
      } catch (err) {
        console.log(err);
      }
    };

    const getUserLocationAndFetchOrders = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCarrierLocation({ lat: latitude, lng: longitude });
            fetchOrders(latitude, longitude);
          },
          () => {
            setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
            fetchOrders(15.750366871923427, 78.03934675615315);
          }
        );
      } else {
        setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
        fetchOrders(15.750366871923427, 78.03934675615315);
      }
    };

    fetchCarrier();
    getUserLocationAndFetchOrders();
  }, [user, isLoaded, isSignedIn]);


  const handleAcceptOrder = async (orderId) => {
    try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/acceptDelivery`,{
            clerkId: user.id,
            orderId:orderId
          },{
            headers: { Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
            }
          }
        )
        toast.success(res.data.message || 'Order accepted');
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
    } catch (err) {
      console.log(err);
      toast.error('Failed to accept order');
    }
  }

  return (
    <div className="p-4 bg-[var(--background)] text-[var(--foreground)]">
        <h1 className="text-2xl font-bold mb-4">Orders Dashboard</h1>

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

        {/* Right: Map */}
        <div className="w-full md:w-1/3 h-36">
            <OrderMapCard
            shopLocation={order.Shops.Location}
            deliveryLocation={order.Addresses.location}
            carrierLocation={carrierLocation}
            />        
        </div>
        <button className='p-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md hover:opacity-90' onClick={()=>handleAcceptOrder(order.id)}>Accept</button>
        </motion.div>
            ))
        ) : (
            <p className="text-[var(--muted-foreground)]">No orders yet.</p>
        )}
        </motion.div>
    </div>
  );
}
