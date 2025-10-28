'use client';

import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import UIProviders from "@/components/ui/UIProviders";
import Footer from "@/components/Footer";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }) {
  const pathname = usePathname();

  // Hide Navbar and Footer on auth pages
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up");

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <head>
          {/* Google Fonts */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Playfair+Display:wght@400;600;700;900&display=swap"
            rel="stylesheet"
          />
        </head>

        <body>
          <UIProviders>
            <Navbar />
            {children}
          </UIProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
