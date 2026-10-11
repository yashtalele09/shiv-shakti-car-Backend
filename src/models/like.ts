import mongoose, { Schema, Document } from "mongoose";

export interface ILike extends Document {
  userId?: string | null;
  guestId?: string | null;
  vehicleId: string;
  createdAt: Date;
  updatedAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    userId: {
      type: String,
      ref: "User",
      default: null,
    },
    guestId: {
      type: String,
      default: null,
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

likeSchema.index(
  { userId: 1, vehicleId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "string" } },
  }
);

likeSchema.index(
  { guestId: 1, vehicleId: 1 },
  {
    unique: true,
    partialFilterExpression: { guestId: { $type: "string" } },
  }
);

const Like = mongoose.model<ILike>("Like", likeSchema);

export default Like;
