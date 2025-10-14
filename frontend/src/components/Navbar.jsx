'use client';
import { SignOutButton, useUser } from "@clerk/nextjs";
import React, { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@mui/material";

const merchantLinks = [
  { name: "Home", href: "/" },
  { name: "Dashboard", href: "/merchant/dashboard" },
  { name: "Update Shop", href: "/merchant/updateShop" },
  { name: "Orders", href: "/merchant/orders" }
];

const customerLinks = [
  { name: "Home", href: "/" },
  { name: "Shops", href: "/customer/getShops" },
  { name: "Cart", href: "/customer/cart" },
  { name: "Orders", href: "/orders" },
];

const carrierLinks = [
  { name: "Dashboard", href: "/carrier/dashboard" },
  { name: "Assigned Deliveries", href: "/carrier/deliveries" },
  { name: "Delivery History", href: "/carrier/history" },
  { name: "Earnings", href: "/carrier/earnings" },
  { name: "Support", href: "/carrier/support" },
];

// NAVBAR COMPONENT
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';

  const { isSignedIn, user } = useUser();
  const profileImage = user?.imageUrl;
  const role = user?.publicMetadata?.role || "customer";

  const navLinks =
    role === "merchant" ? merchantLinks :
    role === "carrier" ? carrierLinks :
    customerLinks;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-md border-b border-[#E8C547]/20 
        ${isHome ? 'bg-[#F5F5F5]/90' : 'bg-[#F5F5F5]/95 shadow-[0_2px_10px_rgba(0,0,0,0.03)]'}`}
      style={{ fontFamily: "'Inter', sans-serif'" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* LOGO */}
        <a href="/" className="flex items-center gap-2">
          <span
            className="text-4xl font-extrabold tracking-tight text-[#0B132B]"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Gathr
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8" ref={menuRef}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`relative text-[15px] font-medium tracking-wide transition-all duration-300
                ${pathname === link.href ? 'text-[#00ADB5]' : 'text-[#121212] hover:text-[#00ADB5]'}
                after:content-[''] after:absolute after:w-0 after:h-[2px] after:bg-[#00ADB5]
                after:left-0 after:-bottom-1 hover:after:w-full after:transition-all after:duration-300`}
            >
              {link.name}
            </a>
          ))}

          {isSignedIn ? (
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-[#0B132B] hover:bg-[#00ADB5] transition-all duration-300 text-white px-3 py-1 rounded-full"
              >
                <img
                  src={profileImage}
                  alt="user avatar"
                  className="w-7 h-7 rounded-full border border-white/40"
                />
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Profile
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Settings
                  </a>
                  <SignOutButton>
                    <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                      Sign out
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={() => router.push('/sign-up')}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '30px',
                textTransform: 'none',
                fontFamily: "'Inter', sans-serif",
                backgroundColor: '#00ADB5',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(0, 173, 181, 0.3)',
                '&:hover': { backgroundColor: '#08C1C9', transform: 'translateY(-1px)' },
              }}
            >
              Sign Up
            </Button>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-[#0B132B]">
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#F5F5F5] border-t border-[#E8C547]/20 shadow-md">
          <div className="flex flex-col gap-2 py-3 px-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`block py-2 text-[15px] font-medium rounded-md transition-all 
                  ${pathname === link.href
                    ? 'text-[#00ADB5]'
                    : 'text-[#121212] hover:text-[#00ADB5]'}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}

            {isSignedIn ? (
              <>
                <a href="#" className="block py-2 text-gray-700 hover:text-[#00ADB5]">Profile</a>
                <a href="#" className="block py-2 text-gray-700 hover:text-[#00ADB5]">Settings</a>
                <SignOutButton>
                  <button className="block text-left text-red-600 py-2">Sign out</button>
                </SignOutButton>
              </>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={() => { router.push('/sign-up'); setMenuOpen(false); }}
                sx={{
                  borderRadius: '30px',
                  textTransform: 'none',
                  backgroundColor: '#00ADB5',
                  color: '#fff',
                  '&:hover': { backgroundColor: '#08C1C9' },
                }}
              >
                Sign Up
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
