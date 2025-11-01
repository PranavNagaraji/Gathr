'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import OrderMapCard from '../../../components/OrdersMap';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

function CanvasBarChart({ labels = [], values = [], height = 140, color = undefined, grid = true }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const widthCss = Math.max(300, parent.clientWidth);
    const heightCss = height;
    canvas.width = Math.floor(widthCss * dpr);
    canvas.height = Math.floor(heightCss * dpr);
    canvas.style.width = widthCss + 'px';
    canvas.style.height = heightCss + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    let barColor = color;
    if (!barColor) {
      const tmp = document.createElement('div');
      tmp.style.background = 'var(--primary)';
      document.body.appendChild(tmp);
      barColor = getComputedStyle(tmp).backgroundColor || '#4f46e5';
      tmp.remove();
    }
    const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground') || 'rgba(0,0,0,0.5)';

    const padL = 28, padR = 12, padT = 12, padB = 22;
    const w = widthCss - padL - padR;
    const h = heightCss - padT - padB;

    ctx.clearRect(0, 0, widthCss, heightCss);

    const maxVal = Math.max(1, ...values);
    if (grid) {
      ctx.strokeStyle = 'rgba(127,127,127,0.18)';
      ctx.lineWidth = 1;
      const gridLines = 4;
      for (let i = 0; i <= gridLines; i++) {
        const y = padT + (h * i) / gridLines;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + w, y);
        ctx.stroke();
      }
    }

    const n = values.length || 1;
    const gap = 8;
    const bw = Math.max(6, (w - gap * (n - 1)) / n);
    ctx.fillStyle = barColor;
    for (let i = 0; i < n; i++) {
      const v = values[i] || 0;
      const x = padL + i * (bw + gap);
      const hh = Math.max(4, (v / maxVal) * h);
      const y = padT + h - hh;
      ctx.beginPath();
      ctx.roundRect(x, y, bw, hh, 4);
      ctx.fill();
    }

    ctx.fillStyle = axisColor.trim() || '#6b7280';
    ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i < n; i++) {
      const x = padL + i * (bw + gap) + bw / 2;
      ctx.fillText(String(labels[i] || ''), x, padT + h + 6);
    }
  }, [labels, values, height, color]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const c = canvasRef.current;
      if (!c) return;
      c.style.width = c.parentElement.clientWidth + 'px';
    });
    const parent = canvasRef.current?.parentElement;
    if (parent) ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  return <canvas ref={canvasRef} />;
}

export default function Dashboard() {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [carrierLocation, setCarrierLocation] = useState(null);
  const [assigned, setAssigned] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const fetchCarrier = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/api/delivery/getCarrier/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res?.data?.carrier?.delivery_details) {
          router.push('/carrier/createCarrier');
        }
      } catch (err) {
        console.log(err);
      }
    };

    const fetchOrders = async (latitude, longitude) => {
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/getDelivery`,
          {
            clerkId: user.id,
            lat: latitude,
            long: longitude
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data.ordersAndShop);
        console.log(res.data.ordersAndShop);
      } catch (err) {
        console.log(err);
      }
    };

    const fetchAssigned = async () => {
      try {
        const token = await getToken();
        const res = await axios.post(
          `${API_URL}/api/delivery/getOntheWay`,
          { clerkId: user.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAssigned(res.data.ShopsAndAddresses || []);
      } catch (err) {
        console.log(err);
      }
    };

    const fetchHistory = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(
          `${API_URL}/api/delivery/getAllOrders/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setHistory(res.data.ShopsAndAddresses || []);
      } catch (err) {
        console.log(err);
      }
    };

    const getUserLocationAndFetchOrders = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCarrierLocation({ lat: latitude, lng: longitude });
            fetchOrders(latitude, longitude);
          },
          () => {
            setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
            fetchOrders(15.750366871923427, 78.03934675615315);
          }
        );
      } else {
        setCarrierLocation({ lat: 15.750366871923427, lng: 78.03934675615315 });
        fetchOrders(15.750366871923427, 78.03934675615315);
      }
    };

    fetchCarrier();
    getUserLocationAndFetchOrders();
    fetchAssigned();
    fetchHistory();
  }, [user, isLoaded, isSignedIn]);

  const handleAcceptOrder = async (orderId) => {
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/api/delivery/acceptDelivery`, {
        clerkId: user.id,
        orderId: orderId
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
      )
      toast.success(res.data.message || 'Order accepted');
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
    } catch (err) {
      console.log(err);
      toast.error('Failed to accept order');
    }
  }

  const nearbyCount = orders?.length || 0;
  const assignedCount = assigned?.length || 0;
  const completedCount = history?.length || 0;
  const deliveredValue = useMemo(() => (history || []).reduce((s, o) => s + (Number(o?.amount_paid) || 0), 0), [history]);

  const deliveriesSeries = useMemo(() => {
    const map = new Map();
    for (const o of history || []) {
      const d = new Date(o?.created_at);
      if (isNaN(d)) continue;
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    }
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      days.push({ key, label, value: map.get(key) || 0 });
    }
    return days;
  }, [history]);

  return (
    <div className="p-4 bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-2xl font-bold mb-4">Delivery Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Nearby', value: String(nearbyCount) }, { label: 'Assigned', value: String(assignedCount) }, { label: 'Completed', value: String(completedCount) }, { label: 'Delivered Value', value: `₹${Math.round(deliveredValue).toLocaleString('en-IN')}` }].map((c) => (
          <div key={c.label} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="text-sm text-[var(--muted-foreground)]">{c.label}</div>
            <div className="mt-1 text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deliveries (7 days)</h2>
          <span className="text-xs text-[var(--muted-foreground)]">Count</span>
        </div>
        <div className="mt-3">
          <CanvasBarChart labels={deliveriesSeries.map(d=>d.label)} values={deliveriesSeries.map(d=>d.value)} height={160} />
        </div>
      </div>

      <motion.div className="grid gap-6 mt-6" role="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {orders.length ? (
          orders.map((order) => (
            <motion.div role="listitem" key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="border border-[var(--border)] rounded-lg shadow-sm p-3 bg-[var(--card)] text-[var(--card-foreground)] flex flex-col md:flex-row gap-4">
              {/* Left: Order & Details */}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Order ID: {order.id}</h2>
                </div>
                <p><strong>Amount:</strong> ₹{order.amount_paid}</p>

                <div>
                  <h3 className="font-semibold text-sm">Shop:</h3>
                  <p className="text-sm">{order.Shops.shop_name}</p>
                  <p className="text-sm">{order.Shops.address}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm">Delivery:</h3>
                  <p className="text-sm">{order.Addresses.title}</p>
                  <p className="text-sm">{order.Addresses.address}</p>
                </div>
              </div>

              {/* Right: Map */}
              <div className="w-full md:w-1/3 h-36">
                <OrderMapCard
                  shopLocation={order.Shops.Location}
                  deliveryLocation={order.Addresses.location}
                  carrierLocation={carrierLocation}
                />
              </div>
              <button className='p-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md hover:opacity-90' onClick={() => handleAcceptOrder(order.id)}>Accept</button>
            </motion.div>
          ))
        ) : (
          <div className="max-w-4xl mx-auto p-6">
            <div className="mt-6 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-2xl p-10 bg-[var(--card)]/40">
              <div className="w-24 h-24 rounded-full bg-[var(--muted)] flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-[var(--muted-foreground)]">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7h4l2 4h8l2-4h2M7 17h10M9 21h6" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold">No orders yet</h2>
              <p className="mt-2 text-[var(--muted-foreground)] max-w-md">New orders near you will appear here. Keep location enabled to get assignments.</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
