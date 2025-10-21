'use client';
import { SignOutButton, useUser } from "@clerk/nextjs";
import React, { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import { Home, ShoppingCart, } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

// --- Link configurations for different user roles ---
const merchantLinks = [
  { name: "Inventory", href: "/merchant/dashboard" },
  { name: "Update Shop", href: "/merchant/updateShop" },
  { name: "New Orders", href: "/merchant/orders" },
  { name: "All Orders", href: "/merchant/allOrders" }

];

const customerLinks = [
  { name: "Home", href: "/" },
  { name: "Shops", href: "/customer/getShops" },
  { name: "Cart", href: "/customer/cart" },
  { name: "Orders", href: "/customer/orders" },
];

const carrierLinks = [
  { name: "Dashboard", href: "/carrier/dashboard" },
  { name: "Assigned Deliveries", href: "/carrier/assignedDeliveries" },
  { name: "Delivery History", href: "/carrier/deliveryHistory" },
  { name: "Update Profile", href: "/carrier/updateProfile" },
];

const links = [
  { name: "Home", href: "/" },
  { name: "Shops", href: "/customer/getShops" },
  { name: "contact", href: "/customer/orders" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  const { isSignedIn, user } = useUser();
  const profileImage = user?.imageUrl;
  const role = user?.publicMetadata?.role;

  const navLinks =
    role === "merchant"
      ? merchantLinks
      : role === "carrier"
        ? carrierLinks
        : role === "customer"
          ? customerLinks
          : links;

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
      {/* Scroll Progress Bar */}
      {/* <motion.div
        className="fixed top-0 left-0 right-0 h-[1px] bg-[#F15B3B] origin-left z-[60]"
        style={{ scaleX }}
      /> */}

      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="sticky top-0 z-50 w-full bg-[var(--card)] text-[var(--foreground)] shadow-[0_6px_20px_rgba(0,0,0,0.1)] backdrop-blur supports-[backdrop-filter]:bg-[color:var(--card)/0.85]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 relative">

          {/* LOGO */}
          <motion.a
            href="/"
            aria-label="Gathr Home"
            whileHover={{
              rotate: [-3, 3, -2, 2, 0],
              transition: { duration: 0.6 },
            }}
            className="text-[1.8rem] font-black uppercase tracking-tighter text-[var(--foreground)] hover:text-[var(--primary)] relative"
          >
            <motion.span
              className="absolute -bottom-1 left-0 h-[3px] bg-[var(--primary)] rounded-full"
              initial={{ width: 0 }}
              whileHover={{ width: "100%" }}
              transition={{ duration: 0.4 }}
            />
            G<span className="">athr</span>
          </motion.a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                whileHover={{
                  color: "var(--primary-foreground)",
                  backgroundColor: "var(--primary)",
                  borderRadius: "9999px",
                  scale: 1.05,
                }}
                transition={{
                  backgroundColor: { duration: 0.25, ease: "easeInOut" },
                  color: { duration: 0.25, ease: "easeInOut" },
                  scale: { type: "spring", stiffness: 260, damping: 15 },
                }}
                className={`uppercase px-3 py-1 text-[0.9rem] font-semibold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] transition-colors duration-200 ${pathname === link.href ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                  }`}
              >
                {link.name}
              </motion.a>
            ))}
          </div>

          {/* Right Side Profile / Join */}
          <div className="hidden md:flex items-center" ref={menuRef}>
            {isSignedIn ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 2 }}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                >
                  <img
                    src={profileImage}
                    alt="User"
                    className="w-9 h-9 rounded-full border-2 border-[color:var(--border)] hover:border-[color:var(--primary)] transition-all"
                  />
                </motion.button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="absolute right-0 mt-3 w-48 bg-[var(--popover)] text-[var(--popover-foreground)] rounded-xl shadow-lg border border-[var(--border)] overflow-hidden z-50"
                    >
                      <a href="/profile" className="block px-4 py-2 text-sm hover:bg-[var(--accent)]/40">
                        Profile
                      </a>
                      <a href="/settings" className="block px-4 py-2 text-sm hover:bg-[var(--accent)]/40">
                        Settings
                      </a>
                      <SignOutButton>
                        <button className="w-full text-left px-4 py-2 text-sm text-[var(--primary)] hover:bg-[var(--accent)]/40 font-medium">
                          Sign Out
                        </button>
                      </SignOutButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                onClick={() => router.push("/sign-in")}
                className="uppercase text-sm font-semibold border-2 border-[var(--border)] px-5 py-1.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Join Us
              </motion.button>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobileMenu"
              initial={{ height: 0, opacity: 0, y: -20, filter: "blur(6px)" }}
              animate={{ height: "auto", opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ height: 0, opacity: 0, y: -20, filter: "blur(6px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="md:hidden flex flex-col bg-[var(--card)] border-t border-[var(--border)] overflow-hidden shadow-lg"
            >
              {navLinks.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  whileHover={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)", x: 4 }}
                  className="py-3 px-6 text-[var(--foreground)] font-semibold uppercase tracking-wide"
                >
                  {link.name}
                </motion.a>
              ))}

              <div className="border-t border-[#F15B3B]/30 mt-2 pt-2 px-6 pb-4">
                {isSignedIn ? (
                  <>
                    <a href="/profile" className="block py-2 font-semibold hover:text-[var(--primary)]">Profile</a>
                    <SignOutButton>
                      <button className="w-full text-left py-2 font-semibold text-[var(--primary)] hover:opacity-90">
                        Sign Out
                      </button>
                    </SignOutButton>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ backgroundColor: "var(--muted)", color: "var(--foreground)", scale: 1.05 }}
                    onClick={() => { router.push("/sign-in"); setMenuOpen(false); }}
                    className="w-full mt-2 uppercase text-sm font-semibold border-2 border-[var(--border)] px-5 py-1.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] transition"
                  >
                    Join Us
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
