'use client';
import { useState } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '180px', // smaller height
  borderRadius: '8px',
};

export default function OrderMapCard({ shopLocation, deliveryLocation, carrierLocation }) {
  const [selectedMarker, setSelectedMarker] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  if (!isLoaded) return <p>Loading map...</p>;

  const center = carrierLocation || shopLocation || deliveryLocation;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
      {/* Shop Marker */}
      {shopLocation && (
        <Marker
          position={{ lat: shopLocation.latitude, lng: shopLocation.longitude }}
          onClick={() => setSelectedMarker({ type: 'shop' })}
          label="S"
          icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }}
        />
      )}

      {/* Delivery Marker */}
      {deliveryLocation && (
        <Marker
          position={{ lat: deliveryLocation.lat, lng: deliveryLocation.long }}
          onClick={() => setSelectedMarker({ type: 'delivery' })}
          label="D"
          icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
        />
      )}

      {/* Carrier Marker */}
      {carrierLocation && (
        <Marker
          position={carrierLocation}
          onClick={() => setSelectedMarker({ type: 'carrier' })}
          label="C"
          icon={{ url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }}
        />
      )}

      {/* InfoWindow */}
      {selectedMarker && (
        <InfoWindow
          position={
            selectedMarker.type === 'shop'
              ? { lat: shopLocation.latitude, lng: shopLocation.longitude }
              : selectedMarker.type === 'delivery'
              ? { lat: deliveryLocation.lat, lng: deliveryLocation.long }
              : carrierLocation
          }
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div>
            {selectedMarker.type === 'shop' && <p>Shop Location</p>}
            {selectedMarker.type === 'delivery' && <p>Delivery Location</p>}
            {selectedMarker.type === 'carrier' && <p>Your Location</p>}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
