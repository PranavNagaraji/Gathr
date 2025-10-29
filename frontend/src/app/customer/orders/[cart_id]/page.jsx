'use client'
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import 'leaflet/dist/leaflet.css';

const CartItems = () => {
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [items, setItems] = useState([]);
  const { cart_id } = useParams();
  const [loading, setLoading] = useState(true);

  // Live tracking state
  const [order, setOrder] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null); // {lat,lng}
  const LRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const socketRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const routeLineRef = useRef(null);
  const [etaInfo, setEtaInfo] = useState(null);

  // Dynamically load Leaflet once on client
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || LRef.current) return;
      try {
        const Lmod = (await import('leaflet')).default;
        LRef.current = Lmod;
        // Set default icon from CDN to avoid bundling asset paths
        const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
        const defaultIcon = Lmod.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          shadowUrl,
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });
        Lmod.Marker.prototype.options.icon = defaultIcon;
      } catch (_) {}
    })();
  }, []);

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

  // Fetch order (for status + carrier info)
  useEffect(() => {
    const fetchOrder = async () => {
      if (!isLoaded || !isSignedIn || !user) return;
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/customer/orders/getByCart`,
          { cartId: cart_id, clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const ord = res?.data?.order || null;
        setOrder(ord);
        const loc = ord?.Users?.delivery_details?.current_location;
        if (loc && (loc.lat != null) && (loc.long != null)) {
          setDriverLoc({ lat: Number(loc.lat), lng: Number(loc.long) });
        }
      } catch (_) {}
    };
    fetchOrder();
  }, [isLoaded, isSignedIn, user, cart_id, getToken, API_URL]);

  // Realtime via Socket.IO when ontheway
  useEffect(() => {
    if (!order || !API_URL) return;
    const status = String(order.status || '').toLowerCase();
    if (status !== 'ontheway') return;
    if (socketRef.current) return;
    const s = io(API_URL, { withCredentials: true, transports: ["websocket","polling"] });
    socketRef.current = s;
    s.emit("room:join", { orderId: order.id, role: "customer", name: user?.fullName || user?.firstName || "" });
    s.on("location:update", ({ lat, long }) => {
      if (lat != null && long != null) setDriverLoc({ lat: Number(lat), lng: Number(long) });
    });
    s.on("chat:message", (msg) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [order?.id, order?.status, API_URL]);

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || !socketRef.current || !order) return;
    const msg = { orderId: order.id, from: 'customer', text, name: user?.fullName || '' };
    socketRef.current.emit('chat:message', msg);
    setMessages((prev) => [...prev.slice(-199), { ...msg, ts: Date.now() }]);
    setChatInput('');
  };

  // Initialize and update Leaflet map for live driver location (customer view)
  useEffect(() => {
    const L = LRef.current;
    if (!L) return;
    if (!order) return;
    const dest = order?.Addresses?.location || {};
    const destLat = Number(dest.lat ?? dest.latitude);
    const destLng = Number(dest.long ?? dest.longitude);
    if (Number.isNaN(destLat) || Number.isNaN(destLng)) return;

    const center = driverLoc || { lat: destLat, lng: destLng };
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current, { center: [center.lat, center.lng], zoom: 13 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      mapInstanceRef.current = map;
    } else if (mapInstanceRef.current) {
      const z = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setView([center.lat, center.lng], z);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // PNG marker icons
    const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
    const pngIcon = (path) => L.icon({ iconUrl: path, shadowUrl, iconSize: [32,32], iconAnchor: [16,32], popupAnchor: [0,-28], shadowSize: [41,41] });
    const destIcon = pngIcon('/destination.png');
    const driverIcon = pngIcon('/motorbike.png');

    // Destination marker
    if (!destMarkerRef.current) {
      destMarkerRef.current = L.marker([destLat, destLng], { icon: destIcon }).addTo(map).bindTooltip('Delivery address');
    } else {
      destMarkerRef.current.setLatLng([destLat, destLng]);
    }
    // Driver marker
    if (driverLoc) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driverLoc.lat, driverLoc.lng], { icon: driverIcon }).addTo(map).bindTooltip('Delivery partner');
      } else {
        driverMarkerRef.current.setLatLng([driverLoc.lat, driverLoc.lng]);
      }
    }
  }, [LRef.current, order?.Addresses?.location, driverLoc?.lat, driverLoc?.lng]);

  useEffect(() => {
    const L = LRef.current;
    if (!L) return;
    if (!order) return;
    const dest = order?.Addresses?.location || {};
    const destLat = Number(dest.lat ?? dest.latitude);
    const destLng = Number(dest.long ?? dest.longitude);
    if (!driverLoc || Number.isNaN(destLat) || Number.isNaN(destLng)) return;
    const url = `https://router.project-osrm.org/route/v1/driving/${driverLoc.lng},${driverLoc.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const route = data?.routes?.[0];
        if (!route) return;
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const map = mapInstanceRef.current;
        if (!map) return;
        if (routeLineRef.current) {
          routeLineRef.current.setLatLngs(coords);
        } else {
          routeLineRef.current = L.polyline(coords, { color: '#2563eb', weight: 4 }).addTo(map);
        }
        const km = (route.distance || 0) / 1000;
        const min = Math.ceil((route.duration || 0) / 60);
        setEtaInfo({ km: Number(km.toFixed(1)), min });
      })
      .catch(() => {});
  }, [driverLoc?.lat, driverLoc?.lng, order?.Addresses?.location]);

  if (loading) return <div className="text-center mt-10 text-[var(--muted-foreground)]">Loading items...</div>;

  if (!items.length)
    return <div className="text-center mt-10 text-[var(--muted-foreground)]">No items in this cart.</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Delivery status and live tracking */}
      {order && (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Order #{String(order.id).slice(-6).toUpperCase()}</h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Placed on {new Date(order.created_at).toLocaleString()}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 capitalize">{order.status?.replace(/'/g,'') || 'pending'}</span>
          </div>

          {String(order.status || '').toLowerCase() === 'ontheway' ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 flex items-center gap-3">
                <img src={order.Users?.delivery_details?.profile?.url || '/avatar.png'} alt="Delivery partner" className="w-12 h-12 rounded-full object-cover border border-[var(--border)]" />
                <div className="text-sm">
                  <p className="font-medium leading-tight">{[order.Users?.first_name, order.Users?.last_name].filter(Boolean).join(' ') || 'Delivery Partner'}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{order.Users?.delivery_details?.phone || 'Phone N/A'}</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <div ref={mapRef} className="w-full h-64 rounded-lg border border-[var(--border)]" />
              </div>
              {etaInfo && (
                <div className="md:col-span-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="px-2 py-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">ETA ~ {etaInfo.min} min</span>
                  <span className="px-2 py-1 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">Distance {etaInfo.km} km</span>
                </div>
              )}
              <div className="md:col-span-3">
                <button onClick={() => setChatOpen((v) => !v)} className="w-full md:w-auto px-4 py-2 rounded bg-[var(--muted)] text-[var(--muted-foreground)] hover:opacity-90">{chatOpen ? 'Hide' : 'Chat with delivery partner'}</button>
                {chatOpen && (
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                    <div className="max-h-64 overflow-y-auto p-3 flex flex-col gap-2">
                      {messages.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">Say hi to your delivery partner.</p>}
                      {messages.map((m, i) => {
                        const me = m.from === 'customer';
                        return (
                          <div key={i} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${me ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--muted)] text-[var(--foreground)]'}`}> {m.text} </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 p-2 border-t border-[var(--border)]">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') sendMessage(); }} placeholder="Type a message" className="flex-1 bg-transparent px-3 py-2 rounded border border-[var(--border)] focus:outline-none" />
                      <button onClick={sendMessage} className="px-3 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">Send</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">Delivery partner will appear here once the order is on the way.</p>
          )}
        </div>
      )}
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
