import requireAuth from "../utils/check.js";
import express from "express";
import { addComments, addRating, addToCart, deleteFromCart, getCurrentCart, getLocalShops, getShopItems, getUserId } from "../controllers/customer.controller.js";
import { getComments, deleteComment, getitem, getAddressesByUser, addAddress, deleteAddress, updateAddress } from "../controllers/customer2.controller.js";
import { getcarthistory, getcartitems } from "../controllers/customer2.controller.js";
import { getRating } from "../controllers/customer3.contoller.js";

const router = express.Router();

router.get("/getUserId/:clerkId", requireAuth, getUserId);

router.post("/getShops", getLocalShops);
router.get("/getShopItem/:shopId", getShopItems);
router.post("/addComment", requireAuth, addComments);
router.post("/addRating", requireAuth, addRating);
router.post("/getRating", requireAuth, getRating);

router.get("/getComments/:itemId", getComments);
router.post("/deleteComment", requireAuth, deleteComment);
router.get("/getItem/:itemId", getitem);

router.post("/getCart", requireAuth, getCurrentCart);
router.post("/addToCart", requireAuth, addToCart);
router.post("/deleteFromCart", requireAuth, deleteFromCart);

router.get("/getAddressesByUser/:clerkId", requireAuth, getAddressesByUser);
router.post("/addAddress", requireAuth, addAddress);
router.post("/deleteAddress", requireAuth, deleteAddress);
router.post("/updateAddress", requireAuth, updateAddress);

router.get("/getcarthistory/:clerkId", requireAuth, getcarthistory);
router.post("/getcartitems", requireAuth, getcartitems);

export default router;