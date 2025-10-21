"use client";
import React from "react";
import { motion } from "framer-motion";

// Shutter-style loader overlay using theme CSS variables
export default function ShutterLoader({ open = false, panelCount = 5, onComplete }) {
  if (!open) return null;

  const panels = Array.from({ length: panelCount });

  const base = {
    initial: { y: "-100%" },
    animate: { y: "0%" },
    exit: { y: "100%" },
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
  };

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      role="status"
      className="fixed inset-0 z-[70] pointer-events-none"
      style={{
        // subtle backdrop using theme popover bg with alpha
        background: "color-mix(in oklab, var(--background) 86%, transparent)",
      }}
      onAnimationEnd={onComplete}
    >
      <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${panelCount}, 1fr)` }}>
        {panels.map((_, i) => {
          // Alternate accent hues for subtle interest, still matching theme
          const isAlt = i % 2 === 1;
          const delay = i * 0.04; // stagger
          return (
            <motion.div
              key={i}
              initial={base.initial}
              animate={base.animate}
              exit={base.exit}
              transition={{ ...base.transition, delay }}
              className="w-full h-full"
              style={{
                background: isAlt ? "var(--muted)" : "var(--card)",
                borderBottom: "1px solid var(--border)",
              }}
            />
          );
        })}
      </div>

      {/* Center brand tick for visual polish */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.08 }}
      >
        <div
          aria-hidden
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            background: "var(--primary)",
            boxShadow: "0 0 0 6px color-mix(in oklab, var(--primary) 24%, transparent)",
          }}
        />
      </motion.div>
    </div>
  );
}
