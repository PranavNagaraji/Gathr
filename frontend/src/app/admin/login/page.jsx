"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("adminAuthed") === "true") {
        router.replace("/admin");
      }
    } catch {}
  }, [router]);

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");
    const ok = email.trim().toLowerCase() === "admin@gmail.com" && password === "admin@123";
    if (!ok) {
      setError("Invalid credentials");
      return;
    }
    try {
      localStorage.setItem("adminAuthed", "true");
    } catch {}
    router.push("/admin");
  };

  return (
    <main className="min-h-screen grid place-items-center bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Admin Login</h1>
        <p className="text-sm text-[var(--muted-foreground)] mb-6">Use the provided admin credentials.</p>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@gmail.com" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="admin@123" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
          </div>
          {error && <div className="text-sm text-[var(--destructive)]">{error}</div>}
          <button type="submit" className="mt-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">Sign in</button>
        </form>
      </div>
    </main>
  );
}
