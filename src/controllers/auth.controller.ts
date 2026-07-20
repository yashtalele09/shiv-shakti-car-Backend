import { Request, Response } from "express";
import authService from "../services/auth.services";
import bcrypt from "bcrypt";
import { authConfig, adminAuthConfig } from "../config/auth";
import jwt from "jsonwebtoken";
import admin from "../config/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

import { getRedisClient } from "../config/redis";
import { sendOtpEmail } from "../utils/sendEmail";
import { randomBytes } from "crypto";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

const authController = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;

    const existingUser = await authService.getOneUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedPassword = await bcrypt.hash(password, 10);

    const redis = getRedisClient();

    await redis.set(
      `signup:${email}`,
      JSON.stringify({
        name,
        email,
        phone,
        password: hashedPassword,
        otp,
      }),
      {
        EX: 300, // 5 minutes
      }
    );

    // send email here
    await sendOtpEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const redis = getRedisClient();

    const data = await redis.get(`signup:${email}`);

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const userData = JSON.parse(data);

    if (userData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const user = await authService.createUser({
      id: uuidv4(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      isVerified: true,
    });

    await redis.del(`signup:${email}`);

    const token = jwt.sign({ id: user._id }, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
    });

    return res.status(201).json({
      success: true,
      message: "Email verified successfully",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const redis = getRedisClient();

    const data = await redis.get(`signup:${email}`);

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Signup session expired. Please sign up again.",
      });
    }

    const userData = JSON.parse(data);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    userData.otp = otp;

    await redis.set(`signup:${email}`, JSON.stringify(userData), { EX: 300 });

    await sendOtpEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const existingUser = await authService.getOneUserByEmail(email);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const redis = getRedisClient();

    await redis.set(
      `forgot:${email}`,
      JSON.stringify({
        email,
        otp,
        verified: false,
      }),
      {
        EX: 300, // 5 minutes
      }
    );

    await sendOtpEmail(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const resetVerifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const redis = getRedisClient();

    const data = await redis.get(`forgot:${email}`);

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const userData = JSON.parse(data);

    if (userData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    userData.verified = true;
    await redis.set(`forgot:${email}`, JSON.stringify(userData), {
      EX: 300, // 5 minutes
    });

    const resetToken = randomBytes(32).toString("hex");

    await redis.set(`reset:${resetToken}`, userData.email, {
      EX: 300, // 5 minutes
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        resetToken: resetToken,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error,
    });
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    const redis = getRedisClient();

    const email = await redis.get(`reset:${resetToken}`);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const existingUser = await authService.getOneUserByEmail(email);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await authService.updateUser(existingUser.id, {
      password: hashedPassword,
    });

    // Make the token single-use
    await redis.del(`reset:${resetToken}`);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// const updateUser = async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.user?.id;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     const { name, phone, email, password } = req.body;

//     const existingUser = await authService.getOneUserById(userId);

//     if (!existingUser) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const isEmailChanging = email && email !== existingUser.email;

//     // No email change — update everything directly
//     if (!isEmailChanging) {
//       const updates: Record<string, any> = {};

//       if (name) updates.name = name;
//       if (phone) updates.phone = phone;
//       if (password) updates.password = await bcrypt.hash(password, 10);

//       const updatedUser = await authService.updateUser(userId, updates);

//       return res.status(200).json({
//         success: true,
//         message: "Profile updated successfully",
//         user: updatedUser,
//       });
//     }

//     // Email is changing — make sure it's not already taken
//     const emailTaken = await authService.getOneUserByEmail(email);

//     if (emailTaken) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already in use",
//       });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     const redis = getRedisClient();

//     await redis.set(
//       `update:${userId}`,
//       JSON.stringify({
//         userId,
//         name,
//         phone,
//         email,
//         password: password ? await bcrypt.hash(password, 10) : undefined,
//         otp,
//       }),
//       {
//         EX: 300, // 5 minutes
//       }
//     );

//     await sendOtpEmail(email, otp);

//     return res.status(200).json({
//       success: true,
//       message: "OTP sent to new email for verification",
//       requiresVerification: true,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

const firebaseAuthController = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Token missing" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const { email, name, picture, uid } = decodedToken;

    console.log("decodedToken", decodedToken);

    if (!email || !name || !uid) {
      return res.status(400).json({ message: "Invalid Firebase token" });
    }

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
      process.env.JWT_SECRET_KEY as string,
      { expiresIn: "7d" }
    );

    return res.json({
      token: appToken,
      user,
    });
  } catch (error) {
    console.log("FULL FIREBASE ERROR:", error);
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

    const { password: _, ...userWithoutPassword } = user.toObject();

    if (user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: "Please login using Google",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Invalid login method",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign({ id: user._id }, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
    });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: userWithoutPassword,
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

const adminLoginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await authService.getOneAdminByEmail(email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Invalid login method",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign({ email: user.email }, adminAuthConfig.jwtSecret, {
      expiresIn: adminAuthConfig.jwtExpiresIn,
    });

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
  firebaseAuthController,
  adminLoginController,
  forgotPassword,
  resetPassword,
  resetVerifyOtp,
  verifyOtp,
  resendOtp,
};

export default authenticateController;
