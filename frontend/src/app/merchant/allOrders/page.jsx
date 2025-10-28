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
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchOrders = async () => {
      try {
        const token = await getToken();
        setLoading(true);
        const res = await axios.get(
          `${API_URL}/api/merchant/get_all_carts/${user.id}?page=${page}&limit=${limit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.carts || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isLoaded, isSignedIn, user, getToken, API_URL, page, limit]);

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
          className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--card)] text-[var(--card-foreground)] shadow-sm"
        >
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleExpand(order.id)}
          >
            <div>
              <p className="font-semibold text-lg text-[var(--card-foreground)]">
                Order #{order.id} —{" "}
                <span className="text-sm text-[var(--muted-foreground)]">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">{order.payment_method}</span>
                <span className={`px-2 py-0.5 rounded-full border ${order.payment_status === 'paid' ? 'bg-[color-mix(in_oklab,var(--success),white_85%)] text-[var(--success)] border-[var(--border)]' : 'bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] border-[var(--border)]'}`}>
                  Payment: {order.payment_status}
                </span>
                {order.status && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                    Status: {order.status}
                  </span>
                )}
              </div>
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
                <h3 className="font-medium mb-2 text-[var(--card-foreground)]">Items:</h3>
                {order.Cart?.Cart_items?.length ? (
                  <div className="space-y-3">
                    {order.Cart.Cart_items.map((ci) => (
                      <div
                        key={ci.id}
                        className="flex items-center gap-3 border border-[var(--border)] rounded-lg p-3"
                      >
                        <img
                          src={ci.Items?.images?.[0]?.url}
                          alt={ci.Items?.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-[var(--card-foreground)]">
                            {ci.Items?.name}
                          </p>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            Qty: {ci.quantity} × ₹{ci.Items?.price}
                          </p>
                          <p className="text-sm text-[var(--card-foreground)]/90">
                            Total: ₹{ci.quantity * ci.Items?.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm">No items found.</p>
                )}
              </div>

              {/* 👤 Carrier Details */}
              <div>
                <h3 className="font-medium mb-2 text-[var(--card-foreground)]">Carrier:</h3>
                {order.Users ? (
                  <div className="rounded-lg p-3 text-sm bg-[var(--muted)]/30 text-[var(--card-foreground)] border border-[var(--border)]">
                    <p>
                      <span className="font-medium">ID:</span> {order.Users.id}
                    </p>
                    {order.Users.full_name && (
                      <p><span className="font-medium">Name:</span> {order.Users.full_name}</p>
                    )}
                    {order.Users.username && !order.Users.full_name && (
                      <p><span className="font-medium">Username:</span> {order.Users.username}</p>
                    )}
                    {order.Users.email && (
                      <p><span className="font-medium">Email:</span> {order.Users.email}</p>
                    )}
                    {order.Users.mobile_no && (
                      <p><span className="font-medium">Mobile:</span> {order.Users.mobile_no}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm">No carrier assigned yet.</p>
                )}
              </div>

              {/* 📦 Address */}
              <div>
                <h3 className="font-medium mb-2 text-[var(--card-foreground)]">Delivery Address:</h3>
                {order.Addresses ? (
                  <div className="rounded-lg p-3 text-sm bg-[var(--muted)]/30 text-[var(--card-foreground)] border border-[var(--border)]">
                    <p>
                      <span className="font-medium">{order.Addresses.title}</span>
                    </p>
                    <p>{order.Addresses.address}</p>
                    <p>📞 {order.Addresses.mobile_no}</p>
                  </div>
                ) : (
                  <p className="text-[var(--muted-foreground)] text-sm">No address available.</p>
                )}
              </div>

              {/* 💰 Payment */}
              <div>
                <h3 className="font-medium mb-2 text-[var(--card-foreground)]">Payment Details:</h3>
                <p className="text-sm text-[var(--card-foreground)]/90">
                  Amount Paid: ₹{order.amount_paid}
                </p>
                <p className="text-sm text-[var(--card-foreground)]/90">Payment Status: {order.payment_status}</p>
                {order.status && (
                  <p className="text-sm text-[var(--card-foreground)]/90">Order Status: {order.status}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          className="px-3 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Prev
        </button>
        <span className="text-sm text-[var(--muted-foreground)]">
          Page {page} of {Math.max(1, Math.ceil(total / limit))}
        </span>
        <button
          className="px-3 py-1.5 rounded-md border border-[var(--border)] disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AllOrders;
