'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import DeliveryRouteMap from '../../../../components/DeliveryRouteMap';
import { toast } from 'react-hot-toast';

export default function AssignedDeliveryDetail() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [order, setOrder] = useState(null);
  const [carrierLocation, setCarrierLocation] = useState(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchOrders = async () => {
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/getOntheWay`,
          { clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = res.data.ShopsAndAddresses || [];
        const found = list.find((o) => String(o.id) === String(params.order_id));
        if (found) setOrder(found);
        else toast.error('Order not found');
      } catch (err) {
        console.error(err);
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

    fetchOrders();
    getCarrierLocation();
  }, [user, isLoaded, isSignedIn, params.order_id]);

  const handleComplete = async () => {
    if (!order) return;
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/delivery/completeDelivery`,
        { orderId: order.id, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      toast.success(res.data.message || 'Delivery completed');
      router.push('/carrier/assignedDeliveries');
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Failed to complete delivery');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Delivery Route</h1>

        {!order && <p className="text-[var(--muted-foreground)]">Loading order...</p>}

        {order && carrierLocation && (
          <DeliveryRouteMap
            carrierLocation={carrierLocation}
            shopLocation={order.Shops.Location}
            deliveryLocation={order.Addresses.location}
            selectedOrder={order}
            onDeliveryComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
