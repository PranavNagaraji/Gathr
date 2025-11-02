import express from "express";
import requireAuth from "../utils/check.js";
import { autoReorderNotify, testEmail } from "../controllers/notify.controller.js";

const router = express.Router();

// Send auto-reorder lifecycle emails (scheduled, pre_due, due)
router.post("/autoReorder", requireAuth, autoReorderNotify);

// Simple testing endpoint to verify SMTP works
router.post("/test", testEmail); // public for easy testing; you can secure it later

export default router;
