'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const COLORS = {
  mocha: '#3C2F2F',
  coral: '#F15B3B',
  warmBeige: '#F4ECE6',
  clay1: '#E3A58A',
  clay2: '#F4B89B',
  deepGreen: '#123626',
};

// This component is not used to match the video but is kept for your reference.
function CursorGlow() {
  const cursor = useRef(null);

  useEffect(() => {
    const move = (e) => {
      const { clientX, clientY } = e;
      if (cursor.current) {
        cursor.current.animate({ left: `${clientX}px`, top: `${clientY}px` }, { duration: 600, fill: 'forwards' });
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={cursor}
      className="fixed pointer-events-none z-[9999] w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(241,91,59,0.25)_0%,transparent_70%)] mix-blend-lighten blur-3xl"
      style={{ transform: 'translate(-50%, -50%)' }}
    />
  );
}

/* ---------------------- 🎞️ Scroll Animation Variants ---------------------- */
// Variant for parent containers to stagger child animations
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

// Variant for text elements to fade and rise into view
const fadeRise = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
  },
};

// ✨ NEW: Variant for section images to fade in while zooming out slightly
const imageZoom = {
    hidden: { opacity: 0, scale: 1.1 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.9,
            ease: [0.25, 0.1, 0.25, 1]
        }
    }
}

/* ---------------------- 🏠 Hero Section ---------------------- */
function HeroSection() {
  return (
    <section className="relative flex items-center h-screen bg-[var(--background)] overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-4 grid md:grid-cols-2 relative">
        {/* Left: Text */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h1
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-6xl lg:text-7xl font-bold text-[var(--foreground)] leading-[1.1]"
          >
            Empowering Local <br />
            <span className="text-[var(--primary)]">Commerce</span>
          </h1>

          <p
            style={{ fontFamily: "'Inter', sans-serif" }}
            className="text-[var(--muted-foreground)] text-lg leading-relaxed max-w-md font-normal"
          >
            Gathr bridges customers, shopkeepers, and delivery heroes — creating a thriving local ecosystem built on
            trust, community, and genuine connection.
          </p>

          <motion.a
            whileHover={{
              scale: 1.07,
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
            transition={{ type: 'spring', stiffness: 250 }}
            className="inline-block px-10 py-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-lg tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            href="#customers"
          >
            Get Started →
          </motion.a>
        </motion.div>

        {/* Right: Image */}
        {/* ✨ UPDATED: Animation is now directly on the image for the pan/zoom effect */}
        <div className="flex justify-end">
          <div className="relative w-[95%] md:w-[90%] lg:w-[85%] rounded-[2rem] overflow-hidden shadow-xl group">
            <motion.img
              initial={{ opacity: 0, scale: 1.2, y: -60 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
              src="/hero_image.jpeg"
              alt="local community market"
              className="w-full h-[75vh] object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out rounded-[2rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- 👥 Customer Section ---------------------- */
function CustomersSection() {
  return (
    <section className="relative bg-[var(--card)] py-28 overflow-hidden text-[var(--card-foreground)]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 px-6 items-center">
        {/* ✨ UPDATED: Using the new 'imageZoom' variant */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={imageZoom}
          className="rounded-3xl shadow-xl overflow-hidden group"
        >
          <img
            src="/customer.jpeg"
            alt="happy customers"
            className="w-full h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeRise}
          className="space-y-6"
        >
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl md:text-5xl font-bold text-[var(--foreground)]">
            For Customers
          </h2>
          <p className="text-[var(--muted-foreground)] text-lg leading-relaxed">
            Discover nearby stores, artisans, and fresh local finds. Gathr connects you to what’s real — no algorithms,
            no mass production — just your community delivering what you love, faster and friendlier.
          </p>
          <motion.button
            whileHover={{
              scale: 1.07,
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 15px 30px rgba(18,54,38,0.25)',
            }}
            className="px-6 py-3 border border-[var(--border)] rounded-full font-semibold text-[var(--foreground)] transition-all duration-300"
          >
            Start Exploring
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------- 🏪 Shop Section ---------------------- */
function ShopkeeperSection() {
  return (
    <section className="relative py-28 overflow-hidden bg-[var(--foreground)] text-[var(--background)]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 px-6 items-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeRise}
          className="space-y-6"
        >
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl md:text-5xl font-bold">
            For Shopkeepers
          </h2>
          <p className="text-lg leading-relaxed opacity-80">
            Showcase your products and grow your store digitally while keeping your community close. From easy
            inventory management to real-time orders — Gathr helps local businesses thrive with style.
          </p>
          <motion.button
            whileHover={{
              scale: 1.07,
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 10px 35px rgba(241,91,59,0.3)',
            }}
            className="px-6 py-3 bg-[var(--card)] text-[var(--card-foreground)] rounded-full font-semibold transition-all duration-300"
          >
            List Your Store
          </motion.button>
        </motion.div>

        {/* ✨ UPDATED: Using the new 'imageZoom' variant */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={imageZoom}
          className="rounded-3xl overflow-hidden shadow-2xl group"
        >
          <img
            src="/item_image.jpeg"
            alt="local shop items"
            className="w-full h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------- 🚴 Delivery Section ---------------------- */
function DeliverySection() {
  return (
    <section className="relative py-28 overflow-hidden bg-[var(--muted)]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 px-6 items-center">
        {/* ✨ UPDATED: Using the new 'imageZoom' variant */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={imageZoom}
          className="rounded-3xl overflow-hidden shadow-2xl group"
        >
          <img
            src="/delivery_guy.jpeg"
            alt="delivery partner"
            className="w-full h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-700"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeRise}
          className="space-y-6"
        >
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-4xl md:text-5xl font-bold text-[var(--foreground)]">
            For Delivery Partners
          </h2>
          <p className="text-lg leading-relaxed text-[var(--muted-foreground)]">
            Become the heartbeat of local commerce. With Gathr, you deliver more than products — you deliver community
            connection. Earn flexibly, move freely, and make every trip meaningful.
          </p>
          <motion.button
            whileHover={{
              scale: 1.07,
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
              boxShadow: '0 12px 35px rgba(60,47,47,0.25)',
            }}
            className="px-6 py-3 bg-[var(--card)] text-[var(--card-foreground)] rounded-full font-semibold transition-all duration-300"
          >
            Join the Fleet
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------- ⚙️ Footer ---------------------- */
function Footer() {
  return (
    <footer className="py-10 bg-[var(--card)] text-center text-[var(--muted-foreground)] text-sm border-t border-[var(--border)]">
      &copy; {new Date().getFullYear()} Gathr — Empowering Local Commerce.
    </footer>
  );
}

/* ---------------------- 🚀 Export Page ---------------------- */
export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      <main>
        <HeroSection />
        <CustomersSection />
        <ShopkeeperSection />
        <DeliverySection />
        <Footer />
      </main>
    </div>
  );
}