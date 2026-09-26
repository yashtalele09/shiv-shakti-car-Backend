import { Schema, model, Document } from "mongoose";

export interface ISlide {
  imageUrl: string;
  imagePublicId: string;
  title: string;
  subtitle: string;
}

export interface IBanner extends Document {
  slides: ISlide[];
  createdAt: Date;
  updatedAt: Date;
}

const slideSchema = new Schema<ISlide>(
  {
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    subtitle: {
      type: String,
      required: [true, "Subtitle is required"],
      trim: true,
      maxlength: 200,
    },
  },
  { _id: false } // slides don't need their own ObjectId
);

const bannerSchema = new Schema<IBanner>(
  {
    slides: {
      type: [slideSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const Banner = model<IBanner>("Banner", bannerSchema);
