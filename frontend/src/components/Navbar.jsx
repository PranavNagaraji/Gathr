'use client';
import { SignOutButton, useUser } from "@clerk/nextjs";
import React, { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";

// --- Link configurations for different user roles ---
const merchantLinks = [
  { name: "Dashboard", href: "/merchant/dashboard" },
  { name: "Update Shop", href: "/merchant/updateShop" },
  { name: "Orders", href: "/merchant/orders" }
];

const customerLinks = [
  { name: "Home", href: "/" },
  { name: "Shops", href: "/customer/getShops" },
  { name: "Cart", href: "/customer/cart" },
  { name: "Orders", href: "/customer/orders" },
];

const carrierLinks = [
  { name: "Dashboard", href: "/carrier/dashboard" },
  { name: "Assigned Deliveries", href: "/carrier/deliveries" },
  { name: "Delivery History", href: "/carrier/history" },
];

export default function Navbar() {
  // --- State and Hooks ---
  const [menuOpen, setMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  // Framer Motion hooks for scroll progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // Clerk hook to get user data and role
  const { isSignedIn, user } = useUser();
  const profileImage = user?.imageUrl;
  const role = user?.publicMetadata?.role || "customer";

  // Dynamically select navigation links based on user role
  const navLinks =
    role === "merchant"
      ? merchantLinks
      : role === "carrier"
      ? carrierLinks
      : customerLinks;

  // Effect to close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>

      
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="sticky top-0 z-50 w-full border-b-[4px] border-[#ff3b3b] bg-[#f5e9e0] backdrop-blur-md"
        style={{ fontFamily: "'Neue Haas Grotesk Display Pro', 'Inter', sans-serif" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* LOGO */}
          <motion.a
            href="/"
            whileHover={{ scale: 1.05, rotate: -2 }}
            className="text-[1.8rem] font-black uppercase tracking-tighter text-[#111] hover:text-[#ff3b3b]"
          >
            gathr
          </motion.a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                whileHover={{
                  color: "#fff",
                  backgroundColor: "#ff3b3b",
                  borderRadius: "6px",
                  paddingInline: "12px",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className={`uppercase text-[0.9rem] font-semibold tracking-wide ${
                  pathname === link.href ? "text-[#ff3b3b]" : "text-[#111]"
                }`}
              >
                {link.name}
              </motion.a>
            ))}
          </div>

          {/* Right Side: Profile Dropdown or Join Us Button */}
          <div className="hidden md:flex items-center" ref={menuRef}>
            {isSignedIn ? (
              <div className="relative">
                <button onClick={() => setIsProfileOpen(!isProfileOpen)}>
                  <img
                    src={profileImage}
                    alt="User profile"
                    className="w-9 h-9 rounded-full border-2 border-[#111]/50 hover:border-[#ff3b3b] transition"
                  />
                </button>

                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-48 bg-[#f5e9e0] rounded-lg shadow-xl border border-black/10 overflow-hidden z-50"
                  >
                    <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#ff3b3b]/20">
                      Profile
                    </a>
                    <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#ff3b3b]/20">
                      Settings
                    </a>
                    <SignOutButton>
                      <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[#ff3b3b]/20 font-medium">
                        Sign Out
                      </button>
                    </SignOutButton>
                  </motion.div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push("/sign-in")}
                className="uppercase text-sm font-semibold border-2 border-[#111] px-5 py-1.5 rounded-full bg-[#ff3b3b] text-white hover:bg-[#111] transition"
              >
                Join Us
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-[#111]">
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="md:hidden flex flex-col bg-[#f8e9e2] border-t-4 border-[#ff3b3b] overflow-hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 px-6 text-[#111] font-semibold uppercase hover:bg-[#ff3b3b] hover:text-white transition"
              >
                {link.name}
              </a>
            ))}
            
            {/* Mobile Auth Links */}
            <div className="border-t border-[#ff3b3b]/30 mt-2 pt-2 px-6 pb-4">
              {isSignedIn ? (
                <>
                  <a href="/profile" className="block py-2 font-semibold text-gray-700 hover:text-[#ff3b3b]">Profile</a>
                  <SignOutButton>
                    <button className="w-full text-left py-2 font-semibold text-red-600 hover:text-[#ff3b3b]">
                      Sign Out
                    </button>
                  </SignOutButton>
                </>
              ) : (
                <button
                  onClick={() => { router.push("/sign-in"); setMenuOpen(false); }}
                  className="w-full mt-2 uppercase text-sm font-semibold border-2 border-[#111] px-5 py-1.5 rounded-full bg-[#ff3b3b] text-white hover:bg-[#111] transition"
                >
                  Join Us
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.nav>
    </>
  );
}