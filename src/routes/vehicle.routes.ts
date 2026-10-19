import { Router } from "express";
import vehicleController from "../controllers/vehicle.controller";
import { authenticateAdmin } from "../middleware/admin";
import { upload } from "../middleware/upload";

const router = Router();

router.post(
  "/create-vehicle",
  upload.array("vehicle_images_video", 10),
  vehicleController.createVehicleController
);
router.get("/get-all-vehicle", vehicleController.getAllVehicle);
router.get("/get-vehicle-by-id", vehicleController.getVehicleById);
router.get(
  "/get-all-featured-vehicle",
  vehicleController.getAllFeaturedVehicle
);
router.post(
  "/update-vehicle-by-id",
  authenticateAdmin,
  vehicleController.updateVehicleById
);
router.post(
  "/delete-vehicle-by-id",
  authenticateAdmin,
  vehicleController.deleteVehicleById
);

export default router;
