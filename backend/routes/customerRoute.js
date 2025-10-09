import requireAuth from "../utils/check.js";
import express from "express";
import { addComments, addRating, addToCart, deleteFromCart, fetchComments, getCurrentCart, getLocalShops, getShopItems } from "../controllers/customer.controller.js";

const router=express.Router();

router.post("/getShops", getLocalShops);
router.get("/getShopItem/:shopId", getShopItems);
router.post("/addComment", requireAuth, addComments);
router.get("/getComments/:itemId", fetchComments);
router.post("/addRating", requireAuth, addRating);

router.post("/getCart", requireAuth, getCurrentCart);
router.post("/addToCart", requireAuth, addToCart);
router.post("/deleteFromCart", requireAuth, deleteFromCart);

export default router;