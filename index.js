import express from "express";
import cors from "cors";
import "dotenv/config";
import { connectDB } from "./db.js";
import job from "./cron.js"

import authRoutes from "./routes/authRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

job.start();
app.use(cors());
app.use(express.json()); // <-- Postman/Thunder JSON body buradan okunur

app.get("/", (req, res) => res.send("SERVER OK"));

app.use("/api/auth", authRoutes);
app.use("/api/recipes", recipeRoutes);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
