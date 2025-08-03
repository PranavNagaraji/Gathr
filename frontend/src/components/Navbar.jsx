'use client';
import { SignOutButton } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Cart", href: "/cart" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const pathname = usePathname();

  const isHome = pathname === '/';
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
    <nav className={`border-gray-200 shadow-md transition-all duration-300 ${isHome
      ? 'bg-transparent absolute top-0 left-0 right-0 z-50'
      : 'bg-white dark:bg-gray-900'
      }`} style={{ fontFamily: "'Outfit', 'sans-serif'" }}>
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src="/logo.png" className="h-8" alt="Gathr Logo" />
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Gathr</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 relative" ref={menuRef}>
          {navLinks.map((navLink) => (
            <a
              key={navLink.href}
              href={navLink.href}
              className="text-gray-700 dark:text-white hover:scale-110 transition-transform"
            >
              {navLink.name}
            </a>
          ))}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex text-sm bg-gray-800 rounded-full hover:ring-2 ring-white focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
          >
            <img className="w-8 h-8 rounded-full" src="/avatar.png" alt="user avatar" />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-md shadow-lg dark:bg-gray-800 z-50">
              <div className="py-1">
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Profile</a>
                <a href="#" className="block px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Settings</a>
                <SignOutButton>
                  <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">Sign out</button>
                </SignOutButton>
              </div>
            </div>
          )}
        </div>

        {/* Hamburger Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-gray-700 dark:text-white"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Menu Dropdown for Mobile*/}
      </div>
      <div>
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 space-y-2 bg-white dark:bg-gray-900 shadow-md">
            {navLinks.map((navLink) => (
              <a
                key={navLink.href}
                href={navLink.href}
                className="block text-gray-700 dark:text-white"
                onClick={() => setMenuOpen(false)}
              >
                {navLink.name}
              </a>
            ))}
            <a href="#" className="block text-gray-700 dark:text-white">Profile</a>
            <a href="#" className="block text-gray-700 dark:text-white">Settings</a>
            <SignOutButton>
              <button className="block text-red-700 dark:text-red-700">Sign out</button>
            </SignOutButton>
          </div>
        )}
      </div>
    </ nav>
  );
}
