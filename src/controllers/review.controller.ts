import { Request, Response } from "express";
import reviewService from "../services/review.services";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const addReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { review, rating } = req.body;

    const files = req.files as Express.Multer.File[] | undefined;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (!review || !rating) {
      res.status(400).json({
        success: false,
        message: "Review and rating are required.",
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
      return;
    }

    // Upload images to Cloudinary
    let uploadedUrls: string[] = [];

    if (files && files.length > 0) {
      uploadedUrls = await Promise.all(
        files.map((file) =>
          uploadToCloudinary(file.buffer, "reviews", "image").then(
            (result) => result.secure_url
          )
        )
      );
    }

    const newReview = await reviewService.addReviewService({
      userId,
      review,
      rating: Number(rating),
      images: uploadedUrls,
    });

    res.status(201).json({
      success: true,
      message: "Review added successfully.",
      review: {
        reviewId: newReview.reviewId,
        userId: newReview.userId,
        review: newReview.review,
        rating: newReview.rating,
        images: newReview.images,
        createdAt: newReview.createdAt,
      },
    });
  } catch (error) {
    console.error("Add Review Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await reviewService.getReviewsService();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const reviewController = {
  addReview,
  getReviews,
};

export default reviewController;
