'use client';
import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import DeliveryRouteMap from '../../../components/DeliveryRouteMap';

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

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Assigned Deliveries</h1>

      {orders.length === 0 && <p>No deliveries on the way.</p>}

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border rounded-lg shadow p-3 cursor-pointer hover:bg-gray-50"
            onClick={() => setSelectedOrder(order)}
          >
            <p>
              <strong>Order ID:</strong> {order.id} | <strong>Status:</strong> {order.status}
            </p>
            <p>
              <strong>Shop:</strong> {order.Shops.shop_name}
            </p>
            <p>
              <strong>Delivery:</strong> {order.Addresses.title}
            </p>
          </div>
        ))}
      </div>

      {selectedOrder && carrierLocation && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Route for Order {selectedOrder.id}</h2>
          <DeliveryRouteMap
            carrierLocation={carrierLocation}
            shopLocation={selectedOrder.Shops.Location}
            deliveryLocation={selectedOrder.Addresses.location}
            onDeliveryComplete={() => alert('OTP verification flow here')}
          />
        </div>
      )}
    </div>
  );
}
