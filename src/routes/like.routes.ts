import { Router } from "express";
import LikeController from "../controllers/like.controller";
import { optionalAuth } from "../middleware/optional";

const router = Router();

router.post("/toggle-like", optionalAuth, LikeController.toggleLikeController);

router.get("/get-like", optionalAuth, LikeController.getLikeStatusController);

router.get(
  "/get-bulk-likes",
  optionalAuth,
  LikeController.getBulkLikesController
);

router.get("/my-likes", optionalAuth, LikeController.getMyLikesController);

export default router;
