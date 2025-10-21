"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import ShutterLoader from "@/components/loaders/ShutterLoader";

export default function RouteTransitionOverlay({
  panelCount = 5,
  minShowMs = 420,
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const first = useRef(true);
  const timer = useRef(null);

  // Respect prefers-reduced-motion: don't show overlay if user prefers less motion
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;

    // Trigger shutter overlay for a short, polished duration
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), minShowMs);

    return () => clearTimeout(timer.current);
  }, [pathname, reduced, minShowMs]);

  return (
    <AnimatePresence>{open && <ShutterLoader open panelCount={panelCount} />}</AnimatePresence>
  );
}
