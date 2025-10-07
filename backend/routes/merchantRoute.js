import express from "express";
import requireAuth from "../utils/check.js";
import { add_items, add_shop, getItems, checkShopExists, getShop,showOrders,updateorderStatus } from "../controllers/merchant.controller.js";
import { updateItem, updateShop, deleteShop ,deleteitem } from "../controllers/merchantup.controller.js";


const router = express.Router();

//creation and get routes
router.post("/add_shop",requireAuth,add_shop);
router.post("/add_items",requireAuth,add_items);
router.post("/check_shop_exists", requireAuth, checkShopExists);
router.post("/get_items", requireAuth, getItems);
router.post('/get_item',requireAuth,getItem);
router.post("/get_shop", requireAuth, getShop);
router.post("/show_orders", requireAuth, showOrders);


//delete routes
router.delete('/delete_item', requireAuth, deleteitem);
router.delete('/delete_shop', requireAuth, deleteShop);

//update routes
router.put("/update_shop", requireAuth, updateShop);
router.put("/update_items", requireAuth, updateItem);
router.put("/update_order_status",requireAuth,updateorderStatus)


export default router;