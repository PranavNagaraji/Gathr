import express from "express";
import fetch from "node-fetch"; // use fetch for Mailjet API
import requireAuth from "../utils/check.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// In-memory OTP store
const otpStore = new Map();

// Helper: generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST: Send & Verify OTP
router.post("/", requireAuth, async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(`📩 OTP request for ${email}`);

    if (!email) return res.status(400).json({ error: "Email is required" });

    // --- Send OTP ---
    if (!otp) {
      const generatedOtp = generateOtp();
      otpStore.set(email, { otp: generatedOtp, expires: Date.now() + 5 * 60 * 1000 });

      try {
        // Mailjet API
        const response = await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Authorization": "Basic " + Buffer.from(`${process.env.MJ_APIKEY_PUBLIC}:${process.env.MJ_APIKEY_PRIVATE}`).toString("base64"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Messages: [
              {
                From: {
                  Email: process.env.MJ_SENDER_EMAIL, // verified sender email
                  Name: "Gathr Verification"
                },
                To: [
                  {
                    Email: email,
                    Name: "Customer"
                  }
                ],
                Subject: "Your OTP Code",
                TextPart: `Your verification code is: ${generatedOtp}\nIt expires in 5 minutes.`
              }
            ]
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          console.error("❌ Mailjet API error:", result);
          return res.status(500).json({ error: "Failed to send OTP via Mailjet." });
        }

        console.log(`✅ OTP sent to ${email}: ${generatedOtp}`);
        return res.json({ success: true, message: "OTP sent successfully" });
      } catch (err) {
        console.error("❌ Failed to send OTP:", err);
        return res.status(500).json({ error: "Failed to send OTP. Check Mailjet API keys." });
      }
    }

    // --- Verify OTP ---
    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ verified: false, message: "OTP not found" });
    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ verified: false, message: "OTP expired" });
    }
    if (record.otp === otp) {
      otpStore.delete(email);
      return res.json({ verified: true, message: "OTP verified successfully" });
    }

    return res.status(400).json({ verified: false, message: "Invalid OTP" });
  } catch (err) {
    console.error("🔥 OTP route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
