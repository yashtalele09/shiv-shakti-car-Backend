import { Router } from "express";
import authenticateController from "../controllers/auth.controller";

const router = Router();

router.post("/register", authenticateController.authController);
router.post("/verify-otp", authenticateController.verifyOtp);
router.post("/resend-otp", authenticateController.resendOtp);
router.post("/login", authenticateController.loginController);
router.post("/firebase", authenticateController.firebaseAuthController);
router.post("/forgot-password", authenticateController.forgotPassword);
router.post("/reset-password", authenticateController.resetPassword);
router.post("/reset-verify-otp", authenticateController.resetVerifyOtp);

router.use("/admin-login", authenticateController.adminLoginController);
export default router;
