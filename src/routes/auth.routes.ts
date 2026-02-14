import { Router } from "express";
import authenticateController from "../controllers/auth.controller";

const router = Router();

router.post("/register", authenticateController.authController);
router.post("/login", authenticateController.loginController);
router.post("/firebase", authenticateController.firebaseAuthController);
export default router;