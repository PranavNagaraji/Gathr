import requireAuth from "../utils/check.js";
import express from "express";
import { addComments, addRating, fetchComments, getLocalShops, getShopItems } from "../controllers/customer.controller.js";

const router=express.Router();

router.post("/getShops", getLocalShops);
router.get("/getShopItem/:shopId", getShopItems);
router.post("/addComment", requireAuth, addComments);
router.get("/getComments/:itemId", fetchComments);
router.post("/addRating", requireAuth, addRating);

export default router;