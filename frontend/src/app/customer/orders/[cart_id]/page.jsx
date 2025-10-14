'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const CartItems = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [items, setItems] = useState([]);
  const { cart_id } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getOrders = async () => {
      if (!isLoaded || !isSignedIn || !user) return;
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/customer/getcartitems`,
          { cartId: cart_id, clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setItems(res.data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    getOrders();
  }, [user, isLoaded, isSignedIn, cart_id]);

  if (loading) return <div className="text-center mt-10">Loading items...</div>;

  if (!items.length)
    return <div className="text-center mt-10 text-gray-500">No items in this cart.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Cart Items</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition-all flex flex-col"
          >
            <img
              src={item.Items.images?.[0]?.url || '/placeholder.png'}
              alt={item.Items.name}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">{item.Items.name}</h2>
            <p className="text-gray-600 mb-1">{item.Items.description}</p>
            <p className="text-sm text-gray-500 mb-1">
              Category: {item.Items.category.join(', ')}
            </p>
            <p className="font-medium mb-1">Price: ₹{item.Items.price}</p>
            <p className="font-medium mb-1">Quantity: {item.quantity}</p>
            <p className="text-gray-400 text-sm mt-auto">
              Added on: {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CartItems;
