import {Router} from "express";
import vehicleController from "../controllers/vehicle.controller";
import { authenticateAdmin } from "../middleware/admin";

const router = Router();

router.post("/create-vehicle", authenticateAdmin ,vehicleController.createVehicleController);

export default router;
