import express from "express";
import nodemailer from "nodemailer";
import requireAuth from "../utils/check.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// In-memory OTP store (email -> { otp, expires })
const otpStore = new Map();

// Helper: generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password
  },
});

// Verify transporter connection
transporter.verify((err, success) => {
  if (err) console.error("Nodemailer connection error:", err);
  else console.log("Nodemailer ready to send emails");
});
// Single POST route: send OTP if only email, verify if otp also provided
router.post("/", requireAuth, async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(`Received OTP request for ${email}`);
    if (!email) return res.status(400).json({ error: "Email is required" });
    // --- Send OTP ---
    if (!otp) {
      const generatedOtp = generateOtp();
      otpStore.set(email, { otp: generatedOtp, expires: Date.now() + 5 * 60 * 1000 });
      try {
        await transporter.sendMail({
          from: `"Delivery Test" <${process.env.EMAIL_USER}>`,
          to: email, // send to yourself for testing
          subject: "OTP Email for Delivery",
          text: "This is a email from your delivery OTP: " + generatedOtp,
        }).then(() => console.log("Email sent successfully!"))
          .catch((err) => console.error("Failed to send email:", err));
        console.log(`OTP sent to ${email}: ${generatedOtp}`);
        return res.json({ success: true, message: "OTP sent successfully" });
      } catch (emailErr) {
        console.error("Failed to send OTP:", emailErr);
        return res.status(500).json({ error: "Failed to send OTP. Check email settings." });
      }
    }

    // --- Verify OTP ---
    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ verified: false, message: "OTP not found" });
    // console.log('step 1');
    if (Date.now() > record.expires) {
      otpStore.delete(email);
      return res.status(400).json({ verified: false, message: "OTP expired" });
    }
    // console.log('step 2');
    if (record.otp === otp) {
      otpStore.delete(email);
      return res.json({ verified: true, message: "OTP verified successfully" });
    }
    // console.log('step 3');
    return res.status(400).json({ verified: false, message: "Invalid OTP" });
  } catch (err) {
    console.error("OTP route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
