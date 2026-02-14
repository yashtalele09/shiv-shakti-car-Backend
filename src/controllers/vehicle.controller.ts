import vehicleService from "../services/vehicle.services";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

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
                vehicle_id: uuidv4(),
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
const getAllVehicle = async (req: Request, res: Response) => { 
  try {
    const { page, limit, search, sort } = req.query;    

    const query: any = {};

    if (search) {
      query.$or = [
        { vehicle_model: { $regex: search as string, $options: "i" } },
        { vehicle_brand: { $regex: search as string, $options: "i" } },
        { vehicle_varient: { $regex: search as string, $options: "i" } },
        { fuel_type: { $regex: search as string, $options: "i" } },
        { transmission: { $regex: search as string, $options: "i" } },
      ];
    }
    const sortOptions: any = {};
    if (sort) {
      sortOptions.vehicle_model = (sort as string) === "asc" ? 1 : -1;
    }

    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const vehicleData = await vehicleService.getAllVehicle(
      query,
      sortOptions,
      skip,
      limitNumber
    );

    res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully",
      vehicleData,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const getVehicleById = async (req: Request, res: Response) => {
    try {
        const { vehicle_id } = req.query;
        if (!vehicle_id) {
            return res.status(400).json({ success: false, message: "Vehicle ID is required" });
        }
        const vehicleData = await vehicleService.getVehicleById(vehicle_id as string);
        res.status(200).json({ success: true, message: "Vehicle fetched successfully", vehicleData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const updateVehicleById = async (req: Request, res: Response) => {
    try {
        const { vehicle_id } = req.query;
        const { vehicle_model, vehicle_brand, vehicle_varient, vehicle_color, vehicle_location, vehicle_price, kilometers_driven, owner_count, fuel_type, transmission_type, body_type, registration_year, insurance_validity, vehicle_description, vehicle_images_video, vehicle_type } = req.body;
        if (!vehicle_id) {
            return res.status(400).json({ success: false, message: "Vehicle ID is required" });
        }
        const vehicleData = await vehicleService.updateVehicleById(vehicle_id as string, {
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
        res.status(200).json({ success: true, message: "Vehicle updated successfully", vehicleData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const deleteVehicleById = async (req: Request, res: Response) => {
    try {
        const { vehicle_id } = req.params;
        if (!vehicle_id) {
            return res.status(400).json({ success: false, message: "Vehicle ID is required" });
        }
        const vehicleData = await vehicleService.deleteVehicleById(vehicle_id as string);
        res.status(200).json({ success: true, message: "Vehicle deleted successfully", vehicleData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}


const vehicleController = {
    createVehicleController,
    getAllVehicle,
    getVehicleById,
    updateVehicleById,
    deleteVehicleById,
};

export default vehicleController;
