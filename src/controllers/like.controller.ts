import { Request, Response } from "express";
import likeService, { Actor, ValidationError } from "../services/like.services";

// Only logged-in users (req.user is set by the auth middleware)
const getActor = (req: Request): Actor | null => {
  const user = (req as any).user;
  const userId = user?.id ?? user?._id;
  return userId ? { type: "user", id: String(userId) } : null;
};

// 400 for validation problems, 500 for everything else
const handleError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`[LikeController] ${fallback}:`, error);
  return res.status(500).json({ success: false, message: fallback });
};

const toggleLikeController = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Please log in to like a vehicle",
      });
    }

    const { vehicleId } = req.query;
    if (!vehicleId) {
      return res
        .status(400)
        .json({ success: false, message: "vehicleId query param is required" });
    }

    const data = await likeService.toggleLike(vehicleId as string, actor);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to toggle like");
  }
};

// Public: logged-out users still see the count, `liked` is just false
const getLikeStatusController = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.query;
    if (!vehicleId) {
      return res
        .status(400)
        .json({ success: false, message: "vehicleId query param is required" });
    }

    const data = await likeService.getLikeStatus(
      vehicleId as string,
      getActor(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to fetch like status");
  }
};

// Public: same as above
const getBulkLikesController = async (req: Request, res: Response) => {
  try {
    const ids = String(req.query.ids ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "ids query param is required" });
    }

    const data = await likeService.getBulkLikes(ids, getActor(req));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Failed to fetch likes");
  }
};

const getMyLikesController = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    if (!actor) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view your likes",
      });
    }

    const vehicleIds = await likeService.getMyLikedVehicleIds(actor);
    return res.status(200).json({ success: true, data: { vehicleIds } });
  } catch (error) {
    return handleError(res, error, "Failed to fetch your likes");
  }
};

const LikeController = {
  toggleLikeController,
  getLikeStatusController,
  getBulkLikesController,
  getMyLikesController,
};

export default LikeController;
