"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";

export default function AdminComplaintsPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { getToken } = useAuth();

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const ok = localStorage.getItem("adminAuthed") === "true";
      if (!ok) { router.replace("/admin/login"); return; }
      setReady(true);
    } catch { router.replace("/admin/login"); }
  }, [router]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const token = await getToken().catch(() => null);
      const params = {};
      if (filter !== "all") params.status = filter;
      if (search.trim()) params.q = search.trim();
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await axios.get(`${API_URL}/api/complaints/list`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-admin-email': 'admin@gmail.com',
        },
        params,
      });
      setComplaints(Array.isArray(res?.data?.complaints) ? res.data.complaints : []);
    } catch (e) {
      setComplaints([]);
      setNote(e?.response?.data?.message || e?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ready) fetchComplaints(); }, [ready, filter]);

  const markResolved = async (id) => {
    try {
      setNote("");
      const token = await getToken().catch(() => null);
      await axios.patch(`${API_URL}/api/complaints/${id}/status`, { status: "resolved" }, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-admin-email': 'admin@gmail.com',
        },
      });
      await fetchComplaints();
      setNote("Marked as resolved");
    } catch (e) {
      setNote(e?.response?.data?.message || e?.message || "Failed to update status");
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Complaints</h1>
          {note && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{note}</p>}
        </header>

        <div className="mb-4 grid gap-2 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs">Status</label>
            <select value={filter} onChange={(e)=>setFilter(e.target.value)} className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--card)] text-sm">
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs">Search (name, email, clerk id, message)</label>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search..." className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--card)] text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs">From</label>
            <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--card)] text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs">To</label>
            <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--card)] text-sm" />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button onClick={fetchComplaints} className="px-3 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-sm">Apply</button>
            <button onClick={()=>{setFilter("all");setSearch("");setFrom("");setTo("");fetchComplaints();}} className="px-3 py-2 rounded-md border border-[var(--border)] text-sm">Reset</button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-[var(--card)]">
              <tr className="text-left">
                <th className="p-3 border-b border-[var(--border)]">ID</th>
                <th className="p-3 border-b border-[var(--border)]">Created</th>
                <th className="p-3 border-b border-[var(--border)]">User Clerk ID</th>
                <th className="p-3 border-b border-[var(--border)]">Name</th>
                <th className="p-3 border-b border-[var(--border)]">Email</th>
                <th className="p-3 border-b border-[var(--border)]">Message</th>
                <th className="p-3 border-b border-[var(--border)]">Status</th>
                <th className="p-3 border-b border-[var(--border)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={8}>Loading…</td></tr>
              ) : complaints.length ? (
                complaints.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="p-3 border-b border-[var(--border)]">{c.id}</td>
                    <td className="p-3 border-b border-[var(--border)]">{new Date(c.created_at).toLocaleString()}</td>
                    <td className="p-3 border-b border-[var(--border)] font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[180px]">{c.user_clerk_id || ""}</span>
                        {c.user_clerk_id && (
                          <button onClick={()=>navigator.clipboard.writeText(c.user_clerk_id)} className="px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">Copy</button>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-b border-[var(--border)]">{c.name || ""}</td>
                    <td className="p-3 border-b border-[var(--border)]">{c.email || ""}</td>
                    <td className="p-3 border-b border-[var(--border)] whitespace-pre-wrap max-w-[320px]">{c.message || ""}</td>
                    <td className="p-3 border-b border-[var(--border)] capitalize">{c.status || "open"}</td>
                    <td className="p-3 border-b border-[var(--border)]">
                      {String(c.status).toLowerCase() !== "resolved" && (
                        <button onClick={() => markResolved(c.id)} className="px-3 py-1 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs">Mark Resolved</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="p-3" colSpan={8}>No complaints found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
