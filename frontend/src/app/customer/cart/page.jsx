"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { Trash2, Plus, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const Cart = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [items, setItems] = useState([]);
  const [loadingItem, setLoadingItem] = useState(null);
  const [isMixedShops, setIsMixedShops] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const getItems = async () => {
      const token = await getToken();
      try {
        const res = await axios.post(
          `${API_URL}/api/customer/getCart`,
          { clerkId: user.id },
          { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );

        const updatedItems = (res.data.cartItems || []).map((it) => ({
          ...it,
          originalQuantity: it.quantity,
        }));

        setItems(updatedItems);

        const shopIds = updatedItems.map((it) => it.Items?.shop_id);
        const uniqueShopIds = [...new Set(shopIds.filter(Boolean))];
        setIsMixedShops(uniqueShopIds.length > 1);
      } catch (err) {
        console.error("Error fetching cart:", err);
      }
    };

    getItems();
  }, [isLoaded, isSignedIn, user]);

  const handleQuantityChange = (itemId, delta) => {
    setItems((prev) =>
      prev.map((it) =>
        it.item_id === itemId ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
      )
    );
  };

  const handleDeleteItem = async (itemId) => {
    if (!user) return;
    setLoadingItem(itemId);
    const token = await getToken();

    try {
      const item = items.find((it) => it.item_id === itemId);
      const quantity = item ? item.originalQuantity || item.quantity : 1;

      const result = await axios.post(
        `${API_URL}/api/customer/deleteFromCart`,
        { clerkId: user.id, itemId, quantity },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );

      if (result.status !== 200) throw new Error(result.data.message);

      const updatedItems = items.filter((it) => it.item_id !== itemId);
      setItems(updatedItems);

      const shopIds = updatedItems.map((it) => it.Items?.shop_id);
      const uniqueShopIds = [...new Set(shopIds.filter(Boolean))];
      setIsMixedShops(uniqueShopIds.length > 1);

      toast.success("Item removed from cart");
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Failed to delete item");
    } finally {
      setLoadingItem(null);
    }
  };

  const handleSubmitItem = async (item) => {
    if (!user) return;
    setLoadingItem(item.item_id);
    const token = await getToken();

    try {
      const delta = item.quantity - item.originalQuantity;
      if (delta === 0) return;

      const endpoint =
        delta > 0
          ? `${API_URL}/api/customer/addToCart`
          : `${API_URL}/api/customer/deleteFromCart`;

      const body =
        delta > 0
          ? { clerkId: user.id, itemId: item.item_id, quantity: delta }
          : { clerkId: user.id, itemId: item.item_id, quantity: -delta };

      const result = await axios.post(endpoint, body, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (result.status !== 200) throw new Error(result.data.message);

      const updated = items.map((it) =>
        it.item_id === item.item_id ? { ...it, originalQuantity: it.quantity } : it
      );
      setItems(updated);

      const shopIds = updated.map((it) => it.Items?.shop_id);
      const uniqueShopIds = [...new Set(shopIds.filter(Boolean))];
      setIsMixedShops(uniqueShopIds.length > 1);

      toast.success("Quantity updated");
    } catch (err) {
      console.error("Error updating quantity:", err);
      toast.error("Failed to update item");
    } finally {
      setLoadingItem(null);
    }
  };

  const totalPrice = items.reduce((acc, item) => acc + item.Items?.price * item.quantity, 0);

  return (
    <div className="px-6 md:px-10 lg:px-12 py-10 max-w-6xl mx-auto bg-[var(--background)] text-[var(--foreground)] min-h-screen">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Your Cart</h1>
        <span className="text-sm text-[var(--muted-foreground)]">{items.length} items</span>
      </div>

      {items.length === 0 ? (
        <p className="text-[var(--muted-foreground)] text-lg">No items in your cart yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Items list */}
          <div className="lg:col-span-2">
            {isMixedShops && (
              <div className="bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)] font-semibold p-4 rounded-lg mb-6 border border-[var(--destructive)]/30">
                Items must be from the same shop. Remove others to proceed.
              </div>
            )}

            <ul className="space-y-4" role="list" aria-label="Cart items">
              {items.map((item) => (
                <li
                  key={item.item_id}
                  role="listitem"
                  className="flex flex-col sm:flex-row justify-between items-center bg-[var(--card)] rounded-xl p-4 shadow-sm border border-[var(--border)] hover:shadow-md transition-shadow"
                >
                  {/* Left section */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <img
                      src={item.Items?.images?.[0]?.url || "/placeholder.png"}
                      alt={item.Items?.name}
                      className="w-20 h-20 object-cover rounded-lg border border-[var(--border)]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">
                          {item.Items?.name || "Unknown Item"}
                        </h3>
                        <div className="relative group inline-block">
                          <span className="text-[var(--muted-foreground)] text-sm cursor-pointer">ℹ️</span>
                          <div className="absolute left-1 -translate-x-1/2 w-max max-w-[200px] bg-[var(--popover)] text-[var(--popover-foreground)] text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 border border-[var(--border)]">
                            {`${item.Items?.description?.slice(0, 120)}...` || item.Items?.name}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {item.Items?.priceType === "monthly"
                          ? `$${item.Items?.price}/mo`
                          : `$${item.Items?.price?.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--muted)]/20">
                      <button
                        onClick={() => handleQuantityChange(item.item_id, -1)}
                        className="px-3 py-2 hover:bg-[var(--muted)]/50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-4 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.item_id, 1)}
                        className="px-3 py-2 hover:bg-[var(--muted)]/50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleSubmitItem(item)}
                      disabled={loadingItem === item.item_id}
                      className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      {loadingItem === item.item_id ? "Updating..." : "Update"}
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.item_id)}
                      disabled={loadingItem === item.item_id}
                      className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Summary sidebar */}
          <aside className="lg:sticky lg:top-20 lg:h-fit bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[var(--muted-foreground)]">Total</span>
              <span className="text-xl font-bold">${totalPrice.toLocaleString()}</span>
            </div>
            <button
              onClick={() => router.push("/customer/checkout")}
              className="w-full mt-5 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg font-semibold hover:opacity-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Proceed to checkout"
            >
              Proceed to Checkout
            </button>
          </aside>
        </div>
      )}

      {/* Mobile bottom bar */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 lg:hidden bg-[var(--card)]/95 backdrop-blur border-t border-[var(--border)] p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            <p className="text-lg font-bold">${totalPrice.toLocaleString()}</p>
          </div>
          <button
            onClick={() => router.push("/customer/checkout")}
            className="px-5 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold"
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;
