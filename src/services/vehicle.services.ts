import vehicle from "../models/vehicle";

const createVehicle = async (data: {}) => {
    try {
        const vehicleData = await vehicle.create(data);
        return vehicleData;
    } catch (error) {
        throw error;
    }
};

const getVehicleById = async (id: string) => {
    try {
        const vehicleData = await vehicle.findById(id);
        return vehicleData;
    } catch (error) {
        throw error;
    }
};

const getAllVehicle = async (query: {}, sortOptions: {}, skip: number, limit: number) => {
    try {
        const vehicleData = await vehicle.find(query).sort(sortOptions).skip(skip).limit(limit);
        return vehicleData;
    } catch (error) {
        throw error;
    }
};


const updateVehicleById = async (id: string, data: {}) => {
    try {
        const vehicleData = await vehicle.findByIdAndUpdate(id, data, { new: true });
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
};

export default vehicleService;
