import express from "express";
import { adminEmailGate } from "../utils/check.js";
import { createComplaint, listComplaints, updateComplaintStatus } from "../controllers/complaints.controller.js";

const router = express.Router();

router.post("/create", createComplaint);
router.get("/list", adminEmailGate, listComplaints);
router.patch("/:id/status", adminEmailGate, updateComplaintStatus);

export default router;
