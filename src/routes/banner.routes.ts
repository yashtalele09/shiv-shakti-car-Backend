import { Router } from "express";
import BannerController from "../controllers/banner.controller";
import { authenticateAdmin } from "../middleware/admin";
import { upload } from "../middleware/upload";

const router = Router();

router.post(
  "/create-banner",
  upload.single("image"),
  BannerController.createBannerController
);
router.post(
  "/update-banner/:index",
  upload.single("image"),
  BannerController.upsertSlideController
);
router.get("/get-banner", BannerController.getSlidesController);
router.delete(
  "/delete-banner/:index",
  authenticateAdmin,
  BannerController.deleteSlideController
);

export default router;
