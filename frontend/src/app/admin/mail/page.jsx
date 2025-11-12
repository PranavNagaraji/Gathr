"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const TEMPLATES = {
  warning: {
    subject: "Warning from Gathr Admin",
    text: `Dear User,

We noticed activity that violates our community guidelines.
Please review and comply to avoid further action.

Regards,
Gathr Admin`,
  },
  notice: {
    subject: "Notice from Gathr Admin",
    text: `Hello,

This is an important notice regarding your account.
Please take the required action as soon as possible.

Regards,
Gathr Admin`,
  },
  policy: {
    subject: "Policy Violation – Action Required",
    text: `Hello,

We detected a potential policy violation related to your activity.
Kindly review our policies and take corrective action within 48 hours.

If you believe this is an error, reply to this mail with details.

Thank you,
Gathr Admin`,
  },
  maintenance: {
    subject: "Scheduled Maintenance Notice",
    text: `Hello,

We will perform scheduled maintenance on our systems.
Some services may be temporarily unavailable during this time.

We appreciate your patience.

Regards,
Gathr Admin`,
  },
  custom: {
    subject: "",
    text: "",
  },
};

export default function AdminMailPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [ready, setReady] = useState(false);
  const [to, setTo] = useState("");
  const [template, setTemplate] = useState("warning");
  const [subject, setSubject] = useState(TEMPLATES.warning.subject);
  const [bodyText, setBodyText] = useState(TEMPLATES.warning.text);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const ok = localStorage.getItem("adminAuthed") === "true";
      if (!ok) { router.replace("/admin/login"); return; }
      setReady(true);
    } catch { router.replace("/admin/login"); }
  }, [router]);

  useEffect(() => {
    const t = TEMPLATES[template];
    if (!t) return;
    setSubject(t.subject);
    setBodyText(t.text);
  }, [template]);

  const buildHtml = (title, text) => {
    const safe = (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const withBreaks = safe.replace(/\n/g, "<br/>");
    return `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b1020;padding:24px;color:#e2e8f0">
        <div style="max-width:640px;margin:0 auto;background:#0f172a;border:1px solid #1f2937;border-radius:12px;overflow:hidden">
          <div style="padding:16px 20px;border-bottom:1px solid #1f2937;display:flex;align-items:center;justify-content:space-between">
            <div style="font-weight:800;letter-spacing:-0.02em;color:#ffffff">Gathr</div>
            <div style="font-size:12px;color:#94a3b8">Admin Message</div>
          </div>
          <div style="padding:20px">
            ${title ? `<h2 style=\"margin:0 0 12px 0;color:#ffffff;font-size:18px\">${title}</h2>` : ""}
            <div style="font-size:14px;line-height:1.7;color:#cbd5e1">${withBreaks}</div>
          </div>
          <div style="padding:12px 20px;border-top:1px solid #1f2937;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Gathr</div>
        </div>
      </div>`;
  };

  const onSend = async (e) => {
    e.preventDefault();
    setNote("");
    const emails = to.split(",").map(s => s.trim()).filter(Boolean);
    if (!emails.length) { setNote("Enter at least one recipient email"); return; }
    if (!subject.trim() || !bodyText.trim()) { setNote("Subject and body are required"); return; }
    try {
      setSending(true);
      const html = buildHtml(subject, bodyText);
      await axios.post(`${API_URL}/api/admin/mail`, {
        to: emails,
        subject,
        html,
      }, {
        headers: { 'x-admin-email': 'admin@gmail.com' },
      });
      setNote("Mail sent successfully.");
      setToast("Mail sent successfully.");
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to send mail";
      setNote(msg);
      setToast(msg);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSending(false);
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[2000]">
          <div className="rounded-lg bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow px-4 py-2 text-sm">
            {toast}
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Admin Mail</h1>
          {note && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{note}</p>}
        </header>

        <form onSubmit={onSend} className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm">To (comma-separated emails)</label>
            <input value={to} onChange={(e)=>setTo(e.target.value)} placeholder="user1@example.com, user2@example.com" className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-1">
              <label className="text-sm">Template</label>
              <select value={template} onChange={(e)=>setTemplate(e.target.value)} className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]">
                <option value="warning">Warning</option>
                <option value="notice">Notice</option>
                <option value="policy">Policy Violation</option>
                <option value="maintenance">Maintenance</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm">Subject</label>
              <input value={subject} onChange={(e)=>setSubject(e.target.value)} className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)]" />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Body (plain text)</label>
            <textarea rows={10} value={bodyText} onChange={(e)=>setBodyText(e.target.value)} className="px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Preview</label>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="p-3 text-xs text-[var(--muted-foreground)]">This is how it will look in the recipient's inbox.</div>
              <div className="min-h-[120px]" dangerouslySetInnerHTML={{ __html: buildHtml(subject, bodyText) }} />
            </div>
          </div>
          <div>
            <button disabled={sending} type="submit" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
              {sending ? "Sending…" : "Send Mail"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
