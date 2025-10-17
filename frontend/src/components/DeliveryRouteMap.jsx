'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
  Marker,
} from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
};

export default function DeliveryRouteMap({
  carrierLocation,
  shopLocation,
  deliveryLocation,
  selectedOrder,
  onDeliveryComplete,
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });
  const { getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [directions, setDirections] = useState(null);
  const [currentStep, setCurrentStep] = useState('toShop');
  const [mapCenter, setMapCenter] = useState(carrierLocation);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // --- Helper functions ---
  const sendOtp = async (email) => {
    try {
      const token = await getToken();
      console.log(email);
      const res = await axios.post(`${API_URL}/api/otp`, { email }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP');
    }
  };

  const verifyOtp = async (email) => {
    try {
      const token = await getToken();
      const res = await axios.post(`${API_URL}/api/otp`, { email, otp },{headers:{
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
    });
      if (res.data.verified) {
        alert('Delivery verified successfully!');
        onDeliveryComplete?.();
        setShowOtpModal(false);
      } else {
        alert(res.data.message || 'Invalid OTP. Try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying OTP');
    }
  };

  const formatLocation = (loc) => {
    if (!loc) return null;
    return {
      lat: Number(loc.latitude ?? loc.lat),
      lng: Number(loc.longitude ?? loc.long ?? loc.lng),
    };
  };


  const carrier = formatLocation(carrierLocation);
  const shop = formatLocation(shopLocation);
  const customer = formatLocation(deliveryLocation);

  useEffect(() => setDirections(null), [currentStep]);

  useEffect(() => {
    if (currentStep === 'toShop' && carrier) setMapCenter(carrier);
    else if (currentStep === 'toCustomer' && shop) setMapCenter(shop);
  }, [currentStep, carrier?.lat, carrier?.lng, shop?.lat, shop?.lng]);

  const canRenderMap = isLoaded && carrier && shop && customer;

  const routeOrigin = currentStep === 'toShop' ? carrier : shop;
  const routeDestination = currentStep === 'toShop' ? shop : customer;

  return (
    <div className="flex flex-col gap-2">
      {canRenderMap ? (
        <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={12}>
          <Marker position={carrier} title="You (Carrier)" />
          <Marker position={shop} title="Shop" />
          <Marker position={customer} title="Customer" />

          {!directions && (
            <DirectionsService
              options={{
                origin: routeOrigin,
                destination: routeDestination,
                travelMode: 'DRIVING',
                waypoints:
                  currentStep === 'toCustomer' ? [{ location: shop, stopover: true }] : [],
              }}
              callback={(result, status) => {
                if (status === 'OK' && result) setDirections(result);
                else if (status !== 'NOT_FOUND')
                  console.error(`Directions request failed: ${status}`);
              }}
            />
          )}

          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      ) : (
        <p>Loading map...</p>
      )}

      {/* Action Buttons */}
      {currentStep === 'toShop' ? (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
          onClick={() => setCurrentStep('toCustomer')}
        >
          Picked Up The Order
        </button>
      ) : (
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-2"
          onClick={() => {
            setShowOtpModal(true);
            sendOtp(selectedOrder?.Users?.email);
          }}
        >
          Complete Delivery (Verify OTP)
        </button>
      )}

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-xl font-semibold mb-4 text-center">Enter OTP</h2>
            {!otpSent ? (
              <p className="text-center">Sending OTP to {selectedOrder?.Users?.email}...</p>
            ) : (
              <>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="border p-2 rounded w-full mb-3 text-center text-black"
                />
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => verifyOtp(selectedOrder?.Users?.email)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setShowOtpModal(false)}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
