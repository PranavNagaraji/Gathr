import express from "express";
import requireAuth from "../utils/check.js";
import { acceptDelivery, createCarrier, getCarrier, getDelivery, getOnTheWay } from "../controllers/delivery.controller.js";


const router = express.Router();

router.post("/getDelivery", requireAuth, getDelivery);
router.post("/acceptDelivery", requireAuth, acceptDelivery);
router.post("/getOnTheWay", requireAuth, getOnTheWay);
router.get('/getCarrier/:carrierId', requireAuth, getCarrier);
router.post('/updateCarrier', requireAuth,createCarrier);

export default router;