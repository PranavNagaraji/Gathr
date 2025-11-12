import express from "express";
import requireAuth, { adminEmailGate } from "../utils/check.js";
import { banShop, banCarrier, blockUser, searchUsers, searchShops, sendAdminMail } from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/banShop", adminEmailGate, banShop);
router.post("/banCarrier", adminEmailGate, banCarrier);
router.post("/blockUser", adminEmailGate, blockUser);
router.get("/search/users", adminEmailGate, searchUsers);
router.get("/search/shops", adminEmailGate, searchShops);
router.post("/mail", adminEmailGate, sendAdminMail);

export default router;
