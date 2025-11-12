import express from "express";
import requireAuth from "../utils/check.js";
import { banShop, banCarrier, blockUser } from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/banShop", requireAuth, banShop);
router.post("/banCarrier", requireAuth, banCarrier);
router.post("/blockUser", requireAuth, blockUser);

export default router;
