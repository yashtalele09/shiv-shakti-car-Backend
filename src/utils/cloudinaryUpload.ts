import { UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary";

type ResourceType = "image" | "video" | "raw" | "auto";

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: ResourceType = "auto"
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!);
      }
    );
    stream.end(buffer);
  });
};
