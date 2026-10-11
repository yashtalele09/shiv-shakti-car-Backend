import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth";
import User from "../models/user";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Sets req.user when a valid token is present, otherwise continues as a guest.
// Never blocks the request.
export const optionalAuth: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // No token -> guest, just continue
    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, authConfig.jwtSecret) as {
      id: string;
      email: string;
    };

    const user = await User.findById(decoded.id).select("_id email");

    if (user) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
      };
    }

    return next();
  } catch (error) {
    return next();
  }
};
