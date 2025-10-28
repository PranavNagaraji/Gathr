'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

/* ---------------------- ✨ Framer Variants ---------------------- */
const fadeRise = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] } },
};

const imageZoom = {
  hidden: { opacity: 0, scale: 1.1 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ---------------------- 🚀 Landing Page ---------------------- */
export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen antialiased relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      <main>
        {/* ---------------------- 🏠 Hero Section ---------------------- */}
        <section className="relative flex flex-col md:flex-row items-center md:items-start h-auto md:min-h-[85vh] bg-[var(--background)] overflow-hidden pt-14 md:pt-8 pb-12 md:pb-0">
          <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 md:px-12 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              viewport={{ once: true }}
              className="space-y-6 text-center md:text-left"
            >
              <h1
                style={{ fontFamily: "'Playfair Display', serif" }}
                className="text-4xl sm:text-5xl lg:text-7xl font-bold text-[var(--foreground)] leading-tight"
              >
                Empowering Local <br />
                <span className="text-[var(--primary)]">Commerce</span>
              </h1>

              <p
                style={{ fontFamily: "'Inter', sans-serif" }}
                className="text-[var(--muted-foreground)] text-base sm:text-lg leading-relaxed max-w-md mx-auto md:mx-0"
              >
                Gathr bridges customers, shopkeepers, and delivery heroes — creating a thriving local ecosystem built on
                trust, community, and genuine connection.
              </p>

              <motion.a
                whileHover={{
                  scale: 1.07,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                }}
                transition={{ type: 'spring', stiffness: 250 }}
                className="group relative inline-block px-8 sm:px-10 py-3 sm:py-4 rounded-full 
                          bg-[var(--primary)] text-[var(--primary-foreground)] 
                          font-semibold text-base sm:text-lg tracking-wide 
                          overflow-hidden transition-all duration-300"
                href="/sign-in"
              >
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-0 
                            transition-transform duration-500 ease-out 
                            bg-[#7A87A6]
                            dark:from-gray-700/40 dark:to-gray-900/40
                            backdrop-blur-[1px]"
                ></span>
                <span className="relative z-10">Get Started →</span>
              </motion.a>
            </motion.div>

            <div className="flex justify-center md:justify-end">
              <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl rounded-[2rem] overflow-hidden shadow-xl group">
                <motion.img
                  initial={{ opacity: 0, scale: 1.2, y: -60 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ once: true }}
                  src="/hero_image.jpeg"
                  alt="local community market"
                  className="w-full h-[50vh] sm:h-[65vh] md:h-[75vh] object-cover object-center transform  transition-transform duration-700 ease-out rounded-[2rem]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------- 👥 Customers Section ---------------------- */}
        <section className="relative bg-[var(--card)] py-20 sm:py-24 md:py-28 overflow-hidden text-[var(--card-foreground)]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 px-6 sm:px-8 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={imageZoom}
              className="rounded-3xl shadow-xl overflow-hidden group order-1 md:order-none"
            >
              <img
                src="/customer.jpeg"
                alt="happy customers"
                className="w-full h-[300px] sm:h-[400px] object-cover transform  transition-transform duration-700"
              />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeRise}
              className="space-y-5 text-center md:text-left"
            >
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl sm:text-4xl md:text-5xl font-bold">
                For Customers
              </h2>
              <p className="text-[var(--muted-foreground)] text-base sm:text-lg leading-relaxed">
                Discover nearby stores, artisans, and fresh local finds. Gathr connects you to what’s real — no algorithms,
                no mass production — just your community delivering what you love, faster and friendlier.
              </p>
              <motion.button
                whileHover={{ scale: 1.07 }}
                onClick={() => router.push("/sign-in")}
                className="group relative px-5 sm:px-6 py-2.5 sm:py-3 border border-[var(--border)] rounded-full font-semibold text-[var(--foreground)] transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-[var(--primary)] transition-transform duration-500 ease-out"></span>
                <span className="relative z-10 group-hover:text-[var(--primary-foreground)] transition-colors">Start Exploring</span>
              </motion.button>
            </motion.div>
          </div>
        </section>

        {/* ---------------------- 🏪 Shopkeeper Section ---------------------- */}
        <section className="relative py-20 sm:py-24 md:py-28 overflow-hidden bg-[var(--foreground)] text-[var(--background)]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 px-6 sm:px-8 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeRise}
              className="space-y-5 text-center md:text-left"
            >
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl sm:text-4xl md:text-5xl font-bold">
                For Shopkeepers
              </h2>
              <p className="text-base sm:text-lg leading-relaxed opacity-80">
                Showcase your products and grow your store digitally while keeping your community close. From easy
                inventory management to real-time orders — Gathr helps local businesses thrive with style.
              </p>
              <motion.button
                whileHover={{ scale: 1.07 }}
                onClick={() => router.push("/sign-in")}
                className="group relative px-5 sm:px-6 py-2.5 sm:py-3 bg-[var(--card)] text-[var(--card-foreground)] rounded-full font-semibold transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-[var(--primary)] transition-transform duration-500 ease-out"></span>
                <span className="relative z-10 group-hover:text-[var(--primary-foreground)] transition-colors">List Your Store</span>
              </motion.button>
            </motion.div>

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
                className="w-full h-[300px] sm:h-[400px] object-cover transform transition-transform duration-700"
              />
            </motion.div>
          </div>
        </section>

        {/* ---------------------- 🚴 Delivery Section ---------------------- */}
        <section className="relative py-20 sm:py-24 md:py-28 overflow-hidden bg-[var(--muted)]">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 px-6 sm:px-8 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={imageZoom}
              className="rounded-3xl overflow-hidden shadow-2xl group order-1 md:order-none"
            >
              <img
                src="/delivery_guy.jpeg"
                alt="delivery partner"
                className="w-full h-[300px] sm:h-[400px] object-cover transform  transition-transform duration-700"
              />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeRise}
              className="space-y-5 text-center md:text-left"
            >
              <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--foreground)]">
                For Delivery Partners
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-[var(--muted-foreground)]">
                Become the heartbeat of local commerce. With Gathr, you deliver more than products — you deliver community
                connection. Earn flexibly, move freely, and make every trip meaningful.
              </p>
              <motion.button
                whileHover={{ scale: 1.07 }}
                onClick={() => router.push("/sign-in")}
                className="group relative px-5 sm:px-6 py-2.5 sm:py-3 bg-[var(--card)] text-[var(--card-foreground)] rounded-full font-semibold transition-all duration-300 overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-[var(--primary)] transition-transform duration-500 ease-out"></span>
                <span className="relative z-10 group-hover:text-[var(--primary-foreground)] transition-colors">Join the Fleet</span>
              </motion.button>
            </motion.div>
          </div>
        </section>

      </main>
    </div>
  );
}
