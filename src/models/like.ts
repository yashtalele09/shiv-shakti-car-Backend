import mongoose, { Schema, Document } from "mongoose";

export interface ILike extends Document {
  userId: string;
  vehicleId: string;
  createdAt: Date;
  updatedAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: String,
      ref: "Vehicle",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// One like per user per vehicle
likeSchema.index({ userId: 1, vehicleId: 1 }, { unique: true });

const Like = mongoose.model<ILike>("Like", likeSchema);

export default Like;
