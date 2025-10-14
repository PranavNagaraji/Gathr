'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

const Orders = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="text-center mt-10">Loading orders...</div>;

  if (!orders.length)
    return <div className="text-center mt-10 text-gray-500">No orders found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Orders</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {orders.map((order) => (
          <Link
            href={`/customer/orders/${order.cart_id}`}
            key={order.cart_id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition-all"
          >
            <h2 className="text-xl font-semibold mb-2">
              Order #{order.cart_id}
            </h2>
            <p>
              <span className="font-medium">Amount Paid:</span> ₹{order.amount_paid}
            </p>
            <p>
              <span className="font-medium">Payment Method:</span> {order.payment_method.toUpperCase()}
            </p>
            <p>
              <span className="font-medium">Payment Status:</span> {order.payment_status}
            </p>
            <p>
              <span className="font-medium">Order Status:</span> {order.status.replace(/'/g,'')}
            </p>
            <p>
              <span className="font-medium">Address ID:</span> {order.address_id}
            </p>
            <p>
              <span className="font-medium">Shop Name:</span> {order.Shops.shop_name}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Created At: {new Date(order.created_at).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Orders;
