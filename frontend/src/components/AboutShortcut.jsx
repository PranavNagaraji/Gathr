"use client";

import Link from "next/link";

export default function AboutShortcut() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href="/about"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm hover:shadow transition-shadow"
        title="About & Contact"
      >
        <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
        <span className="text-sm font-medium">About</span>
      </Link>
    </div>
  );
}
