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
    <main className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <section className="max-w-5xl mx-auto px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">About Gathr</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Bringing local merchants, customers, and carriers together on a single, seamless platform.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] p-6">
            <h2 className="text-lg font-semibold mb-2">Our Mission</h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              We aim to connect neighborhoods with the products and services they love. Gathr empowers small businesses,
              streamlines deliveries, and delights customers with a modern buying experience.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] p-6">
            <h2 className="text-lg font-semibold mb-2">What We Offer</h2>
            <ul className="text-sm leading-6 text-[var(--muted-foreground)] list-disc pl-5">
              <li>Effortless shopping for customers</li>
              <li>Tools for merchants to scale locally</li>
              <li>Flexible opportunities for carriers</li>
              <li>Secure authentication and payments</li>
            </ul>
          </div>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] p-6 mb-10">
          <h2 className="text-lg font-semibold mb-4">Contact Us</h2>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-sm">Name</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2" placeholder="Your name" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2" placeholder="you@example.com" />
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm">Message</label>
              <textarea rows={5} value={message} onChange={(e)=>setMessage(e.target.value)} className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2" placeholder="How can we help?" />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button disabled={submitting} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-60" type="submit">
                {submitting ? "Sending…" : "Send Message"}
              </button>
              {status && <p className="text-xs text-[var(--muted-foreground)]">{status}</p>}
            </div>
          </form>
        </section>

        <div className="text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="underline hover:opacity-80">Back to Home</Link>
        </div>
      </section>
    </main>
  );
}
