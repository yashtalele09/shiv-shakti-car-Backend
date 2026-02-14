import vehicleService from "../services/vehicle.services";
import { Request, Response } from "express";

const createVehicleController = async (req: Request, res: Response) => {
    try {
        const {
                vehicle_model,
                vehicle_brand,
                vehicle_varient,
                vehicle_color,
                vehicle_location,
                vehicle_price,
                kilometers_driven,
                owner_count,
                fuel_type,
                transmission_type,
                body_type,
                registration_year,
                insurance_validity,
                vehicle_description,
                vehicle_images_video,
                vehicle_type
        } = req.body;
        
        if (!vehicle_model || !vehicle_brand || !vehicle_varient || !vehicle_color || !vehicle_location || !vehicle_price || !kilometers_driven || !owner_count || !fuel_type || !transmission_type || !body_type || !registration_year || !insurance_validity || !vehicle_description || !vehicle_images_video || !vehicle_type) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const vehicleData = await vehicleService.createVehicle({
                vehicle_model,
                vehicle_brand,
                vehicle_varient,
                vehicle_color,
                vehicle_location,
                vehicle_price,
                kilometers_driven,
                owner_count,
                fuel_type,
                transmission_type,
                body_type,
                registration_year,
                insurance_validity,
                vehicle_description,
                vehicle_images_video,
                vehicle_type
        });
        res.status(201).json({ success: true, message: "Vehicle created successfully", vehicleData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const vehicleController = {
    createVehicleController,
};

export default vehicleController;
