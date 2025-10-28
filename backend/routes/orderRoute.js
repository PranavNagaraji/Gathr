import requireAuth from "../utils/check.js";
import { getCheckoutDetails, placeOrder, getPriceBreakdown } from "../controllers/order.controller.js";
import express from "express";

const router = express.Router();

router.get("/getCheckout/:clerkId", requireAuth, getCheckoutDetails);
router.post("/placeOrder", requireAuth, placeOrder);
router.post("/price-breakdown", requireAuth, getPriceBreakdown);
export default router;