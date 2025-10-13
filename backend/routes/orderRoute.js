import { getCheckoutDetails, placeOrder } from "../controllers/order.controller.js";
import express from "express";

const router = express.Router();

router.get("/getCheckout/:clerkId", getCheckoutDetails);
router.post("/placeOrder", placeOrder);
export default router;