import express from "express";
import requireAuth from "../utils/check.js";
import { acceptDelivery, createCarrier, getCarrier, getDelivery, getOnTheWay, completeDelivery, getAllOrders } from "../controllers/delivery.controller.js";


const router = express.Router();

router.post("/getDelivery", requireAuth, getDelivery);
router.post("/acceptDelivery", requireAuth, acceptDelivery);
router.post("/getOnTheWay", requireAuth, getOnTheWay);
router.get('/getCarrier/:carrierId', requireAuth, getCarrier);
router.post('/updateCarrier', requireAuth,createCarrier);
router.post('/completeDelivery', requireAuth, completeDelivery);
router.get('/getAllOrders/:clerkId', requireAuth, getAllOrders);

export default router;