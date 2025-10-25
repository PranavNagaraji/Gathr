'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import { useJsApiLoader } from '@react-google-maps/api';
import 'leaflet/dist/leaflet.css';

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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({ carrier: null, shop: null, customer: null });
  const routeLineRef = useRef(null);
  const LRef = useRef(null); // Leaflet module once loaded

  // OTP input helpers (UI-only, no logic changes)
  const inputsRef = useRef([]);
  const otpDigits = Array.from({ length: 6 }, (_, i) => otp[i] || '');

  const handleOtpChange = (index) => (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 1);
    const chars = otp.split('');
    chars[index] = val;
    const nextOtp = chars.join('').slice(0, 6);
    setOtp(nextOtp);
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index) => (e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = (text || '').replace(/\D/g, '').slice(0, 6);
    if (digits) {
      e.preventDefault();
      setOtp(digits);
      const lastIndex = Math.min(digits.length - 1, 5);
      inputsRef.current[lastIndex]?.focus();
    }
  };

  // Dynamically load Leaflet on client to avoid SSR window errors
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      if (LRef.current) return;
      const Lmod = (await import('leaflet')).default;
      LRef.current = Lmod;
      // Set a reasonable default icon config (shadow etc.)
      const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
      const defaultIcon = Lmod.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      Lmod.Marker.prototype.options.icon = defaultIcon;
    })();
  }, []);

  // Predefined colored pin icons (industry-standard look)
  const getPinIcons = () => {
    const L = LRef.current;
    if (!L) return {};
    // Use a reliable CDN for icons to avoid production fetch/CORS issues
    const base = 'https://unpkg.com/leaflet-color-markers@1.0.0/img';
    const shadowUrl = `${base}/marker-shadow.png`;
    return {
      blue: L.icon({
        iconUrl: `${base}/marker-icon-2x-blue.png`, shadowUrl, iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      }),
      red: L.icon({
        iconUrl: `${base}/marker-icon-2x-red.png`, shadowUrl, iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      }),
      green: L.icon({
        iconUrl: `${base}/marker-icon-2x-green.png`, shadowUrl, iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34], shadowSize: [41,41]
      }),
    };
  };

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

  const canRenderMap = (carrier && shop && customer);

  const routeOrigin = currentStep === 'toShop' ? carrier : shop;
  const routeDestination = currentStep === 'toShop' ? shop : customer;

  // Compute route via Google JS DirectionsService, render as Leaflet Polyline
  useEffect(() => {
    if (!isLoaded || !routeOrigin || !routeDestination) return;
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin: routeOrigin,
        destination: routeDestination,
        travelMode: 'DRIVING',
        waypoints: currentStep === 'toCustomer' ? [{ location: shop, stopover: true }] : [],
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
          const path = result.routes?.[0]?.overview_path || [];
          const coords = path.map((p) => [p.lat(), p.lng()]);
          // draw/update polyline on Leaflet map
          const L = LRef.current;
          if (mapInstanceRef.current && L) {
            if (routeLineRef.current) {
              routeLineRef.current.setLatLngs(coords);
            } else {
              routeLineRef.current = L.polyline(coords, { color: 'blue' }).addTo(mapInstanceRef.current);
            }
            mapInstanceRef.current.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
          }
        } else if (status !== 'NOT_FOUND') {
          console.error(`Directions request failed: ${status}`);
          if (routeLineRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(routeLineRef.current);
            routeLineRef.current = null;
          }
        }
      }
    );
  }, [isLoaded, currentStep, routeOrigin?.lat, routeOrigin?.lng, routeDestination?.lat, routeDestination?.lng]);

  // Initialize and update Leaflet map and markers
  useEffect(() => {
    const L = LRef.current;
    if (!canRenderMap || !L) return;
    const center = mapCenter || carrier || shop;
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: 12,
        zoomControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapInstanceRef.current = map;
    } else if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lng], 12);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Prepare industry-standard colored pin icons
    const { red: carrierIcon, blue: shopIcon, green: customerIcon } = getPinIcons();

    // carrier marker
    if (!markersRef.current.carrier) {
      const m = L.marker([carrier.lat, carrier.lng], { icon: carrierIcon }).addTo(map);
      m.bindPopup(`<div><strong>Carrier</strong><br/>Lat: ${carrier.lat.toFixed(5)}, Lng: ${carrier.lng.toFixed(5)}</div>`);
      m.bindTooltip('Carrier');
      markersRef.current.carrier = m;
    } else {
      markersRef.current.carrier.setLatLng([carrier.lat, carrier.lng]);
      markersRef.current.carrier.setIcon(carrierIcon);
    }
    // shop marker
    if (!markersRef.current.shop) {
      const m = L.marker([shop.lat, shop.lng], { icon: shopIcon }).addTo(map);
      m.bindPopup(`<div><strong>Shop</strong><br/>Lat: ${shop.lat.toFixed(5)}, Lng: ${shop.lng.toFixed(5)}</div>`);
      m.bindTooltip('Shop');
      markersRef.current.shop = m;
    } else {
      markersRef.current.shop.setLatLng([shop.lat, shop.lng]);
      markersRef.current.shop.setIcon(shopIcon);
    }
    // customer marker
    if (!markersRef.current.customer) {
      const m = L.marker([customer.lat, customer.lng], { icon: customerIcon }).addTo(map);
      const userLine = selectedOrder?.Users?.email ? `<br/>User: ${selectedOrder.Users.email}` : '';
      m.bindPopup(`<div><strong>Customer</strong>${userLine}<br/>Lat: ${customer.lat.toFixed(5)}, Lng: ${customer.lng.toFixed(5)}</div>`);
      m.bindTooltip('Customer');
      markersRef.current.customer = m;
    } else {
      markersRef.current.customer.setLatLng([customer.lat, customer.lng]);
      markersRef.current.customer.setIcon(customerIcon);
    }

    return () => {
      // keep map persistent
    };
  }, [canRenderMap, mapCenter?.lat, mapCenter?.lng, carrier?.lat, carrier?.lng, shop?.lat, shop?.lng, customer?.lat, customer?.lng]);

  return (
    <div className="flex flex-col gap-2">
      {canRenderMap ? (
        <div
          style={{ ...containerStyle, position: 'relative', zIndex: 0, pointerEvents: showOtpModal ? 'none' : 'auto' }}
          ref={mapRef}
        />
      ) : (
        <p>Loading map...</p>
      )}

      {/* Action Buttons */}
      {currentStep === 'toShop' ? (
        <button
          className="px-4 py-2 rounded mt-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
          onClick={() => setCurrentStep('toCustomer')}
        >
          Picked Up The Order
        </button>
      ) : (
        <button
          className="px-4 py-2 rounded mt-2 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[10000]">
          <div className="p-6 rounded-lg shadow-lg w-80 bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)]">
            <h2 className="text-xl font-semibold mb-4 text-center" style={{ color: 'var(--foreground)' }}>Enter OTP</h2>
            {!otpSent ? (
              <p className="text-center" style={{ color: 'var(--muted-foreground)' }}>Sending OTP to {selectedOrder?.Users?.email}...</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-3" onPaste={handleOtpPaste}>
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputsRef.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={d}
                      onChange={handleOtpChange(i)}
                      onKeyDown={handleOtpKeyDown(i)}
                      className="w-10 h-12 text-center rounded bg-transparent border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--ring)]"
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => verifyOtp(selectedOrder?.Users?.email)}
                    className="px-4 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setShowOtpModal(false)}
                    className="px-4 py-2 rounded bg-[var(--muted)] text-[var(--muted-foreground)] hover:opacity-90"
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
