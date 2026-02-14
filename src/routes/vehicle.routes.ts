import {Router} from "express";
import vehicleController from "../controllers/vehicle.controller";
import { authenticateAdmin } from "../middleware/admin";

const router = Router();

router.post("/create-vehicle", authenticateAdmin ,vehicleController.createVehicleController);
router.get("/get-all-vehicle", vehicleController.getAllVehicle);
router.get("/get-vehicle-by-id", vehicleController.getVehicleById);
router.post("/update-vehicle-by-id", authenticateAdmin ,vehicleController.updateVehicleById);
router.post("/delete-vehicle-by-id", authenticateAdmin ,vehicleController.deleteVehicleById);

export default router;
