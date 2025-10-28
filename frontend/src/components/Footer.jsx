"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <footer className="mt-20 border-t border-neutral-800 bg-black text-white">
      <motion.div
        className="max-w-6xl mx-auto px-6 py-14 grid gap-12 md:grid-cols-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={{
          show: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {/* Logo + About */}
        <motion.div className="md:col-span-2 space-y-5" variants={fadeUp}>
          <div className="flex items-center gap-3">
            <motion.img
              src="/logo.png"
              alt="Gathr"
              className="h-8 w-8"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
            />
            <span className="text-lg font-semibold tracking-wide">Gathr</span>
          </div>
          <p className="text-sm text-neutral-400 leading-6 max-w-md">
            Bringing local merchants, customers, and carriers together on a single, seamless platform.
          </p>
        </motion.div>

        {/* Company Links */}
        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 mb-3">
            Company
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/about", label: "About" },
              { href: "/", label: "Shops" },
            ].map(({ href, label }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="group inline-block relative transition-colors duration-300 ease-in-out text-neutral-300 hover:text-blue-500 focus:text-blue-500"
                >
                  {label}
                  <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-500 group-hover:w-full transition-width duration-300 ease-in-out"></span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Support Emails */}
        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 mb-3">
            Support
          </h3>
          <ul className="space-y-2 text-sm">
            {[
              "123cs0052@iitk.ac.in",
              "123cs0058@iitk.ac.in",
              "123cs0004@iitk.ac.in",
              "123cs0011@iitk.ac.in",
            ].map((email) => (
              <li key={email}>
                <Link
                  href={`mailto:${email}`}
                  className="flex items-center gap-2 group transition-colors duration-300 ease-in-out text-neutral-300 hover:text-blue-500 focus:text-blue-500"
                >
                  <Mail
                    size={14}
                    className="text-neutral-400 group-hover:text-blue-500 transition-colors duration-300 ease-in-out"
                  />
                  <span className="relative inline-block">
                    {email}
                    <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-blue-500 group-hover:w-full transition-width duration-300 ease-in-out"></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Bottom Bar */}
      <motion.div
        className="border-t border-neutral-800"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-6xl mx-auto py-5 px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Gathr. All rights reserved.</p>
          <motion.p
            whileHover={{ scale: 1.02, y: -1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14 }}
            className="cursor-pointer hover:text-blue-500 transition-colors duration-300 ease-in-out"
          >
            Made by Team Gathr
          </motion.p>
        </div>
      </motion.div>
    </footer>
  );
}
