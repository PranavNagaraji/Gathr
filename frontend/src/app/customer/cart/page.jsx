"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const Cart = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [items, setItems] = useState([]);
  const [loadingItem, setLoadingItem] = useState(null);
  const router = useRouter();
  // 🆕 Add this state
  const [isMixedShops, setIsMixedShops] = useState(false);

  // 🧩 Fetch cart items
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const getItems = async () => {
      const token = await getToken();
      try {
        const res = await axios.post(
          `${API_URL}/api/customer/getCart`,
          { clerkId: user.id },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // store both originalQuantity & current quantity
        const updatedItems = (res.data.cartItems || []).map((it) => ({
          ...it,
          originalQuantity: it.quantity,
        }));

        setItems(updatedItems);

        // 🆕 Check if items belong to multiple shops
        const shopIds = updatedItems.map((it) => it.Items?.shop_id);
        const uniqueShopIds = [...new Set(shopIds.filter(Boolean))];
        setIsMixedShops(uniqueShopIds.length > 1);
      } catch (error) {
        console.error("Error fetching cart:", error);
      }
    };
    getItems();
  }, [isLoaded, isSignedIn, user]);

  // 🧮 Change quantity locally (no backend call)
  const handleQuantityChange = (itemId, delta) => {
    setItems((prev) =>
      prev.map((it) =>
        it.item_id === itemId
          ? { ...it, quantity: Math.max(1, it.quantity + delta) }
          : it
      )
    );
  };

  // ❌ Delete item from backend
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
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (result.status !== 200) throw new Error(result.data.message);

      const updatedItems = items.filter((it) => it.item_id !== itemId);
      setItems(updatedItems);

      // 🆕 Recheck after deletion
      const shopIds = updatedItems.map((it) => it.Items?.shop_id);
      const uniqueShopIds = [...new Set(shopIds.filter(Boolean))];
      setIsMixedShops(uniqueShopIds.length > 1);

      alert("Item removed from cart");
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Failed to delete item");
    } finally {
      setLoadingItem(null);
    }
  };

  // 🚀 Submit updated quantity
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (result.status !== 200) throw new Error(result.data.message);

      const updated = items.map((it) =>
        it.item_id === item.item_id
          ? { ...it, originalQuantity: it.quantity }
          : it
      );
      setItems(updated);

      // 🆕 Recheck after quantity update
      const shopIds = updated.map((it) => it.Items?.shop_id);
      const uniqueShopIds = [...new Set(shopIds.filter(Boolean))];
      setIsMixedShops(uniqueShopIds.length > 1);

      alert("Quantity updated successfully");
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("Failed to update item");
    } finally {
      setLoadingItem(null);
    }
  };

  // 🧾 Total price
  const totalPrice = items.reduce(
    (acc, item) => acc + item.Items?.price * item.quantity,
    0
  );

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">🛒 Your Cart</h2>

      {items.length === 0 ? (
        <p>No items in your cart.</p>
      ) : (
        <>
          {/* 🆕 Show warning if multiple shops */}
          {isMixedShops && (
            <div className="text-red-600 font-medium mb-4">
              ⚠️ Items must be from the same shop. Please remove items from
              other shops to proceed.
            </div>
          )}

          <ul className="space-y-4">
            {items.map((item) => {
              const hasChanged = item.quantity !== item.originalQuantity;
              return (
                <li
                  key={item.id}
                  className="p-4 border rounded-lg shadow-sm flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <img
                      src={item.Items?.images?.[0]?.url || "/placeholder.png"}
                      alt={item.Items?.name}
                      className="w-24 h-24 object-cover mr-4 rounded-md"
                    />
                    <div>
                      <h3 className="text-lg font-medium">
                        {item.Items?.name || "Unknown Item"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.Items?.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        Price: ₹{item.Items?.price}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            item.quantity > 1 &&
                            handleQuantityChange(item.item_id, -1)
                          }
                          className="px-2 py-1 border rounded"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.item_id, 1)}
                          className="px-2 py-1 border rounded"
                        >
                          +
                        </button>
                      </div>

                      {hasChanged && (
                        <button
                          onClick={() => handleSubmitItem(item)}
                          disabled={loadingItem === item.item_id}
                          className={`mt-3 px-3 py-1 rounded text-white ${
                            loadingItem === item.item_id
                              ? "bg-gray-400"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          {loadingItem === item.item_id
                            ? "Submitting..."
                            : "Submit Changes"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-green-600 mb-2">
                      ₹{item.Items?.price * item.quantity}
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.item_id)}
                      disabled={loadingItem === item.item_id}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t pt-4 text-right">
            <p className="text-lg font-semibold">
              Total: ₹{totalPrice.toFixed(2)}
            </p>
            <button className="p-2 bg-green-500 text-black rounded-lg m-2" 
            onClick={() => router.push("/customer/checkout")}>Checkout</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
