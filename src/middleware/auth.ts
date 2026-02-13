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

export const authenticate: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {``
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, authConfig.jwtSecret) as {
      id: string;
      email: string;
    };

    // 🔥 Replace Prisma with Mongoose
    const user = await User.findById(decoded.id).select("id email");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
