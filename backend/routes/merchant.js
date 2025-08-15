import express from "express";
import requireAuth from "../utils/check.js";
import { add_items, add_shop, getItems, checkShopExists, getShop } from "../controllers/merchant.controller.js";
import { updateItem, updateShop } from "../controllers/merchantup.controller.js";


const router = express.Router();

//creation and get routes
router.post("/add_shop",requireAuth,add_shop);
router.post("/add_items",requireAuth,add_items);
router.get("/get_items", requireAuth, getItems);
router.get("/check_shop_exists", requireAuth, checkShopExists);
router.get("/get_shop", requireAuth, getShop);

//update routes
router.put("/update_shop", requireAuth, updateShop);
router.put("/update_items", requireAuth, updateItem);


export default router;