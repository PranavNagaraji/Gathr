'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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

  if (loading) return <div className="text-center mt-10 text-[var(--muted-foreground)]">Loading items...</div>;

  if (!items.length)
    return <div className="text-center mt-10 text-[var(--muted-foreground)]">No items in this cart.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">Order Details</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">Items for cart #{cart_id}</p>
      </header>
      <motion.section
        role="list"
        aria-label="Order items"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              role="listitem"
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <img
                src={item.Items.images?.[0]?.url || '/placeholder.png'}
                alt={item.Items.name}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <div className="p-4">
                <h2 className="text-base font-semibold mb-1">{item.Items.name}</h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-1">{item.Items.description}</p>
                <p className="text-xs text-[var(--muted-foreground)] mb-2">
                  Category: {item.Items.category.join(', ')}
                </p>
                <p className="font-medium mb-1">Price: ₹{item.Items.price}</p>
                <p className="font-medium">Quantity: {item.quantity}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-3">
                  Added on: {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.section>
    </div>
  );
};

export default CartItems;
