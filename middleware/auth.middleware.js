import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const protectRoute = async (req, res, next) => {
  try {
    // get token
    const authHeader = req.header("Authorization"); // "Bearer <token>"

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No authentication token, access denied" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No authentication token, access denied" });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // your token payload may be { id: "..."} or { userId: "..." }
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Token payload is invalid" });
    }

    // find user
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Token is not valid" });
    }

    // attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.log("Authentication error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Token is not valid" });
  }
};

export default protectRoute;
