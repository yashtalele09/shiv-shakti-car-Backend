import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { adminAuthConfig } from "../config/auth";
import Admin from "../models/admin";

interface AuthRequest extends Request {
  admin?: {
    email: string;
  };
}

export const authenticateAdmin: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, adminAuthConfig.jwtSecret) as {
      email: string;
      };
      
      console.log(decoded.email)

    // 🔥 Replace Prisma with Mongoose
    const admin = await Admin.findOne({ email: decoded.email }).select("email");

    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    req.admin = {
      email: admin.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
