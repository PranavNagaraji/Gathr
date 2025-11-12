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

  // Search state
  const [searchUserTerm, setSearchUserTerm] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchShopTerm, setSearchShopTerm] = useState("");
  const [shopResults, setShopResults] = useState([]);
  const [searchingShops, setSearchingShops] = useState(false);

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
      const token = await getToken().catch(() => null);
      await axios.post(`${API_URL}${path}`, body, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-admin-email': 'admin@gmail.com',
        },
      });
      setNote("Action completed successfully.");
    } catch (e) {
      setNote(e?.response?.data?.message || e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const doSearchUsers = async () => {
    setNote("");
    const q = searchUserTerm.trim();
    if (!q) { setUserResults([]); return; }
    try {
      setSearchingUsers(true);
      const token = await getToken().catch(() => null);
      const res = await axios.get(`${API_URL}/api/admin/search/users`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-admin-email': 'admin@gmail.com',
        },
        params: { q },
      });
      setUserResults(Array.isArray(res?.data?.users) ? res.data.users : []);
    } catch (e) {
      setUserResults([]);
      setNote(e?.response?.data?.message || e?.message || "Failed to search users");
    } finally {
      setSearchingUsers(false);
    }
  };

  const doSearchShops = async () => {
    setNote("");
    const q = searchShopTerm.trim();
    if (!q) { setShopResults([]); return; }
    try {
      setSearchingShops(true);
      const token = await getToken().catch(() => null);
      const res = await axios.get(`${API_URL}/api/admin/search/shops`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-admin-email': 'admin@gmail.com',
        },
        params: { q },
      });
      setShopResults(Array.isArray(res?.data?.shops) ? res.data.shops : []);
    } catch (e) {
      setShopResults([]);
      setNote(e?.response?.data?.message || e?.message || "Failed to search shops");
    } finally {
      setSearchingShops(false);
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

          <Section id="search-users" title="Search Users">
            <div className="grid gap-3">
              <div className="flex gap-2 items-end">
                <div className="grow">
                  <label className="text-sm">Name or Email</label>
                  <input value={searchUserTerm} onChange={(e)=>setSearchUserTerm(e.target.value)} placeholder="Search users..." className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
                </div>
                <button disabled={searchingUsers} onClick={doSearchUsers} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">{searchingUsers ? 'Searching…' : 'Search'}</button>
              </div>
              <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-[var(--card)]">
                    <tr className="text-left">
                      <th className="p-2 border-b border-[var(--border)]">Name</th>
                      <th className="p-2 border-b border-[var(--border)]">Email</th>
                      <th className="p-2 border-b border-[var(--border)]">Clerk ID</th>
                      <th className="p-2 border-b border-[var(--border)]">User ID</th>
                      <th className="p-2 border-b border-[var(--border)]">Role</th>
                      <th className="p-2 border-b border-[var(--border)]">Flags</th>
                      <th className="p-2 border-b border-[var(--border)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userResults.length ? userResults.map((u) => (
                      <tr key={u.id} className="align-top">
                        <td className="p-2 border-b border-[var(--border)]">{[u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</td>
                        <td className="p-2 border-b border-[var(--border)]">{u.email || '-'}</td>
                        <td className="p-2 border-b border-[var(--border)] font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{u.clerk_id || '-'}</span>
                            {u.clerk_id && (
                              <button onClick={() => navigator.clipboard.writeText(u.clerk_id)} className="px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">Copy</button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-b border-[var(--border)] font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{u.id || '-'}</span>
                            {u.id && (
                              <button onClick={() => navigator.clipboard.writeText(u.id)} className="px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">Copy</button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-b border-[var(--border)] capitalize">{u.role || '-'}</td>
                        <td className="p-2 border-b border-[var(--border)] text-xs">
                          {u.blocked ? 'blocked ' : ''}
                          {u.shop_banned ? 'shop_banned ' : ''}
                          {u.carrier_banned ? 'carrier_banned' : ''}
                        </td>
                        <td className="p-2 border-b border-[var(--border)] space-x-2">
                          {u.clerk_id && (
                            <button onClick={() => call('/api/admin/blockUser', { clerkId: u.clerk_id, blocked: !u.blocked })} className="px-3 py-1 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs">
                              {u.blocked ? 'Unblock' : 'Block'}
                            </button>
                          )}
                          {u.role === 'carrier' && u.clerk_id && (
                            <button onClick={() => call('/api/admin/banCarrier', { clerkId: u.clerk_id, banned: !u.carrier_banned })} className="px-3 py-1 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs">
                              {u.carrier_banned ? 'Unban Carrier' : 'Ban Carrier'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="p-2" colSpan={7}>No results</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section id="search-shops" title="Search Shops">
            <div className="grid gap-3">
              <div className="flex gap-2 items-end">
                <div className="grow">
                  <label className="text-sm">Shop Name</label>
                  <input value={searchShopTerm} onChange={(e)=>setSearchShopTerm(e.target.value)} placeholder="Search shops..." className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
                </div>
                <button disabled={searchingShops} onClick={doSearchShops} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">{searchingShops ? 'Searching…' : 'Search'}</button>
              </div>
              <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-[var(--card)]">
                    <tr className="text-left">
                      <th className="p-2 border-b border-[var(--border)]">Shop</th>
                      <th className="p-2 border-b border-[var(--border)]">Owner</th>
                      <th className="p-2 border-b border-[var(--border)]">Owner Email</th>
                      <th className="p-2 border-b border-[var(--border)]">Owner Clerk ID</th>
                      <th className="p-2 border-b border-[var(--border)]">Shop ID</th>
                      <th className="p-2 border-b border-[var(--border)]">Flags</th>
                      <th className="p-2 border-b border-[var(--border)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shopResults.length ? shopResults.map((s) => (
                      <tr key={s.id} className="align-top">
                        <td className="p-2 border-b border-[var(--border)]">{s.shop_name}</td>
                        <td className="p-2 border-b border-[var(--border)]">{s.owner ? [s.owner.first_name, s.owner.last_name].filter(Boolean).join(' ') : '-'}</td>
                        <td className="p-2 border-b border-[var(--border)]">{s.owner?.email || '-'}</td>
                        <td className="p-2 border-b border-[var(--border)] font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{s.owner?.clerk_id || '-'}</span>
                            {s.owner?.clerk_id && (
                              <button onClick={() => navigator.clipboard.writeText(s.owner.clerk_id)} className="px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">Copy</button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-b border-[var(--border)] font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{s.id}</span>
                            <button onClick={() => navigator.clipboard.writeText(s.id)} className="px-2 py-0.5 rounded border border-[var(--border)] text-[10px]">Copy</button>
                          </div>
                        </td>
                        <td className="p-2 border-b border-[var(--border)] text-xs">{s.shop_banned ? 'shop_banned' : ''}</td>
                        <td className="p-2 border-b border-[var(--border)] space-x-2">
                          <button onClick={() => call('/api/admin/banShop', { shopId: s.id, banned: !s.shop_banned })} className="px-3 py-1 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs">
                            {s.shop_banned ? 'Unban Shop' : 'Ban Shop'}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td className="p-2" colSpan={6}>No results</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
