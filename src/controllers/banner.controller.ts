import { Request, Response } from "express";
import bannerService from "../services/banner.services";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import cloudinary from "../config/cloudinary";

const MAX_SLIDES = 3;

const createBannerController = async (req: Request, res: Response) => {
  try {
    const existing = await bannerService.getBannerDoc();
    if (existing.slides.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Banner already exists. Use the update endpoint to modify slides.",
      });
    }

    const file = req.file as Express.Multer.File | undefined;
    const { title, subtitle } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "A banner image is required",
      });
    }

    const uploadResult = await uploadToCloudinary(
      file.buffer,
      "vehicles",
      "image"
    );

    const banner = await bannerService.createBannerDoc([
      {
        imageUrl: uploadResult.secure_url,
        imagePublicId: uploadResult.public_id,
        title,
        subtitle,
      },
    ]);

    return res.status(201).json({ success: true, data: banner.slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create banner";
    return res.status(400).json({ success: false, message });
  }
};

const upsertSlideController = async (req: Request, res: Response) => {
  try {
    const { index } = req.params; // e.g. PUT /banner/slides/0
    const { title, subtitle } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    const slideIndex = Number(index);
    const banner = await bannerService.getBannerDoc();

    const isNewSlide = slideIndex >= banner.slides.length;
    if (isNewSlide && banner.slides.length >= MAX_SLIDES) {
      return res.status(400).json({
        success: false,
        message: `Maximum of ${MAX_SLIDES} slides allowed`,
      });
    }

    const existingSlide = banner.slides[slideIndex];

    if (isNewSlide && !file) {
      return res
        .status(400)
        .json({ success: false, message: "Image is required for a new slide" });
    }

    let imageUrl = existingSlide?.imageUrl;
    let imagePublicId = existingSlide?.imagePublicId;

    if (file) {
      const uploadResult = await uploadToCloudinary(
        file.buffer,
        "vehicles",
        "image"
      );
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;

      if (existingSlide?.imagePublicId) {
        await cloudinary.uploader.destroy(existingSlide.imagePublicId);
      }
    }

    const slideData = {
      title: title ?? existingSlide?.title,
      subtitle: subtitle ?? existingSlide?.subtitle,
      imageUrl,
      imagePublicId,
    };

    const updatedBanner = await bannerService.updateSlide(
      slideIndex,
      slideData
    );
    return res.status(200).json({ success: true, data: updatedBanner.slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save slide";
    return res.status(400).json({ success: false, message });
  }
};

const getSlidesController = async (req: Request, res: Response) => {
  try {
    const banner = await bannerService.getBannerDoc();
    return res.status(200).json({ success: true, data: banner.slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch slides";
    return res.status(400).json({ success: false, message });
  }
};

const deleteSlideController = async (req: Request, res: Response) => {
  try {
    const { index } = req.params;
    const banner = await bannerService.deleteSlide(Number(index));
    return res.status(200).json({ success: true, data: banner.slides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete slide";
    return res.status(400).json({ success: false, message });
  }
};
const BannerController = {
  createBannerController,
  upsertSlideController,
  getSlidesController,
  deleteSlideController,
};

export default BannerController;
