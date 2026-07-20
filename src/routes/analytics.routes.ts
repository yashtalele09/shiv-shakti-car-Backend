import { Router } from "express";
import analyticsController from "../controllers/analytics.controller";

const router = Router();

router.post("/user-analytics", analyticsController.trackAnalytics);
router.get(
  "/get-dashboard-analytics",
  analyticsController.getAnalyticsDashboard
);
router.get("/get-analytics", analyticsController.getAnalytics);

export default router;
