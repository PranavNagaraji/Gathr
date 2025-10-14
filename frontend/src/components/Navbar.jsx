'use client';
import { SignOutButton, useUser } from "@clerk/nextjs";
import React, { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@mui/material";

const navLinks = [
  { name: "Dashboard", href: "/merchant/dashboard" },
  { name: "Services", href: "/services" },
  { name: "Cart", href: "/customer/cart" },
  { name: "Contact", href: "/contact" },
  { name: "updateShop", href: "/merchant/updateShop" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef(null);
  const pathname = usePathname();
  const isHome = pathname === '/';
  const { isSignedIn, user, isLoaded } = useUser();
  const profileImage = user?.imageUrl;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      className={`border-gray-200 shadow-md transition-all duration-300 sticky p-4 z-50 ${isHome
        ? 'bg-transparent absolute top-0 left-0 right-0'
        : 'bg-white dark:bg-gray-900'
        }`}
      style={{ fontFamily: "'Outfit', 'sans-serif'" }}
    >
      <div className="w-full mx-auto flex items-center justify-between flex-wrap">
        {/* Logo */}
        <a href="/" className="flex items-center space-x-3">
          <span
            className="text-5xl tracking-wide font-semibold dark:text-white"
            style={{
              fontFamily: "'Yesteryear', cursive",
              fontWeight: "400",
              whiteSpace: "nowrap",
            }}
          >
            Gathr
          </span>
        </a>

        {/* Hamburger Icon */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-700 dark:text-white"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Desktop Nav */}
        <div
          className="hidden md:flex items-center gap-6 relative"
          ref={menuRef}
        >
          {navLinks.map((navLink) => (
            <a
              key={navLink.href}
              href={navLink.href}
              className="text-gray-700 dark:text-white hover:scale-110 tracking-wider relative
                after:content-[''] after:absolute after:left-0 after:h-0.5 after:bg-white after:rounded-lg after:w-full
                after:top-full after:scale-0 hover:after:scale-100 after:transition-all after:duration-500 transition-transform"
            >
              {navLink.name}
            </a>
          ))}
          {isSignedIn ? (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex text-sm bg-gray-800 rounded-full ring-1 hover:ring-2 ring-black focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              <img
                className="w-8 h-8 rounded-full"
                src={profileImage}
                alt="user avatar"
              />
            </button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                router.push('/sign-up');
                console.log('Clicked!');
              }}
              sx={{
                px: 2,
                py: 1,
                fontFamily: "'Outfit', 'sans-serif'",
                fontWeight: "400",
                fontSize: '1rem',
                borderRadius: '30px',
                textTransform: 'none',
                backgroundColor: '#4338CA',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#6F0FFF',
                  transform: 'scale(1.03)',
                  borderRadius: '10px',
                },
              }}
            >
              SignUp
            </Button>
          )}
          {isOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-md shadow-lg dark:bg-gray-800 z-50">
              <div className="py-1">
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Profile
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Settings
                </a>
                <SignOutButton>
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                    Sign out
                  </button>
                </SignOutButton>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="w-full mt-4 md:hidden flex flex-col gap-3 px-2 pb-4 bg-white dark:bg-gray-900 rounded-md shadow-md">
            {navLinks.map((navLink) => (
              <a
                key={navLink.href}
                href={navLink.href}
                className="block text-gray-700 dark:text-white px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMenuOpen(false)}
              >
                {navLink.name}
              </a>
            ))}
            {isSignedIn ? (
              <>
                <a
                  href="#"
                  className="block text-gray-700 dark:text-white px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Profile
                </a>
                <a
                  href="#"
                  className="block text-gray-700 dark:text-white px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Settings
                </a>
                <SignOutButton>
                  <button className="block w-full text-left px-3 py-2 text-red-700 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Sign out
                  </button>
                </SignOutButton>
              </>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  router.push('/sign-up');
                  setMenuOpen(false);
                }}
                sx={{
                  fontFamily: "'Outfit', 'sans-serif'",
                  fontWeight: "400",
                  fontSize: '1rem',
                  borderRadius: '30px',
                  textTransform: 'none',
                  backgroundColor: '#4338CA',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    backgroundColor: '#6F0FFF',
                    transform: 'scale(1.03)',
                    borderRadius: '10px',
                  },
                }}
              >
                SignUp
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
