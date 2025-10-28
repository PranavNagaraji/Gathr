"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="Gathr" className="h-6 w-6" />
            <span className="font-semibold">Gathr</span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] leading-6">
            Bringing local merchants, customers, and carriers together on a single, seamless platform.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Company</h3>
          <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
            <li><Link className="hover:opacity-80" href="/about">About</Link></li>
            <li><Link className="hover:opacity-80" href="/">Careers</Link></li>
            <li><Link className="hover:opacity-80" href="/">Press</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Support</h3>
          <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
            <li><Link className="hover:opacity-80" href="/">Help Center</Link></li>
            <li><Link className="hover:opacity-80" href="/">Safety</Link></li>
            <li><a className="hover:opacity-80" href="mailto:support@gathr.app">Contact</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--muted-foreground)]">
          <p>© {new Date().getFullYear()} Gathr. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link className="hover:opacity-80" href="/">Terms</Link>
            <Link className="hover:opacity-80" href="/">Privacy</Link>
            <Link className="hover:opacity-80" href="/about">About</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
