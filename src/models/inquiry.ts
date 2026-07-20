import mongoose, { Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export type InquiryStatus = "Pending" | "Received" | "Contacted" | "Resolved";

export interface IInquiry extends Document {
  inquiryId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new mongoose.Schema<IInquiry>(
  {
    inquiryId: {
      type: String,
      required: true,
      default: () => uuidv4(),
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Received", "Contacted", "Resolved"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

inquirySchema.index({ email: 1 });
inquirySchema.index({ createdAt: -1 });

const Inquiry: Model<IInquiry> = mongoose.model<IInquiry>(
  "Inquiry",
  inquirySchema
);

export default Inquiry;
