import mongoose from "mongoose";

export default async function connectDB(MONGO_URI) {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected:", conn.connection.host);
  } catch (err) {
    console.error("MongoDB connect error:", err.message);
    process.exit(1);
  }
}
