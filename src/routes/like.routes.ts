import { Router } from "express";
import LikeController from "../controllers/like.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/toggle-like", authenticate, LikeController.toggleLikeController);

router.get("/get-like", authenticate, LikeController.getLikeStatusController);

router.get("/get-bulk-likes", LikeController.getBulkLikesController);

router.get("/my-likes", authenticate, LikeController.getMyLikesController);

export default router;
