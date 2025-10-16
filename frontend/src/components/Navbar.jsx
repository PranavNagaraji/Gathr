'use client';
import { SignOutButton, useUser } from "@clerk/nextjs";
import React, { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";
import { Home, ShoppingCart,  } from "lucide-react";

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
  const role = user?.publicMetadata?.role || "customer";

  const navLinks =
    role === "merchant"
      ? merchantLinks
      : role === "carrier"
      ? carrierLinks
      : customerLinks;

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
        className="sticky top-0 z-50 w-full bg-[#3C2F2F] text-[#F4ECE6]  shadow-[0_6px_20px_rgba(0,0,0,0.1)]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3 relative">
          
          {/* LOGO */}
          <motion.a
            href="/"
            whileHover={{
              rotate: [-3, 3, -2, 2, 0],
              transition: { duration: 0.6 },
            }}
            className="text-[1.8rem] font-black uppercase tracking-tighter text-[#F4ECE6] text-[#F15B3B] hover:text-[#F15B3B] relative"
          >
            <motion.span
              className="absolute -bottom-1 left-0 h-[3px] bg-[#F15B3B] text-[#F15B3B] rounded-full"
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
                  color: "#FFFFFF",
                  backgroundColor: "#F15B3B",
                  borderRadius: "9999px",
                  scale: 1.05,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                className={`uppercase px-3 py-1 text-[0.9rem] font-semibold tracking-wide ${
                  pathname === link.href ? "text-[#F15B3B]" : "text-[#F4ECE6]"
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
                >
                  <img
                    src={profileImage}
                    alt="User"
                    className="w-9 h-9 rounded-full border-2 border-[#F4ECE6]/70 hover:border-[#F15B3B] transition-all"
                  />
                </motion.button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="absolute right-0 mt-3 w-48 bg-[#F4ECE6] rounded-xl shadow-lg border border-[#3C2F2F]/10 overflow-hidden z-50"
                    >
                      <a href="/profile" className="block px-4 py-2 text-sm text-[#3C2F2F] hover:bg-[#F15B3B]/20">
                        Profile
                      </a>
                      <a href="/settings" className="block px-4 py-2 text-sm text-[#3C2F2F] hover:bg-[#F15B3B]/20">
                        Settings
                      </a>
                      <SignOutButton>
                        <button className="w-full text-left px-4 py-2 text-sm text-[#F15B3B] hover:bg-[#F15B3B]/20 font-medium">
                          Sign Out
                        </button>
                      </SignOutButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#F4ECE6", color: "#3C2F2F" }}
                onClick={() => router.push("/sign-in")}
                className="uppercase text-sm font-semibold border-2 border-[#F4ECE6] px-5 py-1.5 rounded-full bg-[#F15B3B] text-white transition"
              >
                Join Us
              </motion.button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-[#F4ECE6]"
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
              className="md:hidden flex flex-col bg-gradient-to-b from-[#F4ECE6] to-[#FCEADF] border-t-4 border-[#F15B3B] overflow-hidden shadow-lg"
            >
              {navLinks.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  whileHover={{ backgroundColor: "#F15B3B", color: "#fff", x: 4 }}
                  className="py-3 px-6 text-[#3C2F2F] font-semibold uppercase tracking-wide"
                >
                  {link.name}
                </motion.a>
              ))}

              <div className="border-t border-[#F15B3B]/30 mt-2 pt-2 px-6 pb-4">
                {isSignedIn ? (
                  <>
                    <a href="/profile" className="block py-2 font-semibold text-[#3C2F2F] hover:text-[#F15B3B]">Profile</a>
                    <SignOutButton>
                      <button className="w-full text-left py-2 font-semibold text-[#F15B3B] hover:text-[#F15B3B]/80">
                        Sign Out
                      </button>
                    </SignOutButton>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ backgroundColor: "#3C2F2F", color: "#F4ECE6", scale: 1.05 }}
                    onClick={() => { router.push("/sign-in"); setMenuOpen(false); }}
                    className="w-full mt-2 uppercase text-sm font-semibold border-2 border-[#3C2F2F] px-5 py-1.5 rounded-full bg-[#F15B3B] text-white transition"
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
