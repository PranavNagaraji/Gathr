import express from "express";
import requireAuth, { adminEmailGate } from "../utils/check.js";
import { banShop, banCarrier, blockUser, searchUsers, searchShops } from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/banShop", requireAuth, banShop);
router.post("/banCarrier", requireAuth, banCarrier);
router.post("/blockUser", requireAuth, blockUser);
router.get("/search/users", adminEmailGate, searchUsers);
router.get("/search/shops", adminEmailGate, searchShops);

export default router;
