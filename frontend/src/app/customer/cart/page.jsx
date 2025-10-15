"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { Trash2, Plus, Minus } from "lucide-react";
import { useRouter } from "next/navigation";

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

      alert("Item removed from cart");
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item");
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

      alert("Quantity updated successfully");
    } catch (err) {
      console.error("Error updating quantity:", err);
      alert("Failed to update item");
    } finally {
      setLoadingItem(null);
    }
  };

  const totalPrice = items.reduce((acc, item) => acc + item.Items?.price * item.quantity, 0);

  return (
    <div className="px-6 md:px-16 py-10 max-w-5xl mx-auto bg-[#faf9f5] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-black">YOUR</h1>
        <h1 className="text-5xl font-extrabold tracking-tight text-black">CART</h1>
      </div>

      <hr className="border-black/20 mb-10" />

      {items.length === 0 ? (
        <p className="text-gray-600 text-lg">No items in your cart yet.</p>
      ) : (
        <>
          {isMixedShops && (
            <div className="bg-red-50 text-red-700 font-semibold p-4 rounded-lg mb-6 border border-red-200">
              ⚠️ Items must be from the same shop. Remove others to proceed.
            </div>
          )}

          <ul className="space-y-6">
            {items.map((item) => (
              <li
                key={item.item_id}
                className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition"
              >
                {/* Left section */}
                <div className="flex items-center gap-5 w-full sm:w-auto">
                  <img
                    src={item.Items?.images?.[0]?.url || "/placeholder.png"}
                    alt={item.Items?.name}
                    className="w-24 h-24 object-cover rounded-xl border"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {item.Items?.name || "Unknown Item"}
                      </h3>
                      <div className="relative group inline-block">
                        <span className="text-gray-400 text-sm cursor-pointer hover:text-gray-600">
                          ℹ️
                        </span>
                        <div className="absolute left-1 -translate-x-1/2 w-max max-w-[150px] bg-gray-800 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          {`${item.Items?.description?.slice(0, 100)}...` || item.Items?.name}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 text-base mt-1">
                      {item.Items?.priceType === "monthly"
                        ? `$${item.Items?.price}/mo`
                        : `$${item.Items?.price?.toLocaleString()}`}
                    </p>
                  </div>
                </div>

                {/* Quantity and Actions */}
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  <div className="flex items-center border rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleQuantityChange(item.item_id, -1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <Minus size={16} className="text-gray-700" />
                    </button>
                    <span className="px-4 font-medium text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.item_id, 1)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition"
                    >
                      <Plus size={16} className="text-gray-700" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleSubmitItem(item)}
                    disabled={loadingItem === item.item_id}
                    className="px-4 py-2 rounded-xl text-white bg-black hover:bg-gray-900 text-sm font-semibold transition"
                  >
                    {loadingItem === item.item_id ? "Updating..." : "Update"}
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.item_id)}
                    disabled={loadingItem === item.item_id}
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Checkout Section */}
          <div className="mt-12 border-t pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-2xl font-bold text-gray-900">
              Total: ${totalPrice.toLocaleString()}
            </p>
            <button
              onClick={() => router.push("/customer/checkout")}
              className="mt-4 md:mt-0 px-8 py-3 bg-black text-white rounded-2xl font-semibold hover:bg-gray-900 transition"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
