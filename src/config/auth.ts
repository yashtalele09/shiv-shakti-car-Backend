import dotenv from "dotenv";

dotenv.config();

if (!process.env.JWT_SECRET_KEY) {
  throw new Error("JWT_SECRET_KEY is not defined in environment variables");
}

if (!process.env.JWT_ADMIN_SECRET_KEY) {
  throw new Error("JWT_ADMIN_SECRET_KEY is not defined in environment variables");
}

export const authConfig = {
  jwtSecret: process.env.JWT_SECRET_KEY,
  jwtExpiresIn: "24h",
  bcryptSaltRounds: 10,
} as const;

export const adminAuthConfig = {
  jwtSecret: process.env.JWT_ADMIN_SECRET_KEY,
  jwtExpiresIn: "24h",
  bcryptSaltRounds: 10,
} as const;