import express from "express";
import requireAuth from "../utils/check.js";
import { add_items, add_shop } from "../controllers/merchant.controller.js";

const router = express.Router();

router.post("/add_shop",requireAuth,add_shop);
router.get("/add_items",requireAuth,add_items);

export default router;