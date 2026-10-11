import { Request, Response } from "express";
import { validate as isUuid } from "uuid";
import likeService, { Actor } from "../services/like.services";

// Logged-in user -> req.user (set by auth middleware)
// Guest          -> `x-guest-id` header (uuid generated on the frontend)
const getActor = (req: Request): Actor | null => {
  const user = (req as any).user;
  const userId = user?.id ?? user?._id;
  if (userId) return { type: "user", id: String(userId) };

  const guestId = req.header("x-guest-id");
  if (guestId && isUuid(guestId)) return { type: "guest", id: guestId };

  return null;
};

const toggleLikeController = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    if (!actor) {
      return res.status(400).json({
        success: false,
        message: "Login or a valid x-guest-id header is required",
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
    const message =
      error instanceof Error ? error.message : "Failed to toggle like";
    return res.status(400).json({ success: false, message });
  }
};

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
    const message =
      error instanceof Error ? error.message : "Failed to fetch like status";
    return res.status(400).json({ success: false, message });
  }
};

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
    const message =
      error instanceof Error ? error.message : "Failed to fetch likes";
    return res.status(400).json({ success: false, message });
  }
};

const getMyLikesController = async (req: Request, res: Response) => {
  try {
    const actor = getActor(req);
    if (!actor) {
      return res.status(400).json({
        success: false,
        message: "Login or a valid x-guest-id header is required",
      });
    }

    const vehicleIds = await likeService.getMyLikedVehicleIds(actor);
    return res.status(200).json({ success: true, data: { vehicleIds } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch your likes";
    return res.status(400).json({ success: false, message });
  }
};

const LikeController = {
  toggleLikeController,
  getLikeStatusController,
  getBulkLikesController,
  getMyLikesController,
};

export default LikeController;
