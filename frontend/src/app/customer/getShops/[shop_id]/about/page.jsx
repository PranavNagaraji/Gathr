"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function ShopAboutPage() {
  const { shop_id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop_id) return;
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/customer/getShop/${shop_id}`);
        if (!cancelled) setShop(res?.data?.shop || null);
      } catch (e) {
        if (!cancelled) setShop(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [shop_id, API_URL]);

  const getShopImageUrl = (s) => {
    if (!s) return "/placeholder.png";
    return (
      s.banner?.url || s.banner ||
      s.cover?.url || s.cover ||
      s.image?.url || s.image ||
      s.logo?.url || s.logo || s.logo_url ||
      s.image_url || s.thumbnail ||
      (Array.isArray(s.images) && (s.images[0]?.url || s.images[0])) ||
      "/placeholder.png"
    );
  };

  const lat = shop?.Location?.latitude || shop?.Location?.Latitude || shop?.location?.latitude;
  const lng = shop?.Location?.longitude || shop?.Location?.Longitude || shop?.location?.longitude;
  const hasCoords = lat != null && lng != null && `${lat}` !== "" && `${lng}` !== "";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-6 sm:px-10 lg:px-20 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-extrabold text-3xl sm:text-4xl tracking-tight">Shop Details</h1>
          <Link href={`/customer/getShops/${shop_id}`} className="px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50">Back to items</Link>
        </div>

        {/* Hero image */}
        {!loading && shop && (
          <div className="rounded-2xl overflow-hidden border border-[var(--border)] mb-6">
            <div className="relative h-44 sm:h-56 md:h-64">
              <img src={getShopImageUrl(shop)} alt={shop.shop_name || 'Shop'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        )}

        <div className="bg-[var(--card)] text-[var(--card-foreground)] p-6 rounded-2xl shadow-sm border border-[var(--border)]">
          {loading ? (
            <div className="animate-pulse space-y-5">
              <div>
                <div className="h-8 w-48 bg-[var(--muted)] rounded" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="h-6 w-20 bg-[var(--muted)] rounded-full" />
                  <div className="h-6 w-16 bg-[var(--muted)] rounded-full" />
                  <div className="h-6 w-24 bg-[var(--muted)] rounded-full" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-[var(--muted)] rounded" />
                  <div className="h-5 w-3/4 bg-[var(--muted)] rounded" />
                  <div className="h-4 w-20 bg-[var(--muted)] rounded" />
                  <div className="h-5 w-1/2 bg-[var(--muted)] rounded" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-[var(--muted)] rounded" />
                  <div className="h-5 w-1/2 bg-[var(--muted)] rounded" />
                  <div className="h-4 w-28 bg-[var(--muted)] rounded" />
                  <div className="h-5 w-1/3 bg-[var(--muted)] rounded" />
                </div>
              </div>
              <div>
                <div className="h-4 w-24 bg-[var(--muted)] rounded mb-2" />
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--muted)] h-72" />
              </div>
            </div>
          ) : shop ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">{shop.shop_name}</h2>
                {shop.category && Array.isArray(shop.category) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {shop.category.map((c, i) => (
                      <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">{c}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-[var(--muted-foreground)]">Address</div>
                    <div className="font-medium break-words">{shop.address || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[var(--muted-foreground)]">Phone</div>
                    <div className="font-medium">{shop.mobile_no || shop.contact || "-"}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-[var(--muted-foreground)]">UPI ID</div>
                    <div className="font-medium">{shop.upi_id || "-"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[var(--muted-foreground)]">Account No.</div>
                    <div className="font-medium">{shop.account_no || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="text-sm text-[var(--muted-foreground)] mb-2">Location</div>
                <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--muted)]">
                  {hasCoords ? (
                    <iframe
                      title="Shop Location"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&z=15&output=embed`}
                      className="w-full h-72"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="h-72 grid place-items-center text-[var(--muted-foreground)]">Location not available</div>
                  )}
                </div>
                {hasCoords && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  >
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[var(--muted-foreground)]">Shop information unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
