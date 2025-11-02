"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FadeIn({ as: Tag = "div", children, delay = 0, duration = 0.22, y = 0, once = true, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once }}
      exit={{ opacity: 0, y }}
      transition={{ duration, delay, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SlideUp({ children, delay = 0, duration = 0.26, y = 12, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y }}
      transition={{ duration, delay, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0, duration = 0.2, from = 0.96, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: from }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: from }}
      transition={{ duration, delay, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence };
