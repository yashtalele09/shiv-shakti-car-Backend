import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./DB/config";
import authRoutes from "./routes/auth.routes";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
