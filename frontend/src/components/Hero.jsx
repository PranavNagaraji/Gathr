'use client';
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function HeroPage() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);

  const textVariant = {
    hidden: { y: 80, opacity: 0 },
    visible: (i) => ({
      y: 0,
      opacity: 1,
      transition: { delay: i * 0.15, duration: 0.8, ease: "easeOut" },
    }),
  };

  return (
    <div className="relative min-h-screen bg-[#f5e9e0] overflow-hidden flex flex-col items-center justify-center pt-24 text-center">
      {/* Floating shapes */}
      <motion.div
        className="absolute top-10 left-10 w-24 h-24 bg-[#ff3b3b] rounded-full mix-blend-multiply"
        animate={{ y: [0, 40, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 right-16 w-28 h-28 bg-[#b4ff00] rounded-[2rem] mix-blend-multiply"
        animate={{ x: [0, -30, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Animated hero text */}
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        {["Empowering Local Commerce", "Building Sustainable Communities", "One Purchase at a Time"].map(
          (line, i) => (
            <motion.h1
              key={i}
              custom={i}
              variants={textVariant}
              initial="hidden"
              animate="visible"
              className="text-[#111] text-4xl md:text-6xl font-extrabold uppercase tracking-tight"
            >
              {line}
            </motion.h1>
          )
        )}
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="mt-6 max-w-2xl text-[#333] text-lg font-medium"
      >
        Discover and support authentic local merchants, enjoy eco-friendly deliveries, and redefine convenience with UrbanLocal — your community marketplace.
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        className="mt-10 flex gap-6 justify-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#111", color: "#fff" }}
          className="px-8 py-3 bg-[#ff3b3b] text-white text-lg uppercase rounded-full font-semibold tracking-wide shadow-md"
        >
          Explore Local
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#b4ff00" }}
          className="px-8 py-3 border-2 border-[#111] text-[#111] text-lg uppercase rounded-full font-semibold tracking-wide bg-transparent"
        >
          Become a Merchant
        </motion.button>
      </motion.div>

      {/* Scrolling bottom marquee */}
      {show && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-[#ff3b3b] text-white font-bold uppercase text-sm py-2 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
        >
          <motion.div
            animate={{ x: ["100%", "-100%"] }}
            transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            className="whitespace-nowrap"
          >
            Local goods • Fast delivery • Empowering merchants • Sustainable living • Community-driven commerce •
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
