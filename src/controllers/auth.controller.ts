import { Request, Response } from "express";
import authService from "../services/auth.services";
import bcrypt from "bcrypt";
import { authConfig } from "../config/auth";
import jwt from "jsonwebtoken";
import admin from "../config/firebaseAdmin";

const authController = async (req: Request, res: Response) => {
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
    console.error("Error in authController:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const firebaseAuthController = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token missing" });
    }

    // 🔍 Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { email, name, picture, uid } = decodedToken;

    if (!email || !name || !uid) {
      return res.status(400).json({ message: "Invalid Firebase token" });
    }
    // 🔎 Check if user exists
    let user = await authService.getOneUserByEmail(email);

    if (!user) {
      user = await authService.createUser({
        email,
        name,
        profilePicture: picture,
        firebaseUid: uid,
        provider: "google",
      });
    }

    const appToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.json({
      token: appToken,
      user,
    });

  } catch (error) {
    return res.status(401).json({
      message: "Invalid Firebase token",
    });
  }
};


const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await authService.getOneUserByEmail(email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔥 VERY IMPORTANT CHECK
    if (user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: "Please login using Google",
      });
    }

    // 🔥 Check if password exists
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Invalid login method",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiresIn }
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
    });

  } catch (error) {
    console.error("Error in loginController:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


const authenticateController = {
  authController,
  loginController,
  firebaseAuthController
};

export default authenticateController;