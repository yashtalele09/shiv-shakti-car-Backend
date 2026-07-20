import { Router } from "express";
import inquiryController from "../controllers/inquiryform.controller";

const router = Router();

// Public
router.post("/create-inquiry", inquiryController.createInquiry);
router.get("/check-status", inquiryController.checkInquiryStatus);

// Admin
router.get("/get-inquiry", inquiryController.getInquiries);
router.get("/get-inquiry-by-id", inquiryController.getInquiryById);
router.patch("/update-status", inquiryController.updateInquiryStatus);

export default router;
