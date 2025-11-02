import dotenv from "dotenv";
import fetch from "node-fetch";
import { Clerk } from "@clerk/clerk-sdk-node";

dotenv.config();
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

async function resolveRecipientEmail(clerkId, fallbackEmail) {
  try {
    if (fallbackEmail) return fallbackEmail;
    if (!clerkId) return null;
    const user = await clerk.users.getUser(clerkId);
    return user?.emailAddresses?.[0]?.emailAddress || null;
  } catch (e) {
    return null;
  }
}

function renderAutoReorderEmail({ phase, frequencyDays, nextAt, cartId }) {
  const when = nextAt ? new Date(nextAt).toLocaleString() : "";
  const phases = {
    scheduled: {
      subject: `Auto‑reorder scheduled in ${frequencyDays} days`,
      intro: `Your auto‑reorder has been scheduled.`,
    },
    pre_due: {
      subject: `Reminder: Auto‑reorder in 1 hour`,
      intro: `Your auto‑reorder is due in about 1 hour.`,
    },
    due: {
      subject: `Auto‑reorder is now due`,
      intro: `Your auto‑reorder is due now.`,
    },
  };
  const meta = phases[phase] || { subject: "Auto‑reorder update", intro: "An update to your auto‑reorder." };
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
      <h2>${meta.subject}</h2>
      <p>${meta.intro}</p>
      ${when ? `<p><strong>When:</strong> ${when}</p>` : ""}
      ${frequencyDays ? `<p><strong>Frequency:</strong> Every ${frequencyDays} days</p>` : ""}
      ${cartId ? `<p><strong>Order:</strong> Cart #${cartId}</p>` : ""}
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
  return { subject: meta.subject, html };
}

async function sendMailjet({ to, subject, html }) {
  const { MJ_APIKEY_PUBLIC, MJ_APIKEY_PRIVATE, MJ_SENDER_EMAIL } = process.env;
  if (!MJ_APIKEY_PUBLIC || !MJ_APIKEY_PRIVATE || !MJ_SENDER_EMAIL) {
    console.log("[notify] (dry-run) To:", to, "Subject:", subject);
    return { ok: true, dryRun: true };
  }
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${MJ_APIKEY_PUBLIC}:${MJ_APIKEY_PRIVATE}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: MJ_SENDER_EMAIL, Name: "Gathr Notifications" },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
        },
      ],
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error("[notify] Mailjet error", result);
    throw new Error(result?.Message || "Mailjet send failed");
  }
  return { ok: true };
}

export async function autoReorderNotify(req, res) {
  try {
    const { clerkId, cartId, phase, frequencyDays, nextAt, to } = req.body || {};
    if (!phase) return res.status(400).json({ message: "Missing phase" });

    const toEmail = await resolveRecipientEmail(clerkId, to);
    if (!toEmail) return res.status(400).json({ message: "Could not resolve recipient email" });

    const { subject, html } = renderAutoReorderEmail({ phase, frequencyDays, nextAt, cartId });
    const resp = await sendMailjet({ to: toEmail, subject, html });
    return res.status(200).json(resp);
  } catch (e) {
    console.error("/api/notify/autoReorder error:", e);
    return res.status(500).json({ message: e.message || "Internal error" });
  }
}

export async function testEmail(req, res) {
  try {
    const { to, subject = "Test from Gathr", html = "<p>This is a test.</p>" } = req.body || {};
    if (!to) return res.status(400).json({ message: "Provide 'to' email in body" });
    const resp = await sendMailjet({ to, subject, html });
    return res.status(200).json(resp);
  } catch (e) {
    console.error("/api/notify/test error:", e);
    return res.status(500).json({ message: e.message || "Internal error" });
  }
}
