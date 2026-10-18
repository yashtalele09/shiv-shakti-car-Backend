import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const vehicleSchema = new mongoose.Schema(
  {
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
      required: true,
    },
    vehicle_varient: {
      type: String,
      required: true,
    },
    vehicle_color: {
      type: String,
      required: true,
    },
    vehicle_location: {
      type: String,
      required: true,
    },
    vehicle_price: {
      type: Number,
      required: true,
    },
    kilometers_driven: {
      type: Number,
      required: true,
    },
    owner_count: {
      type: Number,
      required: true,
    },
    fuel_type: {
      type: String,
      required: true,
    },
    transmission_type: {
      type: String,
      required: true,
    },
    body_type: {
      type: String,
      required: true,
    },
    registration_year: {
      type: Number,
      required: true,
    },
    insurance_validity: {
      type: Date,
      required: true,
    },
    vehicle_description: {
      type: String,
      required: true,
    },
    vehicle_images_video: {
      type: Array,
      required: true,
    },
    vehicle_type: {
      type: String,
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },

    owner_name: {
      type: String,
      trim: true,
    },

    isSold: {
      type: Boolean,
      default: false,
    },
    sold_price: {
      type: Number,
      default: null,
    },
    sold_date: {
      type: Date,
      default: null,
    },
    isReturn: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Vehicle", vehicleSchema);
