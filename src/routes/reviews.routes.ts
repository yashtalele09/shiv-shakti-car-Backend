import { Router } from "express";
import reviewController from "../controllers/review.controller";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post(
  "/add-review",
  authenticate,
  upload.array("images", 5),
  reviewController.addReview
);
router.get("/get-reviews", reviewController.getReviews);

export default router;
