'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
// import L from 'leaflet'; // REMOVED: This causes the "window is not defined" error
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// REMOVED: This logic must move into useEffect to run on the client
// const defaultIcon = L.icon({ ... });
// L.Marker.prototype.options.icon = defaultIcon;

const containerStyle = {
  width: '100%',
  height: '180px', // smaller height
  borderRadius: '8px',
};

export default function OrderMapCard({ shopLocation, deliveryLocation, carrierLocation }) {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const LRef = useRef(null); // ADDED: To store the Leaflet instance

  const center = carrierLocation || shopLocation || deliveryLocation;

  useEffect(() => {
    // ADDED: Wrapper function to handle async import
    const initMap = async () => {
      if (!center || !mapRef.current) return;

      // ADDED: Dynamically import Leaflet only on the client side
      const L = (await import('leaflet')).default;
      LRef.current = L;

      // ADDED: Set up default icon inside client-side effect
      // This guard prevents it from being re-set on every render
      if (!L.Marker.prototype.options.icon) {
        const defaultIcon = L.icon({
          iconUrl: markerIcon.src, // FIXED: Use .src for static image imports
          iconRetinaUrl: markerIcon2x.src, // FIXED: Use .src
          shadowUrl: markerShadow.src, // FIXED: Use .src
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = defaultIcon;
      }

      // Project-specific icons from public/, build absolute URLs for reliability
      const asset = (path) => new URL(path, window.location.origin).href;
      const shopIcon = L.icon({ iconUrl: asset('/store.png'), iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });
      const deliveryIcon = L.icon({ iconUrl: asset('/destination.png'), iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });
      const carrierIcon = L.icon({ iconUrl: asset('/motorbike.png'), iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28] });

      // --- Existing Logic (unchanged) ---
      const centerLat = center.latitude || center.lat;
      const centerLng = center.longitude || center.long || center.lng;

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 13,
          zoomControl: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        mapInstanceRef.current = map;
      } else {
        mapInstanceRef.current.setView([centerLat, centerLng], 13);
      }

      const map = mapInstanceRef.current;

      // Clear previous markers
      Object.values(markersRef.current).forEach(m => map.removeLayer(m));
      markersRef.current = {};

      // Shop marker
      if (shopLocation) {
        const m = L.marker([shopLocation.latitude, shopLocation.longitude], { icon: shopIcon }).addTo(map);
        m.on('click', () => setSelectedMarker({ type: 'shop' }));
        markersRef.current.shop = m;
      }
      // Delivery marker
      if (deliveryLocation) {
        const m = L.marker([deliveryLocation.lat, deliveryLocation.long], { icon: deliveryIcon }).addTo(map);
        m.on('click', () => setSelectedMarker({ type: 'delivery' }));
        markersRef.current.delivery = m;
      }
      // Carrier marker
      if (carrierLocation) {
        const lat = carrierLocation.latitude || carrierLocation.lat;
        const lng = carrierLocation.longitude || carrierLocation.long || carrierLocation.lng;
        const m = L.marker([lat, lng], { icon: carrierIcon }).addTo(map);
        m.on('click', () => setSelectedMarker({ type: 'carrier' }));
        markersRef.current.carrier = m;
      }
    };

    initMap(); // Call the async function

    return () => {
      // do not destroy map instance between renders to keep performance
    };
  }, [center?.latitude, center?.lat, center?.longitude, center?.long, center?.lng, shopLocation?.latitude, shopLocation?.longitude, deliveryLocation?.lat, deliveryLocation?.long, carrierLocation?.latitude, carrierLocation?.lat, carrierLocation?.longitude, carrierLocation?.long, carrierLocation?.lng]);

  useEffect(() => {
    const L = LRef.current; // ADDED: Get L from ref
    if (!mapInstanceRef.current || !selectedMarker || !L) return; // ADDED: Guard for L
    
    const map = mapInstanceRef.current;
    let latlng;
    
    if (selectedMarker.type === 'shop' && shopLocation) latlng = L.latLng(shopLocation.latitude, shopLocation.longitude);
    else if (selectedMarker.type === 'delivery' && deliveryLocation) latlng = L.latLng(deliveryLocation.lat, deliveryLocation.long);
    else if (selectedMarker.type === 'carrier' && carrierLocation) latlng = L.latLng(carrierLocation.latitude || carrierLocation.lat, carrierLocation.longitude || carrierLocation.long || carrierLocation.lng);
    
    if (latlng) {
      L.popup().setLatLng(latlng).setContent(`<div>${selectedMarker.type === 'shop' ? 'Shop Location' : selectedMarker.type === 'delivery' ? 'Delivery Location' : 'Your Location'}</div>`).openOn(map);
    }
    
    return () => {
      // close popup on unmount/change
      if (map) {
          map.closePopup();
      }
    };
  }, [selectedMarker, shopLocation, deliveryLocation, carrierLocation]); // ADDED: Dependencies for locations used inside

  return <div style={containerStyle} ref={mapRef} />;
}