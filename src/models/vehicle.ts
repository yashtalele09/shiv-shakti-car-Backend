import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const vehicleSchema = new mongoose.Schema({
    vehicle_id: {
        type: String,
        required: true,
        default: uuidv4,
    },
    vehicle_model: {
        type: String,
        required: true,
    },
    vehicle_brand: {
        type: String,
        require: true
    },
    vehicle_varient: {
        type: String,
        require: true
    },
    vehicle_color: {
        type: String,
        require: true
    },
    vehicle_location: {
        type: String,
        require: true
    },
    vehicle_price: {
        type: Number,
        require: true
    },
    kilometers_driven: {
        type: Number,
        require: true
    },
    owner_count: {
        type: String,
        require: true
    },
    fuel_type: {
        type: String,
        require: true
    },
    transmission_type: {
        type: String,
        require: true
    },
    body_type: {
        type: String,
        require: true
    },
    registration_year: {
        type: Number,
        require: true
    },
    insurance_validity: {
        type: Date,
        require: true
    },
    vehicle_description: {
        type: String,
        require: true
    },
    vehicle_images_video: {
        type: Array,
        require: true
    },
    vehicle_type: {
        type: String,
        require: true
    },
}, {
    timestamps: true,
})

export default mongoose.model("Vehicle", vehicleSchema);
