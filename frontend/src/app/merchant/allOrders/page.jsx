"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import axios from "axios";
import { ChevronDown, ChevronUp } from "lucide-react";

const AllOrders = () => {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchOrders = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(
          `${API_URL}/api/merchant/get_all_carts/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOrders(res.data.carts || []);
        console.log(res.data.carts);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isLoaded, isSignedIn, user, getToken, API_URL]);

  const toggleExpand = (id) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60 text-gray-500">
        Loading orders...
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center text-gray-500 mt-10">
        No orders found.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-4">All Orders</h1>

      {orders.map((order) => (
        <div
          key={order.id}
          className="border rounded-2xl p-4 bg-white shadow-sm"
        >
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleExpand(order.id)}
          >
            <div>
              <p className="font-semibold text-lg">
                Order #{order.id} —{" "}
                <span className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Payment: {order.payment_method} | Status:{" "}
                <span
                  className={`${
                    order.payment_status === "paid"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {order.payment_status}
                </span>
              </p>
            </div>
            {expandedOrder === order.id ? (
              <ChevronUp className="text-gray-500" />
            ) : (
              <ChevronDown className="text-gray-500" />
            )}
          </div>

          {expandedOrder === order.id && (
            <div className="mt-4 border-t pt-4 space-y-4">
              {/* 🛒 Cart Items */}
              <div>
                <h3 className="font-medium mb-2 text-gray-800">Items:</h3>
                {order.Cart?.Cart_items?.length ? (
                  <div className="space-y-3">
                    {order.Cart.Cart_items.map((ci) => (
                      <div
                        key={ci.id}
                        className="flex items-center gap-3 border rounded-lg p-3"
                      >
                        <img
                          src={ci.Items?.images?.[0]?.url}
                          alt={ci.Items?.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {ci.Items?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {ci.quantity} × ₹{ci.Items?.price}
                          </p>
                          <p className="text-sm text-gray-700">
                            Total: ₹{ci.quantity * ci.Items?.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No items found.</p>
                )}
              </div>

              {/* 📦 Address */}
              <div>
                <h3 className="font-medium mb-2 text-gray-800">Delivery Address:</h3>
                {order.Addresses ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">{order.Addresses.title}</span>
                    </p>
                    <p>{order.Addresses.address}</p>
                    <p>📞 {order.Addresses.mobile_no}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No address available.</p>
                )}
              </div>

              {/* 💰 Payment */}
              <div>
                <h3 className="font-medium mb-2 text-gray-800">Payment Details:</h3>
                <p className="text-sm text-gray-700">
                  Amount Paid: ₹{order.amount_paid}
                </p>
                <p className="text-sm text-gray-700">Status: {order.status}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AllOrders;
