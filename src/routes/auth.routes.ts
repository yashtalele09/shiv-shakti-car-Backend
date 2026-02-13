import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "middleware/auth";

const router = Router();

router.post("/register", authController);

export default router;
