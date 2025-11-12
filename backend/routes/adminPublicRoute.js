import express from "express";
import { adminEmailGate } from "../utils/check.js";
import { searchUsers, searchShops } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/search/users", adminEmailGate, searchUsers);
router.get("/search/shops", adminEmailGate, searchShops);

export default router;
