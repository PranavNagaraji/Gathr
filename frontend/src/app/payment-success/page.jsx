// Written entirely by Ankit Kumar
// Payment Success Page
'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, ShoppingBag, Package } from 'lucide-react';

export default function PaymentSuccess() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId || !user) return;

    const verifyPayment = async () => {
      try {
        const token = await getToken();
        const response = await axios.post(
          `${API_URL}/stripe/payment-status`,
          { sessionId, clerkId: user.id },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPaymentStatus(response.data.paymentStatus);
        setOrderDetails({
          orderId: response.data.orderId,
          amountPaid: response.data.amountPaid,
          stripeSessionId: response.data.stripeSessionId
        });
      } catch (error) {
        console.error("Error verifying payment:", error);
        setError("Failed to verify payment status");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, user, getToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Error
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push("/customer/getShops")}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-800 font-medium">Order ID:</span>
              <span className="text-green-900 font-mono">#{orderDetails?.orderId}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-800 font-medium">Amount Paid:</span>
              <span className="text-green-900 font-bold">₹{orderDetails?.amountPaid?.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-800 font-medium">Status:</span>
              <span className="text-green-900 capitalize">{paymentStatus}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/customer/getShops")}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </button>
            
            <button
              onClick={() => router.push("/customer/orders")}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Package className="h-4 w-4" />
              View Orders
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
            <p className="text-blue-800 text-sm">
              Your order has been confirmed and will be processed by the merchant. 
              You'll receive updates on your order status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
