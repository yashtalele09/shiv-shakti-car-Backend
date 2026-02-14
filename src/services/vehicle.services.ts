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

const getAllVehicle = async () => {
    try {
        const vehicleData = await vehicle.find();
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
