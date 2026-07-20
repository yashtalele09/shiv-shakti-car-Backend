import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./DB/config";
import authRoutes from "./routes/auth.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import analyticsRoutes from "./routes/analytics.routes";
import {
  connectRedis,
  disconnectRedis,
  isRedisConnected,
} from "./config/redis";
import reviewsRoutes from "./routes/reviews.routes";
import inquiryRoutes from "./routes/inquiry.routes";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/auth", authRoutes);
app.use("/vehicle", vehicleRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/reviews", reviewsRoutes);
app.use("/inquiry", inquiryRoutes);

const start = async () => {
  try {
    dotenv.config();
    connectDB();
    await connectRedis();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        await disconnectRedis();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

process.on("uncaughtException", async (err) => {
  console.error(err);
  await disconnectRedis();
  process.exit(1);
});

process.on("unhandledRejection", async (err) => {
  console.error(err);
  await disconnectRedis();
  process.exit(1);
});

start();
