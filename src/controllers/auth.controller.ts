import { Request, Response } from "express";
import authService from "../services/auth.services";
import bcrypt from "bcrypt";
import { authConfig } from "../config/auth";
import jwt from "jsonwebtoken";

export const authController = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingUser = await authService.getOneUserByEmail(email);

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await authService.createUser({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
    });
    res
      .status(201)
      .json({ success: true, message: "User created successfully", token });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
