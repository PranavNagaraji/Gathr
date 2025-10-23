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
              className="border border-[var(--border)] rounded-2xl shadow-sm bg-[var(--card)] text-[var(--card-foreground)] p-4 transition-all duration-200"
            >
              {/* Header */}
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleExpand(order.id)}
              >
                <div>
                  <p className="font-semibold text-lg text-[var(--card-foreground)]">
                    Order #{order.id}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">{order.payment_method}</span>
                    <span className={`px-2 py-0.5 rounded-full border ${order.payment_status === 'paid' ? 'bg-[color-mix(in_oklab,var(--success),white_85%)] text-[var(--success)] border-[var(--border)]' : 'bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] border-[var(--border)]'}`}>
                      Payment: {order.payment_status}
                    </span>
                    <span className="ml-1 text-[var(--muted-foreground)]">Amount: ₹{order.amount_paid}</span>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Placed on {new Date(order.created_at).toLocaleString("en-IN")}
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
                <div className="mt-4 border-t border-[var(--border)] pt-3 space-y-4">
                  {/* Cart Items */}
                  <div>
                    <h3 className="font-medium text-[var(--card-foreground)] mb-3">
                      Cart Items:
                    </h3>
                    {order.Cart?.Cart_items?.length > 0 ? (
                      <ul className="space-y-3">
                        {order.Cart.Cart_items.map((item) => {
                          const product = item.Items;
                          return (
                            <li
                              key={item.id}
                              className="flex gap-4 bg-[var(--muted)]/30 p-3 rounded-xl shadow-sm border border-[var(--border)]"
                            >
                              <img
                                src={product.images?.[0]?.url}
                                alt={product.name}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-[var(--card-foreground)]">
                                  {product.name}
                                </p>
                                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
                                  {product.description.slice(0, 100)}...
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                  <p className="text-sm text-[var(--card-foreground)]/90">
                                    ₹{product.price} × {item.quantity}
                                  </p>
                                  <p className="text-sm font-medium text-[var(--card-foreground)]">
                                    ₹{product.price * item.quantity}
                                  </p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        No items found in this cart.
                      </p>
                    )}
                  </div>

                  {/* Address Section */}
                  {order.Addresses && (
                    <div>
                      <h3 className="font-medium text-[var(--card-foreground)] mb-2">
                        Delivery Address:
                      </h3>
                      <div className="rounded-xl p-3 text-sm bg-[var(--muted)]/30 text-[var(--card-foreground)] border border-[var(--border)]">
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
                      className="px-4 py-2 bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] rounded-xl hover:opacity-90 transition-all border border-[var(--border)]"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAccept(order.id , 'accepted')}
                      className="px-4 py-2 bg-[color-mix(in_oklab,var(--success),white_85%)] text-[var(--success)] rounded-xl hover:opacity-90 transition-all border border-[var(--border)]"
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
