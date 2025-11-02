import requireAuth from "../utils/check.js";
import express from "express";
import { addComments, addRating, addToCart, deleteFromCart, getCurrentCart, getLocalShops, getShopItems, getUserId, getShopById, searchLocalItems, getShopOwnerInfo } from "../controllers/customer.controller.js";
import { getComments, deleteComment, getitem, getAddressesByUser, addAddress, deleteAddress, updateAddress, getItemsByIds, getWishlist, addToWishlist, removeFromWishlist, getWishlistCount, getOrderByCart } from "../controllers/customer2.controller.js";
import { getcarthistory, getcartitems } from "../controllers/customer2.controller.js";
import { getRating, getRecommendations, getSimilarItems, canRate } from "../controllers/customer3.contoller.js";

const router = express.Router();

router.get("/getUserId/:clerkId", requireAuth, getUserId);

router.post("/getShops", getLocalShops);
router.get("/getShopItem/:shopId", getShopItems);
router.post("/searchLocalItems", searchLocalItems);

router.post("/addComment", requireAuth, addComments);
router.post("/addRating", requireAuth, addRating);
router.post("/getRating", requireAuth, getRating);
router.post("/canRate", requireAuth, canRate);
router.get("/recommendations/:clerkId", requireAuth, getRecommendations);
router.get("/items/:itemId/similar", getSimilarItems);

router.get("/getComments/:itemId", getComments);
router.post("/deleteComment", requireAuth, deleteComment);
router.get("/getItem/:itemId", getitem);

router.post("/getCart", requireAuth, getCurrentCart);
router.post("/addToCart", requireAuth, addToCart);
router.post("/deleteFromCart", requireAuth, deleteFromCart);

// Shop details
router.get("/getShop/:shopId", getShopById);
router.get("/getShopOwnerInfo/:shopId", getShopOwnerInfo);

router.get("/getAddressesByUser/:clerkId", requireAuth, getAddressesByUser);
router.post("/addAddress", requireAuth, addAddress);
router.post("/deleteAddress", requireAuth, deleteAddress);
router.post("/updateAddress", requireAuth, updateAddress);

router.get("/getcarthistory/:clerkId", requireAuth, getcarthistory);
router.post("/getcartitems", requireAuth, getcartitems);
router.post("/getItemsByIds", getItemsByIds);
router.post("/orders/getByCart", requireAuth, getOrderByCart);

router.post("/wishlist/list", requireAuth, getWishlist);
router.post("/wishlist/add", requireAuth, addToWishlist);
router.post("/wishlist/remove", requireAuth, removeFromWishlist);
router.post("/wishlist/count", requireAuth, getWishlistCount);

export default router;