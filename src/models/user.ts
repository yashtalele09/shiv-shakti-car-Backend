import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      default: uuidv4,
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    phone: {
      type: String,
    },

    password: {
      type: String,
      select: false,
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    firebaseUid: {
      type: String,
    },

    profilePicture: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
