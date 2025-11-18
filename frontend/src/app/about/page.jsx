"use client";

import Link from "next/link";
import axios from "axios";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export default function AboutPage() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { getToken } = useAuth();
  const { user } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    if (!message.trim()) { setStatus("Please enter a message."); return; }

    try {
      setSubmitting(true);
      const token = await getToken().catch(() => null);
      const whoEmail = user?.primaryEmailAddress?.emailAddress || email || "";
      const clerkId = user?.id || null;

      await axios.post(
        `${API_URL}/api/complaints/create`,
        { name, email: whoEmail || email, message, clerkId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      setStatus("Thanks! Your complaint has been recorded.");
      setName(""); setEmail(""); setMessage("");
    } catch (e) {
      setStatus("Failed to send. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pt-20">

      {/* HERO */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-transparent blur-3xl opacity-40" />

        <div className="max-w-5xl mx-auto px-6 relative text-center">
          <h1 className="text-6xl font-black tracking-tight leading-tight">
            Designed for Communities.  
            <span className="block text-[var(--primary)] mt-2">Built for Everyone.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[var(--muted-foreground)] max-w-3xl mx-auto leading-relaxed">
            Gathr brings the simplicity and elegance of modern digital commerce  
            into everyday local shopping — creating a seamless, human-centered experience  
            for customers, merchants, and carriers alike.
          </p>
        </div>
      </section>

      {/* BRAND STATEMENT */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-lg">
          <p className="text-2xl md:text-3xl font-semibold text-[var(--foreground)] leading-relaxed">
            “At Gathr, we believe the future of commerce is not just digital —  
            it is <span className="text-[var(--primary)]">local, connected, and beautifully simple</span>.”
          </p>
        </div>
      </section>

      {/* TWO CARD SECTIONS */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10">
        
        {/* Mission */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-xl">
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-[var(--muted-foreground)] text-lg leading-8">
            To empower local ecosystems with world-class technology,  
            giving small businesses the digital edge they need to thrive.  
            We remove friction, accelerate growth, and ensure every community  
            has access to modern commerce tools — without losing its human touch.
          </p>
        </div>

        {/* Offerings */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 shadow-xl">
          <h2 className="text-3xl font-bold mb-6">What We Offer</h2>
          <ul className="space-y-4 text-lg text-[var(--muted-foreground)] leading-8">
            <li className="flex items-start gap-3">
              <span className="text-[var(--primary)] mt-1">•</span>
              A beautifully simple shopping experience for customers
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--primary)] mt-1">•</span>
              Smart management tools & analytics for merchants
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--primary)] mt-1">•</span>
              Flexible earning opportunities for carriers
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--primary)] mt-1">•</span>
              Secure authentication, payments, and encrypted communication
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[var(--primary)] mt-1">•</span>
              Ultra-efficient routing, tracking, and delivery optimization
            </li>
          </ul>
        </div>
      </section>

      {/* Minimalist Info Strip */}
      <section className="bg-[var(--card)] py-16 border-t border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-center">
          <div>
            <h3 className="text-4xl font-black">10k+</h3>
            <p className="text-[var(--muted-foreground)] mt-2">Daily Shoppers</p>
          </div>
          <div>
            <h3 className="text-4xl font-black">1200+</h3>
            <p className="text-[var(--muted-foreground)] mt-2">Local Merchants</p>
          </div>
          <div>
            <h3 className="text-4xl font-black">500+</h3>
            <p className="text-[var(--muted-foreground)] mt-2">Active Carriers</p>
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="rounded-3xl border border-[var(--border)] p-12 bg-[var(--card)] shadow-xl">
          <h2 className="text-4xl font-bold mb-8">Contact Us</h2>

          <form className="grid gap-8 md:grid-cols-2" onSubmit={onSubmit}>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--background)] text-lg"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--background)] text-lg"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-3">
              <label className="text-sm font-medium">Message</label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we assist you?"
                className="rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--background)] text-lg"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-6">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]
                font-semibold text-lg hover:opacity-90 disabled:opacity-60 transition"
              >
                {submitting ? "Sending…" : "Send Message"}
              </button>

              {status && (
                <p className="text-md text-[var(--muted-foreground)]">{status}</p>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center pb-16">
        <Link
          href="/"
          className="text-sm underline text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
        >
          Back to Home
        </Link>
      </footer>

    </main>
  );
}
