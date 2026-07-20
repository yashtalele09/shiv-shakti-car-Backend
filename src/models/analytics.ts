import mongoose from "mongoose";

const eventTypeEnum = [
  "page_view",
  "vehicle_view",
  "filter_used",
  "favorite",
  "enquiry",
  "test_drive",
];

const analyticsSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },

    userId: {
      type: String,
      default: null,
    },

    eventType: {
      type: String,
      enum: eventTypeEnum,
      required: true,
    },

    vehicleId: {
      type: String,
      default: null,
    },

    page: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Analytics", analyticsSchema);
