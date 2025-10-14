// Written entirely by Ankit Kumar
// Payment Cancelled Page
'use client'
import { XCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentCancelled() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. No charges have been made to your account.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-orange-900 mb-2">What happened?</h3>
            <p className="text-orange-800 text-sm">
              You either cancelled the payment process or there was an issue processing your payment. 
              Your order has been saved and you can try again anytime.
            </p>
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
              onClick={() => window.history.back()}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
            <p className="text-blue-800 text-sm">
              If you're experiencing issues with payments, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
