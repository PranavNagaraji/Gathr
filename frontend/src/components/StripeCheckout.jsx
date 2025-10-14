// Written entirely by Ankit Kumar
// Complete Stripe Checkout Component
'use client';
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useState } from "react";

export default function StripeCheckout({ items, totalPrice }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleStripeCheckout = async () => {
    if (!user || !items || items.length === 0) {
      alert("No items to checkout");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      
      // Step 1: Create order from cart
      const orderResponse = await axios.post(
        `${API_URL}/stripe/create-order-from-cart`,
        { clerkId: user.id },
        { 
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      
      const orderId = orderResponse.data.order.id;
      
      // Step 2: Create Stripe checkout session
      const checkoutResponse = await axios.post(
        `${API_URL}/stripe/create-checkout-session`,
        { 
          orderId: orderId, 
          clerkId: user.id 
        },
        { 
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          } 
        }
      );
      
      // Step 3: Redirect to Stripe Checkout
      window.location.href = checkoutResponse.data.url;
      
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-4 text-right">
      <p className="text-lg font-semibold">
        Total: ₹{totalPrice.toFixed(2)}
      </p>
      <button 
        className={`p-2 rounded-lg m-2 font-medium ${
          loading 
            ? "bg-gray-400 text-gray-600 cursor-not-allowed" 
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
        onClick={handleStripeCheckout}
        disabled={loading}
      >
        {loading ? "Processing..." : "Pay with Stripe"}
      </button>
    </div>
  );
}
