import vehicleService from "../services/vehicle.services";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { getRedisClient, isRedisConnected } from "../config/redis";
import { invalidateVehicleListCache } from "../utils/cascheUtils";

const VEHICLE_CACHE_PREFIX = "vehicles:list:";
const VEHICLE_CACHE_TTL = 300;

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
      vehicle_type,
      isFeatured,
    } = req.body;

    const files = req.files as Express.Multer.File[] | undefined;

    if (
      !vehicle_model ||
      !vehicle_brand ||
      !vehicle_varient ||
      !vehicle_color ||
      !vehicle_location ||
      !vehicle_price ||
      !kilometers_driven ||
      !owner_count ||
      !fuel_type ||
      !transmission_type ||
      !body_type ||
      !registration_year ||
      !insurance_validity ||
      !vehicle_description ||
      !vehicle_type ||
      !files ||
      files.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    // Upload each file to Cloudinary and collect their URLs
    const uploadedUrls = await Promise.all(
      files.map((file) => {
        const resourceType = file.mimetype.startsWith("video/")
          ? "video"
          : "image";
        return uploadToCloudinary(file.buffer, "vehicles", resourceType).then(
          (result) => result.secure_url
        );
      })
    );

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
      vehicle_images_video: uploadedUrls, // array of Cloudinary URLs
      vehicle_type,
      isFeatured,
    });

    await invalidateVehicleListCache();

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      vehicleData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllVehicle = async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      sort,
      // String filters
      body_type,
      vehicle_model,
      vehicle_brand,
      vehicle_varient,
      vehicle_color,
      vehicle_location,
      fuel_type,
      transmission_type,
      vehicle_type,
      // Number range filters
      min_price,
      max_price,
      min_km,
      max_km,
      owner_count,
      registration_year,
    } = req.query;

    // ── CACHE KEY ─────────────────────────────────────────────────────
    const cacheKey = `${VEHICLE_CACHE_PREFIX}${JSON.stringify(req.query)}`;

    // ── TRY CACHE FIRST (graceful degradation if Redis is down) ───────
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const cached = await client.get(cacheKey);
        if (cached) {
          res.status(200).json({
            success: true,
            message: "Vehicle fetched successfully",
            vehicleData: JSON.parse(cached),
            cached: true,
          });
          return;
        }
      } catch (cacheErr) {
        console.error("[Redis] GET failed, falling back to DB:", cacheErr);
        // fall through to DB query
      }
    }

    const query: any = {};

    // ── HELPER ────────────────────────────────────────────────────────
    const applyMultiFilter = (query: any, field: string, val: unknown) => {
      if (!val) return;
      const str = (val as string).trim();
      if (!str || str.toLowerCase() === "all") return;

      const values = str
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (values.length === 1) {
        query[field] = { $regex: values[0], $options: "i" };
      } else {
        const orConditions = {
          $or: values.map((v) => ({
            [field]: { $regex: v, $options: "i" },
          })),
        };
        if (!query.$and) query.$and = [];
        query.$and.push(orConditions);
      }
    };

    // ── SEARCH (across all text fields) ──────────────────────────────
    if (search) {
      const searchConditions = {
        $or: [
          { vehicle_model: { $regex: search as string, $options: "i" } },
          { vehicle_brand: { $regex: search as string, $options: "i" } },
          { vehicle_varient: { $regex: search as string, $options: "i" } },
          { vehicle_color: { $regex: search as string, $options: "i" } },
          { vehicle_location: { $regex: search as string, $options: "i" } },
          { fuel_type: { $regex: search as string, $options: "i" } },
          { transmission_type: { $regex: search as string, $options: "i" } },
          { body_type: { $regex: search as string, $options: "i" } },
          { vehicle_type: { $regex: search as string, $options: "i" } },
        ],
      };
      if (!query.$and) query.$and = [];
      query.$and.push(searchConditions);
    }

    // ── STRING FILTERS ────────────────────────────────────────────────
    applyMultiFilter(query, "body_type", body_type);
    applyMultiFilter(query, "vehicle_model", vehicle_model);
    applyMultiFilter(query, "vehicle_brand", vehicle_brand);
    applyMultiFilter(query, "vehicle_varient", vehicle_varient);
    applyMultiFilter(query, "vehicle_color", vehicle_color);
    applyMultiFilter(query, "vehicle_location", vehicle_location);
    applyMultiFilter(query, "fuel_type", fuel_type);
    applyMultiFilter(query, "transmission_type", transmission_type);
    applyMultiFilter(query, "vehicle_type", vehicle_type);

    // ── NUMBER RANGE FILTERS ──────────────────────────────────────────
    if (min_price || max_price) {
      query.vehicle_price = {};
      if (min_price) query.vehicle_price.$gte = Number(min_price);
      if (max_price) query.vehicle_price.$lte = Number(max_price);
    }
    if (min_km || max_km) {
      query.kilometers_driven = {};
      if (min_km) query.kilometers_driven.$gte = Number(min_km);
      if (max_km) query.kilometers_driven.$lte = Number(max_km);
    }
    if (owner_count) {
      query.owner_count = Number(owner_count);
    }
    if (registration_year) {
      query.registration_year = Number(registration_year);
    }

    // ── SORT ──────────────────────────────────────────────────────────
    const sortOptions: any = { isFeatured: -1 };
    if (sort) {
      sortOptions.vehicle_model = (sort as string) === "asc" ? 1 : -1;
    }

    // ── PAGINATION ────────────────────────────────────────────────────
    const isAll = (limit as string)?.toLowerCase() === "all";
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = isAll ? 0 : parseInt(limit as string) || 10;
    const skip = isAll ? 0 : (pageNumber - 1) * limitNumber;

    const vehicleData = await vehicleService.getAllVehicle(
      query,
      sortOptions,
      skip,
      limitNumber
    );

    // ── WRITE TO CACHE (graceful degradation) ──────────────────────────
    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.setEx(
          cacheKey,
          VEHICLE_CACHE_TTL,
          JSON.stringify(vehicleData)
        );
      } catch (cacheErr) {
        console.error(
          "[Redis] SET failed, continuing without cache:",
          cacheErr
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully",
      vehicleData,
      cached: false,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllFeaturedVehicle = async (req: Request, res: Response) => {
  const body_type = req.query.body_type as string;

  try {
    const vehicleData = await vehicleService.getAllFeaturedVehicle(
      body_type as string
    );
    res.status(200).json({
      success: true,
      message: "Featured Vehicle fetched successfully",
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
      return res
        .status(400)
        .json({ success: false, message: "Vehicle ID is required" });
    }
    const vehicleData = await vehicleService.getVehicleById(vehicle_id as any);
    res.status(200).json({
      success: true,
      message: "Vehicle fetched successfully",
      vehicleData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
    console.log(error);
  }
};

const updateVehicleById = async (req: Request, res: Response) => {
  try {
    const { vehicle_id } = req.query;
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
      vehicle_type,
    } = req.body;
    if (!vehicle_id) {
      return res
        .status(400)
        .json({ success: false, message: "Vehicle ID is required" });
    }
    const vehicleData = await vehicleService.updateVehicleById(
      vehicle_id as string,
      {
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
        vehicle_type,
      }
    );
    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      vehicleData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteVehicleById = async (req: Request, res: Response) => {
  try {
    const { vehicle_id } = req.params;
    if (!vehicle_id) {
      return res
        .status(400)
        .json({ success: false, message: "Vehicle ID is required" });
    }
    const vehicleData = await vehicleService.deleteVehicleById(
      vehicle_id as string
    );
    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
      vehicleData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const vehicleController = {
  createVehicleController,
  getAllVehicle,
  getVehicleById,
  updateVehicleById,
  deleteVehicleById,
  getAllFeaturedVehicle,
};

export default vehicleController;
