"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--border)] bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="Gathr" className="h-6 w-6" />
            <span className="font-semibold">Gathr</span>
          </div>
          <p className="text-sm text-white leading-6">
            Bringing local merchants, customers, and carriers together on a single, seamless platform.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Company</h3>
          <ul className="space-y-2 text-sm text-white">
            <li><Link className="hover:opacity-80" href="/about">About</Link></li>
            <li><Link className="hover:opacity-80" href="/">Shops</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Support</h3>
          <ul className="space-y-2 text-sm text-white">
            <li><Link className="hover:opacity-80" href="mailto:123cs0052@iitk.ac.in">123cs0052@iitk.ac.in</Link></li>
            <li><Link className="hover:opacity-80" href="mailto:123cs0058@iitk.ac.in">123cs0058@iitk.ac.in</Link></li>
            <li><Link className="hover:opacity-80" href="mailto:123cs0004@iitk.ac.in">123cs0004@iitk.ac.in</Link></li>
            <li><Link className="hover:opacity-80" href="mailto:123cs0011@iitk.ac.in">123cs0011@iitk.ac.in</Link></li>
          </ul>
        </div>
      </div>

      <div className="">
        <div className="max-w-6xl mx-auto py-1 flex flex-col md:flex-row items-center justify-center gap-4 text-xs text-[var(--muted-foreground)]">
          <p>© {new Date().getFullYear()} Gathr. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
