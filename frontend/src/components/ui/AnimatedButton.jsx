"use client";
import React from "react";
import { motion } from "framer-motion";

export default function AnimatedButton({
  as = "button",
  href,
  onClick,
  children,
  className = "",
  size = "md",
  rounded = "full",
  variant = "primary",
  disabled = false,
  type = "button",
  ariaLabel,
}) {
  const Comp = as === "a" ? "a" : "button";

  const paddings = size === "sm"
    ? "px-4 py-2 text-sm"
    : size === "lg"
    ? "px-8 py-3 text-lg"
    : "px-6 py-2.5 text-base";

  const rounding = rounded === "full" ? "rounded-full" : "rounded-lg";

  const variants = {
    primary:
      "bg-[var(--primary)] text-[var(--primary-foreground)]",
    outline:
      "bg-transparent text-[var(--foreground)] border border-[var(--border)]",
    muted:
      "bg-[var(--muted)] text-[var(--foreground)]",
  };

  const base = `group relative inline-flex items-center justify-center ${paddings} ${rounding} ${variants[variant]}
    font-semibold tracking-wide overflow-hidden transition-all duration-300 ${className}`;

  return (
    <motion.div
      whileHover={{ scale: 1.07, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 250 }}
      className="inline-block"
   >
      <Comp
        href={href}
        onClick={onClick}
        className={base}
        disabled={disabled}
        type={as === "button" ? type : undefined}
        aria-label={ariaLabel}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out bg-[var(--foreground)]/10 dark:bg-[var(--foreground)]/20" />
        <span className="relative z-10">{children}</span>
      </Comp>
    </motion.div>
  );
}
