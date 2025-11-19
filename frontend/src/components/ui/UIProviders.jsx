"use client";
import React from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import RouteTransitionOverlay from "@/components/loaders/RouteTransitionOverlay";
import PageAnimator from "@/components/motion/PageAnimator";
import "@/lib/i18n";

export default function UIProviders({ children }) {
  return (
    <ThemeProvider>
      <RouteTransitionOverlay />
      <PageAnimator>
        {children}
      </PageAnimator>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
          },
          success: {
            iconTheme: { primary: "#10B981", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#fff" },
          },
        }}
      />
    </ThemeProvider>
  );
}
