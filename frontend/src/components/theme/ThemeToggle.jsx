"use client";
import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const effective = theme === "dark" ? "dark" : "light";

  const cycle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    // Force a full refresh so Navbar and global CSS variables update immediately
    if (typeof window !== "undefined") {
      setTimeout(() => window.location.reload(), 10);
    }
  };

  const label = `Toggle theme (current: ${effective})`;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm h-9 w-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] hover:bg-[var(--muted)] transition-colors"
    >
      {effective === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
