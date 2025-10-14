import express from "express";
import requireAuth from "../utils/check.js";
import { acceptDelivery, getDelivery, getOnTheWay } from "../controllers/delivery.controller.js";

const router = express.Router();

router.post("/getDelivery", requireAuth, getDelivery);
router.post("/acceptDelivery", requireAuth, acceptDelivery);
router.post("/getOnTheWay", requireAuth, getOnTheWay);

export default router;