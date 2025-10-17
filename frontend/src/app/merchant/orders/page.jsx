"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import axios from "axios";
import { ChevronDown, ChevronUp } from "lucide-react";  

export default function Orders() {
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
          `${API_URL}/api/merchant/get_pending_carts/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOrders(res.data.carts || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isLoaded, isSignedIn, user, getToken, API_URL]);

  const toggleExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleAccept = async (orderId , status)=> {
    try {
        const token = await getToken();
        const res = await axios.put(
            `${API_URL}/api/merchant/update_order_status`,
            { orderId, status, clerkId: user.id },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        )
        console.log(res.data);
        alert("Order accepted successfully!");
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
    } catch (error) {
        console.error("Error accepting order:", error);
    }
  }

  if (loading) return <div className="p-6 text-lg">Loading orders...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Pending Orders</h1>

      {orders.length === 0 ? (
        <p className="text-gray-500">No pending orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border rounded-2xl shadow-sm bg-white p-4 transition-all duration-200"
            >
              {/* Header */}
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(order.id)}
              >
                <div>
                  <p className="font-semibold text-lg">
                    Order #{order.id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment: {order.payment_status} | Amount: ₹
                    {order.amount_paid}
                  </p>
                  <p className="text-sm text-gray-500">
                    Placed on:{" "}
                    {new Date(order.created_at).toLocaleString("en-IN")}
                  </p>
                </div>

                {expandedOrder === order.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="mt-4 border-t pt-3 space-y-4">
                  {/* Cart Items */}
                  <div>
                    <h3 className="font-medium text-gray-800 mb-3">
                      Cart Items:
                    </h3>
                    {order.Cart?.Cart_items?.length > 0 ? (
                      <ul className="space-y-3">
                        {order.Cart.Cart_items.map((item) => {
                          const product = item.Items;
                          return (
                            <li
                              key={item.id}
                              className="flex gap-4 bg-gray-50 p-3 rounded-xl shadow-sm"
                            >
                              <img
                                src={product.images?.[0]?.url}
                                alt={product.name}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800">
                                  {product.name}
                                </p>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {product.description.slice(0, 100)}...
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                  <p className="text-sm text-gray-700">
                                    ₹{product.price} × {item.quantity}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    ₹{product.price * item.quantity}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No items found in this cart.
                      </p>
                    )}
                  </div>

                  {/* Address Section */}
                  {order.Addresses && (
                    <div>
                      <h3 className="font-medium text-gray-800 mb-2">
                        Delivery Address:
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
                        <p className="font-medium">{order.Addresses.title}</p>
                        <p>{order.Addresses.address}</p>
                        <p>📍 {order.Addresses.mobile_no}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end mt-3">
                    <button
                      onClick={() => handleAccept(order.id,'rejected')}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAccept(order.id , 'accepted')}
                      className="px-4 py-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-all"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
