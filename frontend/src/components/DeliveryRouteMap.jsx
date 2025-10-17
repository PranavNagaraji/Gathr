'use client';
import { useState, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
  Marker,
} from '@react-google-maps/api';
import { Truck, Store, User } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px',
};

// Utility to convert Lucide React component to SVG string
const lucideToSvgUrl = (Icon, color = 'black', size = 32) => {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${Icon().props.children
      .map((c) => c.props.d)
      .map((d) => `<path d="${d}"/>`)
      .join('')}</svg>`
  );
  return `data:image/svg+xml;charset=UTF-8,${svg}`;
};

export default function DeliveryRouteMap({
  carrierLocation,
  shopLocation,
  deliveryLocation,
  onDeliveryComplete,
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  const [directions, setDirections] = useState(null);
  const [currentStep, setCurrentStep] = useState('toShop'); // 'toShop' or 'toCustomer'
  const [mapCenter, setMapCenter] = useState(carrierLocation);

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

  // Reset directions on step change
  useEffect(() => setDirections(null), [currentStep]);

  // Update map center
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
          {/* Custom Lucide markers */}
          <Marker
            position={carrier}
            icon={{
              url: '/icons/truck.svg', // temporary: you can also generate a data URL
              scaledSize: new window.google.maps.Size(32, 32),
            }}
            title="You (Carrier)"
          />
          <Marker
            position={shop}
            icon={{
              url: '/icons/store.svg',
              scaledSize: new window.google.maps.Size(32, 32),
            }}
            title="Shop"
          />
          <Marker
            position={customer}
            icon={{
              url: '/icons/user.svg',
              scaledSize: new window.google.maps.Size(32, 32),
            }}
            title="Customer"
          />

          {!directions && (
            <DirectionsService
              options={{
                origin: routeOrigin,
                destination: routeDestination,
                travelMode: 'DRIVING',
                waypoints: currentStep === 'toCustomer' ? [{ location: shop, stopover: true }] : [],
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
          onClick={() => onDeliveryComplete && onDeliveryComplete()}
        >
          Complete Delivery (Verify OTP)
        </button>
      )}
    </div>
  );
}
