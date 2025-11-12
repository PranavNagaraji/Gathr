"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";

function Section({ title, children, id }) {
  return (
    <section id={id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { getToken } = useAuth();

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const [shopId, setShopId] = useState("");
  const [shopBan, setShopBan] = useState(true);
  const [shopReason, setShopReason] = useState("");

  const [carrierId, setCarrierId] = useState("");
  const [carrierBan, setCarrierBan] = useState(true);
  const [carrierReason, setCarrierReason] = useState("");

  const [userClerkId, setUserClerkId] = useState("");
  const [userBlock, setUserBlock] = useState(true);
  const [userReason, setUserReason] = useState("");

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const ok = localStorage.getItem("adminAuthed") === "true";
      if (!ok) {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
    } catch {
      router.replace("/admin/login");
    }
  }, [router]);

  const call = async (path, body) => {
    setNote("");
    try {
      setBusy(true);
      const token = await getToken();
      await axios.post(`${API_URL}${path}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNote("Action completed successfully.");
    } catch (e) {
      setNote(e?.response?.data?.message || e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          {note && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{note}</p>}
        </header>

        <div className="grid gap-6">
          <Section id="ban-shop" title="Ban / Unban Shop">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm">Shop ID</label>
                <input value={shopId} onChange={(e)=>setShopId(e.target.value)} placeholder="shop UUID" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Reason (optional)</label>
                <input value={shopReason} onChange={(e)=>setShopReason(e.target.value)} placeholder="Enter reason" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
              </div>
              <Toggle checked={shopBan} onChange={setShopBan} label={shopBan ? "Ban" : "Unban"} />
              <button disabled={!shopId || busy} onClick={() => call("/api/admin/banShop", { shopId, banned: shopBan, reason: shopReason })} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
                {busy ? "Working…" : shopBan ? "Ban Shop" : "Unban Shop"}
              </button>
            </div>
          </Section>

          <Section id="ban-carrier" title="Ban / Unban Carrier">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm">Carrier Clerk ID</label>
                <input value={carrierId} onChange={(e)=>setCarrierId(e.target.value)} placeholder="clerk_..." className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Reason (optional)</label>
                <input value={carrierReason} onChange={(e)=>setCarrierReason(e.target.value)} placeholder="Enter reason" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
              </div>
              <Toggle checked={carrierBan} onChange={setCarrierBan} label={carrierBan ? "Ban" : "Unban"} />
              <button disabled={!carrierId || busy} onClick={() => call("/api/admin/banCarrier", { clerkId: carrierId, banned: carrierBan, reason: carrierReason })} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
                {busy ? "Working…" : carrierBan ? "Ban Carrier" : "Unban Carrier"}
              </button>
            </div>
          </Section>

          <Section id="block-user" title="Block / Unblock User">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm">User Clerk ID</label>
                <input value={userClerkId} onChange={(e)=>setUserClerkId(e.target.value)} placeholder="clerk_..." className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Reason (optional)</label>
                <input value={userReason} onChange={(e)=>setUserReason(e.target.value)} placeholder="Enter reason" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
              </div>
              <Toggle checked={userBlock} onChange={setUserBlock} label={userBlock ? "Block" : "Unblock"} />
              <button disabled={!userClerkId || busy} onClick={() => call("/api/admin/blockUser", { clerkId: userClerkId, blocked: userBlock, reason: userReason })} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
                {busy ? "Working…" : userBlock ? "Block User" : "Unblock User"}
              </button>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
