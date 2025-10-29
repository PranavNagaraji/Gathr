'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter, useParams } from 'next/navigation';
import DeliveryRouteMap from '../../../../components/DeliveryRouteMap';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

export default function AssignedDeliveryDetail() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [order, setOrder] = useState(null);
  const [carrierLocation, setCarrierLocation] = useState(null);
  const socketRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const getChatKey = (oid) => (oid ? `chat_${oid}` : null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchOrders = async () => {
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/getOntheWay`,
          { clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = res.data.ShopsAndAddresses || [];
        const found = list.find((o) => String(o.id) === String(params.order_id));
        if (found) {
          setOrder(found);
          // Load chat memory
          const key = getChatKey(found.id);
          if (key && typeof window !== 'undefined') {
            try {
              const raw = localStorage.getItem(key);
              if (raw) setMessages(JSON.parse(raw));
            } catch (_) {}
          }
        }
        else toast.error('Order not found');
      } catch (err) {
        console.error(err);
      }
    };

    const getCarrierLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setCarrierLocation({ lat: latitude, lng: longitude });
          },
          () => {
            setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
          }
        );
      } else {
        setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
      }
    };

    fetchOrders();
    getCarrierLocation();
  }, [user, isLoaded, isSignedIn, params.order_id]);

  // Init socket once order is known
  useEffect(() => {
    if (!order || !API_URL) return;
    if (socketRef.current) return;
    const s = io(API_URL, { withCredentials: true, transports: ['websocket','polling'] });
    socketRef.current = s;
    s.emit('room:join', { orderId: order.id, role: 'carrier', name: user?.fullName || '' });
    s.on('chat:message', (msg) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
      if (!chatOpen) {
        toast.success('New message from customer');
        setChatOpen(true);
      }
    });
    return () => { s.disconnect(); socketRef.current = null; };
  }, [order?.id, API_URL]);

  // Persist chat memory per order in localStorage
  useEffect(() => {
    const key = getChatKey(order?.id);
    if (!key || typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(messages.slice(-200))); } catch (_) {}
  }, [messages, order?.id]);

  // Periodically publish carrier live location while on this page
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    let timerId;
    const pushLocation = async (lat, long) => {
      try {
        const token = await getToken();
        await axios.post(
          `${API_URL}/api/delivery/updateLocation`,
          { clerkId: user.id, lat, long },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (_) {}
      // Also emit via socket if available
      if (socketRef.current && order?.id) {
        socketRef.current.emit('location:update', { orderId: order.id, lat, long });
      }
    };
    const tick = () => {
      if (!('geolocation' in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCarrierLocation({ lat: latitude, lng: longitude });
          pushLocation(latitude, longitude);
        },
        () => {
          // ignore
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
      );
    };
    // fire immediately and then every 5s
    tick();
    timerId = window.setInterval(tick, 5000);
    return () => { if (timerId) window.clearInterval(timerId); };
  }, [isLoaded, isSignedIn, user, getToken, API_URL, order?.id]);

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text || !socketRef.current || !order) return;
    const msg = { orderId: order.id, from: 'carrier', text, name: user?.fullName || '' };
    socketRef.current.emit('chat:message', msg);
    setMessages((prev) => [...prev.slice(-199), { ...msg, ts: Date.now() }]);
    setChatInput('');
  };

  const handleComplete = async () => {
    if (!order) return;
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/delivery/completeDelivery`,
        { orderId: order.id, clerkId: user.id },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      toast.success(res.data.message || 'Delivery completed');
      // Clear chat memory for this order
      try { const key = getChatKey(order.id); if (key) localStorage.removeItem(key); } catch (_) {}
      router.push('/carrier/assignedDeliveries');
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Failed to complete delivery');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Delivery Route</h1>

        {!order && <p className="text-[var(--muted-foreground)]">Loading order...</p>}

        {order && carrierLocation && (
          <DeliveryRouteMap
            carrierLocation={carrierLocation}
            shopLocation={order.Shops.Location}
            deliveryLocation={order.Addresses.location}
            selectedOrder={order}
            onDeliveryComplete={handleComplete}
          />
        )}

        {order && (
          <div className="mt-4">
            <button onClick={() => setChatOpen((v)=>!v)} className="w-full md:w-auto px-4 py-2 rounded bg-neutral-900 text-white dark:bg-[var(--muted)] dark:text-[var(--muted-foreground)] hover:opacity-90">{chatOpen ? 'Hide' : 'Chat with customer'}</button>
            {chatOpen && (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
                <div className="max-h-64 overflow-y-auto p-3 flex flex-col gap-2">
                  {messages.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">Say hi to the customer.</p>}
                  {messages.map((m, i) => {
                    const me = m.from === 'carrier';
                    return (
                      <div key={i} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${me ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--muted)] text-[var(--foreground)]'}`}>{m.text}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 p-2 border-t border-[var(--border)]">
                  <input value={chatInput} onChange={(e)=>setChatInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter') sendMessage(); }} placeholder="Type a message" className="flex-1 bg-transparent px-3 py-2 rounded border border-[var(--border)] focus:outline-none" />
                  <button onClick={sendMessage} className="px-3 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">Send</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
