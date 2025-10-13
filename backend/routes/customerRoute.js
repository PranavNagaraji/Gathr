import requireAuth from "../utils/check.js";
import express from "express";
import { addComments, addRating, addToCart, deleteFromCart, getCurrentCart, getLocalShops, getShopItems } from "../controllers/customer.controller.js";
import { getComments, deleteComment, getitem, getAddressesByUser, addAddress, deleteAddress, updateAddress } from "../controllers/customer2.controller.js";

const router = express.Router();

router.post("/getShops", getLocalShops);
router.get("/getShopItem/:shopId", getShopItems);
router.post("/addComment", requireAuth, addComments);
router.post("/addRating", requireAuth, addRating);


router.get("/getComments/:itemId", getComments);
router.delete("/deleteComment", requireAuth, deleteComment);
router.get("/getItem/:itemId", getitem);

router.post("/getCart", requireAuth, getCurrentCart);
router.post("/addToCart", requireAuth, addToCart);
router.post("/deleteFromCart", requireAuth, deleteFromCart);

router.get("/getAddressesByUser/:clerkId", requireAuth, getAddressesByUser);
router.post("/addAddress", requireAuth, addAddress);
router.post("/deleteAddress", requireAuth, deleteAddress);
router.post("/updateAddress", requireAuth, updateAddress);
export default router;