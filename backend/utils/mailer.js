import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

export async function sendEmail(to, subject, html) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("Email not sent: SMTP env not configured");
      return { ok: false, reason: "smtp_not_configured" };
    }
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_FROM || "no-reply@example.com";
    const fromName = process.env.FROM_NAME || "Gathr";
    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error("sendEmail error:", e);
    return { ok: false, error: e.message };
  }
}
