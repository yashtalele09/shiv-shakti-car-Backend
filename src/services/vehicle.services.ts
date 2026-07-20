import vehicle from "../models/vehicle";

const createVehicle = async (data: {}) => {
  try {
    const vehicleData = await vehicle.create(data);
    return vehicleData;
  } catch (error) {
    throw error;
  }
};

const getVehicleById = async (vehicle_id: string) => {
  try {
    const vehicleData = await vehicle.findOne({ vehicle_id });
    return vehicleData;
  } catch (error) {
    throw error;
  }
};

const getAllVehicle = async (
  query: {},
  sortOptions: {},
  skip: number,
  limit: number
) => {
  try {
    const vehicleData = await vehicle
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    return vehicleData;
  } catch (error) {
    throw error;
  }
};

const getAllFeaturedVehicle = async (body_type: string) => {
  try {
    const query: any = {};
    if (body_type && (body_type as string).toLowerCase() !== "all") {
      query.body_type = { $regex: body_type as string, $options: "i" };
    }
    const vehicleData = await vehicle.find({
      ...query,
      isFeatured: true,
    });
    return vehicleData;
  } catch (error) {
    throw error;
  }
};

const updateVehicleById = async (id: string, data: {}) => {
  try {
    const vehicleData = await vehicle.findByIdAndUpdate(id, data, {
      new: true,
    });
    return vehicleData;
  } catch (error) {
    throw error;
  }
};

const deleteVehicleById = async (id: string) => {
  try {
    const vehicleData = await vehicle.findByIdAndDelete(id);
    return vehicleData;
  } catch (error) {
    throw error;
  }
};

const vehicleService = {
  createVehicle,
  getVehicleById,
  getAllVehicle,
  updateVehicleById,
  deleteVehicleById,
  getAllFeaturedVehicle,
};

export default vehicleService;
