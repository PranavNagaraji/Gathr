"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import axios from "axios";
import AnimatedButton from "@/components/ui/AnimatedButton";
import { motion, AnimatePresence } from "framer-motion";

// Lightweight canvas bar chart (no external deps)
function CanvasBarChart({ labels = [], values = [], height = 160, color = undefined, grid = true }) {
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
        canvas.style.width = widthCss + "px";
        canvas.style.height = heightCss + "px";
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        // Resolve theme color var(--primary) to actual color
        let barColor = color;
        if (!barColor) {
            const tmp = document.createElement('div');
            tmp.style.background = 'var(--primary)';
            document.body.appendChild(tmp);
            barColor = getComputedStyle(tmp).backgroundColor || '#4f46e5';
            tmp.remove();
        }
        const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground') || 'rgba(0,0,0,0.5)';

        // Padding and sizes
        const padL = 28, padR = 12, padT = 12, padB = 22;
        const w = widthCss - padL - padR;
        const h = heightCss - padT - padB;

        // Background
        ctx.clearRect(0, 0, widthCss, heightCss);

        // Grid
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

        // Bars
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

        // X labels
        ctx.fillStyle = axisColor.trim() || '#6b7280';
        ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i < n; i++) {
            const x = padL + i * (bw + gap) + bw / 2;
            ctx.fillText(String(labels[i] || ''), x, padT + h + 6);
        }
    }, [labels, values, height, color]);

    // Resize handler
    useEffect(() => {
        const ro = new ResizeObserver(() => {
            const c = canvasRef.current;
            if (!c) return;
            // retrigger draw by changing a state? Simpler: force reflow by toggling width style
            c.style.width = c.parentElement.clientWidth + 'px';
        });
        const parent = canvasRef.current?.parentElement;
        if (parent) ro.observe(parent);
        return () => ro.disconnect();
    }, []);

    return <canvas ref={canvasRef} />;
}

// Simple CSV exporter
function exportCSV(filename, headerRow, rows) {
    const esc = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [];
    if (headerRow && headerRow.length) lines.push(headerRow.map(esc).join(","));
    for (const r of rows) lines.push(r.map(esc).join(","));
    const csv = lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.style.display = "none";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function Dashboard() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [banInfo, setBanInfo] = useState({ banned: false, reason: null, loading: true });
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    // Items are fetched to power low-stock warnings and performance, not listed here
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [lowThreshold, setLowThreshold] = useState(5);

    useEffect(() => {
        const checkShop = async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            const token = await getToken();
            try {
                await axios.post(
                    `${API_URL}/api/merchant/check_shop_exists`,
                    { owner_id: user.id },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
            } catch (err) {
                console.error("Error checking shop:", err);
                router.push("/merchant/createShop");
            }
        };

        const getItems = async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            const token = await getToken();

            try {
                setLoading(true);
                const result = await axios.post(
                    `${API_URL}/api/merchant/get_items`,
                    { owner_id: user.id },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setItems(result.data.items);
            } catch (err) {
                console.log(`err: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        checkShop();
        getItems();
        // Fetch ALL orders for analytics (full history)
        (async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            try {
                setOrdersLoading(true);
                const token = await getToken();
                const pageSize = 500;
                let page = 1;
                const all = [];
                for (let i = 0; i < 100; i++) { // safety cap
                    const res = await axios.get(
                        `${API_URL}/api/merchant/get_all_carts/${user.id}?page=${page}&limit=${pageSize}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const arr = Array.isArray(res?.data?.carts) ? res.data.carts : [];
                    all.push(...arr);
                    if (arr.length < pageSize) break;
                    page += 1;
                }
                setOrders(all);
            } catch (e) {
                setOrders([]);
            } finally {
                setOrdersLoading(false);
            }
        })();
        // Fetch pending orders count for notification
        (async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            try {
                const token = await getToken();
                const res = await axios.get(
                    `${API_URL}/api/merchant/get_pending_carts/${user.id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setPendingCount(Array.isArray(res?.data?.carts) ? res.data.carts.length : 0);
            } catch {
                setPendingCount(0);
            }
        })();
        // Fetch ban status
        (async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            try {
                const token = await getToken();
                const res = await axios.get(`${API_URL}/api/merchant/banStatus/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBanInfo({ banned: !!res?.data?.banned, reason: res?.data?.reason || null, loading: false });
            } catch {
                setBanInfo((p) => ({ ...p, loading: false }));
            }
        })();
        // Load low stock threshold from local storage
        try {
            const v = Number(localStorage.getItem(`lowStockThreshold:${user?.id}`));
            if (!Number.isNaN(v) && v >= 0) setLowThreshold(v);
        } catch {}
    }, [isLoaded, isSignedIn, user, router, API_URL, getToken]);

    // Low-stock warnings
    const lowStockItems = useMemo(() => {
        const THRESHOLD = Number(lowThreshold) || 5;
        return (items || []).filter((it) => (Number(it?.quantity) || 0) <= THRESHOLD)
            .sort((a,b) => (a.quantity||0) - (b.quantity||0)).slice(0, 8);
    }, [items, lowThreshold]);

    // --- Analytics: compute from orders ---
    const paidOrders = useMemo(() => (orders || []).filter(o => (o?.payment_status || '').toLowerCase() === 'paid'), [orders]);
    const totalRevenue = useMemo(() => paidOrders.reduce((sum, o) => sum + (Number(o?.amount_paid) || 0), 0), [paidOrders]);
    const ordersCount = paidOrders.length;
    const aov = useMemo(() => (ordersCount ? totalRevenue / ordersCount : 0), [ordersCount, totalRevenue]);
    const itemsSold = useMemo(() => {
        let total = 0;
        for (const o of paidOrders) {
            const cartItems = o?.Cart?.Cart_items || [];
            for (const ci of cartItems) total += Number(ci?.quantity) || 0;
        }
        return total;
    }, [paidOrders]);
    // Revenue by date (YYYY-MM-DD)
    const revenueByDate = useMemo(() => {
        const map = new Map();
        for (const o of paidOrders) {
            const d = new Date(o?.created_at);
            if (isNaN(d)) continue;
            const key = d.toISOString().slice(0, 10);
            map.set(key, (map.get(key) || 0) + (Number(o?.amount_paid) || 0));
        }
        return map;
    }, [paidOrders]);
    // Last 7 days series
    const last7 = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            days.push({ key, label, value: revenueByDate.get(key) || 0 });
        }
        return days;
    }, [revenueByDate]);
    const maxVal = Math.max(1, ...last7.map(d => d.value));
    const [revenueRange, setRevenueRange] = useState('7d'); // '7d' | '30d' | 'all'
    const revenueSeries = useMemo(() => {
        if (!revenueByDate || revenueByDate.size === 0) return { labels: [], values: [] };
        const today = new Date();
        const buildLastNDays = (n) => {
            const out = [];
            for (let i = n - 1; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                out.push({ label, value: revenueByDate.get(key) || 0 });
            }
            return out;
        };
        if (revenueRange === '7d') {
            const s = buildLastNDays(7);
            return { labels: s.map(d=>d.label), values: s.map(d=>d.value) };
        }
        if (revenueRange === '30d') {
            const s = buildLastNDays(30);
            return { labels: s.map(d=>d.label), values: s.map(d=>d.value) };
        }
        // all time
        const all = Array.from(revenueByDate.entries()).sort((a,b)=> a[0].localeCompare(b[0]))
          .map(([key,val]) => ({ label: new Date(key).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }), value: val }));
        return { labels: all.map(d=>d.label), values: all.map(d=>d.value) };
    }, [revenueByDate, revenueRange]);
    const topItems = useMemo(() => {
        const map = new Map();
        for (const o of paidOrders) {
            const cartItems = o?.Cart?.Cart_items || [];
            for (const ci of cartItems) {
                const id = ci?.item_id || ci?.Items?.id || ci?.id;
                const name = ci?.Items?.name || 'Item';
                const qty = Number(ci?.quantity) || 0;
                const price = Number(ci?.Items?.price) || 0;
                const prev = map.get(id) || { name, qty: 0, revenue: 0 };
                prev.qty += qty;
                prev.revenue += qty * price;
                map.set(id, prev);
            }
        }
        return Array.from(map.values()).sort((a,b)=>b.revenue - a.revenue).slice(0,5);
    }, [paidOrders]);

    // Payment method distribution (paid orders)
    const paymentDistribution = useMemo(() => {
        const counts = new Map();
        let total = 0;
        for (const o of paidOrders) {
            const method = (o?.payment_method || 'other').toLowerCase();
            counts.set(method, (counts.get(method) || 0) + 1);
            total += 1;
        }
        return { total, entries: Array.from(counts.entries()) };
    }, [paidOrders]);

    // Order status distribution (all orders)
    const statusDistribution = useMemo(() => {
        const counts = new Map();
        let total = 0;
        for (const o of orders || []) {
            const status = (o?.status || 'pending').toLowerCase();
            counts.set(status, (counts.get(status) || 0) + 1);
            total += 1;
        }
        return { total, entries: Array.from(counts.entries()) };
    }, [orders]);

    // Orders over time (count) - 7 days (all orders)
    const ordersCountSeries = useMemo(() => {
        const map = new Map();
        for (const o of orders || []) {
            const d = new Date(o?.created_at);
            if (isNaN(d)) continue;
            const key = d.toISOString().slice(0,10);
            map.set(key, (map.get(key) || 0) + 1);
        }
        const days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0,10);
            const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            days.push({ key, label, value: map.get(key) || 0 });
        }
        return days;
    }, [orders]);
    const ordersMaxVal = Math.max(1, ...ordersCountSeries.map(d => d.value));

    // Top categories (by qty) from paid items
    const topCategories = useMemo(() => {
        const counts = new Map();
        for (const o of paidOrders) {
            const cartItems = o?.Cart?.Cart_items || [];
            for (const ci of cartItems) {
                const cats = Array.isArray(ci?.Items?.category) ? ci.Items.category : (ci?.Items?.category ? [ci.Items.category] : []);
                const qty = Number(ci?.quantity) || 0;
                for (const c of cats) counts.set(c, (counts.get(c) || 0) + qty);
            }
        }
        const arr = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6);
        const total = arr.reduce((s, [,v])=>s+v, 0) || 1;
        return { total, arr };
    }, [paidOrders]);

    // Out-of-stock soon predictions (based on recent 14-day sales velocity)
    const oosSoon = useMemo(() => {
        const periodDays = 14;
        const since = Date.now() - periodDays * 24 * 60 * 60 * 1000;
        const sold = new Map(); // itemId -> qty sold in period
        for (const o of paidOrders) {
            const ts = new Date(o?.created_at).getTime();
            if (!Number.isFinite(ts) || ts < since) continue;
            const list = o?.Cart?.Cart_items || [];
            for (const ci of list) {
                const id = ci?.item_id || ci?.Items?.id || ci?.id;
                const qty = Number(ci?.quantity) || 0;
                if (!id || qty <= 0) continue;
                sold.set(id, (sold.get(id) || 0) + qty);
            }
        }
        const predictions = [];
        for (const it of items || []) {
            const current = Number(it?.quantity) || 0;
            const past = Number(sold.get(it.id) || 0);
            const avgDaily = past / periodDays;
            if (avgDaily > 0) {
                const daysLeft = current / avgDaily;
                if (daysLeft <= 7) {
                    predictions.push({ id: it.id, name: it.name, quantity: current, daysLeft: Number(daysLeft.toFixed(1)) });
                }
            }
        }
        return predictions.sort((a,b) => a.daysLeft - b.daysLeft).slice(0, 8);
    }, [items, paidOrders]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center w-full min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8"
        >
            <div className="w-full max-w-7xl mx-auto">
                {banInfo.banned && (
                    <div className="mb-4 p-4 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--destructive),white_90%)] text-[var(--destructive)]">
                        <div className="font-semibold">Your shop is currently banned.</div>
                        {banInfo.reason && <div className="text-sm mt-1">Reason: {String(banInfo.reason)}</div>}
                        <a href="/about" className="inline-block mt-2 text-xs underline">Contact support</a>
                    </div>
                )}
                <div className="mt-12 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <motion.h1
                        className="text-3xl md:text-4xl font-bold tracking-tight"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        Merchant Dashboard
                    </motion.h1>
                    <AnimatedButton
                        as="button"
                        onClick={() => router.push("/merchant/addItem")}
                        size="lg"
                        rounded="lg"
                        variant="white"
                    >
                        + Add New Item
                    </AnimatedButton>
                </div>

                {/* Analytics Cards */}
                <motion.div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
                    {[
                        { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
                        { label: 'Orders', value: ordersLoading ? '…' : String(ordersCount) },
                        { label: 'AOV', value: `₹${aov.toFixed(0).toLocaleString('en-IN')}` },
                        { label: 'Items Sold', value: String(itemsSold) },
                    ].map((c) => (
                        <motion.div key={c.label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
                            <div className="text-sm text-[var(--muted-foreground)]">{c.label}</div>
                            <div className="mt-1 text-2xl font-bold">{c.value}</div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Performance with range selector */}
                <motion.div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.25 }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Performance</h2>
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-1 border border-[var(--border)] rounded-md overflow-hidden">
                                {['7d','30d','all'].map(r => (
                                  <button key={r} onClick={()=> setRevenueRange(r)} className={`text-xs px-2 py-1 ${revenueRange===r ? 'bg-[var(--muted)]' : ''}`}>{r.toUpperCase()}</button>
                                ))}
                            </div>
                            <button className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--muted)]" onClick={() => {
                                const allRows = Array.from(revenueByDate.entries())
                                  .sort((a,b) => a[0].localeCompare(b[0]))
                                  .map(([key, value]) => [new Date(key).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), value]);
                                exportCSV('revenue_all_history.csv', ['Date','Revenue'], allRows);
                            }}>Export CSV</button>
                            <span className="text-xs text-[var(--muted-foreground)]">Revenue</span>
                        </div>
                    </div>
                    <div className="mt-3">
                        <CanvasBarChart labels={revenueSeries.labels} values={revenueSeries.values} height={160} />
                    </div>
                    {topItems.length > 0 && (
                        <motion.div className="mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="text-sm text-[var(--muted-foreground)] mb-2">Top items</div>
                            <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
                                {topItems.map((it, idx) => (
                                    <motion.span key={`${it.name}-${idx}`} variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }} className="text-xs px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                                        {it.name} · {it.qty}
                                    </motion.span>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Bento Grid */}
                <motion.div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
                    {/* New Orders tile */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col justify-between lg:col-span-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold">New Orders</h3>
                            {pendingCount > 0 && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[color-mix(in_oklab,var(--success),white_85%)] text-[var(--success)]">{pendingCount} new</span>}
                        </div>
                        <div className="mt-2 text-4xl font-extrabold tracking-tight">{pendingCount}</div>
                        <div className="mt-3">
                            <AnimatedButton as="a" href="/merchant/orders" size="md" rounded="lg" variant="white">Review orders</AnimatedButton>
                        </div>
                    </motion.div>

                    {/* Best Performing Items */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Best Performing Items</h3>
                            <div className="flex items-center gap-3">
                                <button className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--muted)]" onClick={() => {
                                    const rows = topItems.map(it => [it.name, it.qty, Math.round(it.revenue)]);
                                    exportCSV('top_items.csv', ['Item','Qty','Revenue'], rows);
                                }}>Export CSV</button>
                                <span className="text-xs text-[var(--muted-foreground)]">Top 5 by revenue</span>
                            </div>
                        </div>
                        {topItems.length === 0 ? (
                            <p className="text-sm text=[var(--muted-foreground)]">Not enough data yet.</p>
                        ) : (
                            <ul className="divide-y divide-[var(--border)]">
                                {topItems.map((it, idx) => (
                                    <motion.li key={idx} className="flex items-center justify-between py-2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs w-6 h-6 grid place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{idx+1}</span>
                                            <span className="font-medium">{it.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-[var(--muted-foreground)]">Qty {it.qty}</span>
                                            <span className="font-semibold">₹{Math.round(it.revenue).toLocaleString('en-IN')}</span>
                                        </div>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </motion.div>

                    {/* Low Stock Warnings */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Low Stock</h3>
                            <span className="text-xs text-[var(--muted-foreground)]">≤ {Number(lowThreshold) || 5} units</span>
                        </div>
                        {lowStockItems.length === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)]">All good! No low-stock items.</p>
                        ) : (
                            <ul className="space-y-2">
                                {lowStockItems.map((it) => (
                                    <motion.li key={it.id} className="flex items-center justify-between text-sm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                                        <span className="truncate max-w-[60%]">{it.name}</span>
                                        <span className={`px-2 py-0.5 rounded-full border text-xs ${ (it.quantity||0) <= 2 ? 'bg-[color-mix(in_oklab,var(--destructive),white_85%)] text-[var(--destructive)]' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>Qty {it.quantity}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </motion.div>

                    {/* Out-of-stock Soon (prediction) */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Out-of-stock Soon</h3>
                            <span className="text-xs text-[var(--muted-foreground)]">Predicted ≤ 7 days</span>
                        </div>
                        {oosSoon.length === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)]">No items at risk.</p>
                        ) : (
                            <ul className="space-y-2">
                                {oosSoon.map((it) => (
                                    <motion.li key={it.id} className="flex items-center justify-between text-sm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                                        <span className="truncate max-w-[60%]">{it.name}</span>
                                        <span className="px-2 py-0.5 rounded-full border text-xs bg-[var(--muted)] text-[var(--muted-foreground)]">{it.daysLeft}d</span>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </motion.div>

                    {/* Payment Mix */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Payment Mix</h3>
                            <div className="flex items-center gap-3">
                                <button className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--muted)]" onClick={() => {
                                    const rows = paymentDistribution.entries.map(([k,v]) => [k, v, Math.round((v / paymentDistribution.total) * 100)]);
                                    exportCSV('payment_mix.csv', ['Method','Count','Percent'], rows);
                                }}>Export CSV</button>
                                <span className="text-xs text-[var(--muted-foreground)]">Paid orders</span>
                            </div>
                        </div>
                        {paymentDistribution.total === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)]">No completed payments yet.</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex w-full h-3 rounded-full overflow-hidden border border-[var(--border)]">
                                    {paymentDistribution.entries.map(([k, v], i) => {
                                        const pct = Math.round((v / paymentDistribution.total) * 100);
                                        const hues = ["var(--primary)", "oklch(75% 0.12 240)", "oklch(70% 0.1 180)", "oklch(80% 0.1 60)"];
                                        return <div key={k} style={{ width: `${pct}%`, background: hues[i % hues.length] }} />
                                    })}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs">
                                    {paymentDistribution.entries.map(([k, v], i) => {
                                        const pct = Math.round((v / paymentDistribution.total) * 100);
                                        return <span key={k} className="inline-flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ background: i % 4 === 0 ? 'var(--primary)' : i % 4 === 1 ? 'oklch(75% 0.12 240)' : i % 4 === 2 ? 'oklch(70% 0.1 180)' : 'oklch(80% 0.1 60)' }} />
                                            {k.toUpperCase()} {pct}%
                                        </span>
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Order Status Mix */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Order Status</h3>
                            <span className="text-xs text-[var(--muted-foreground)]">All orders</span>
                        </div>
                        {statusDistribution.total === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)]">No orders yet.</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex w-full h-3 rounded-full overflow-hidden border border-[var(--border)]">
                                    {statusDistribution.entries.map(([k, v], i) => {
                                        const pct = Math.round((v / statusDistribution.total) * 100);
                                        const hues = ["oklch(80% 0.1 280)", "oklch(70% 0.1 330)", "oklch(80% 0.1 120)", "oklch(80% 0.1 40)"];
                                        return <div key={k} style={{ width: `${pct}%`, background: hues[i % hues.length] }} />
                                    })}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs">
                                    {statusDistribution.entries.map(([k, v], i) => {
                                        const pct = Math.round((v / statusDistribution.total) * 100);
                                        return <span key={k} className="inline-flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ background: i % 4 === 0 ? 'oklch(80% 0.1 280)' : i % 4 === 1 ? 'oklch(70% 0.1 330)' : i % 4 === 2 ? 'oklch(80% 0.1 120)' : 'oklch(80% 0.1 40)' }} />
                                            {k.replace(/'/g,'').toUpperCase()} {pct}%
                                        </span>
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Orders over time (count) */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Orders over time</h3>
                            <span className="text-xs text-[var(--muted-foreground)]">Last 7 days</span>
                        </div>
                        <div className="mt-1">
                            <CanvasBarChart labels={ordersCountSeries.map(d=>d.label)} values={ordersCountSeries.map(d=>d.value)} height={140} />
                        </div>
                    </motion.div>

                    {/* Top categories */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold">Top categories</h3>
                            <div className="flex items-center gap-3">
                                <button className="text-xs px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--muted)]" onClick={() => {
                                    const rows = topCategories.arr.map(([cat, qty]) => [cat, qty, Math.round((qty / (topCategories.total || 1)) * 100)]);
                                    exportCSV('top_categories.csv', ['Category','Qty','Percent'], rows);
                                }}>Export CSV</button>
                                <span className="text-xs text-[var(--muted-foreground)]">By items sold</span>
                            </div>
                        </div>
                        {topCategories.arr.length === 0 ? (
                            <p className="text-sm text-[var(--muted-foreground)]">No category data yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {topCategories.arr.map(([cat, qty], i) => {
                                    const pct = Math.round((qty / topCategories.total) * 100);
                                    const hues = ["var(--primary)", "oklch(75% 0.12 240)", "oklch(70% 0.1 180)", "oklch(80% 0.1 60)", "oklch(80% 0.1 280)", "oklch(70% 0.1 330)"];
                                    return (
                                        <motion.div key={cat} className="flex items-center gap-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                                            <span className="w-16 text-xs truncate">{cat}</span>
                                            <div className="flex-1 h-2 rounded-full overflow-hidden border border-[var(--border)]">
                                                <div className="h-full" style={{ width: `${pct}%`, background: hues[i % hues.length] }} />
                                            </div>
                                            <span className="w-10 text-right text-xs">{pct}%</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </motion.div>

                {/* End Bento Grid */}
            </div>
        </motion.div>
    );
}

