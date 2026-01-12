import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import cloudinary from "../cloudinary.js";
import Recipe from "../models/recipe.model.js";

const router = express.Router();

// test
router.get("/ping", (req, res) => {
  res.json({ ok: true, msg: "recipes router working" });
});

// Public: highlights
router.get("/highlights", async (req, res) => {
  try {
    const recipes = await Recipe.find()
      .sort({ rating: -1, createdAt: -1 })
      .limit(10)
      .populate("user", "username"); // ✅ profileImage yoksa boşuna isteme

    res.json(recipes);
  } catch (error) {
    console.log("Error in get highlights:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Protected: feed (pagination)
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const recipes = await Recipe.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username"); // ✅

    res.json(recipes);
  } catch (error) {
    console.log("Error in get recipes:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Protected: create recipe (RATING ZORUNLU)
router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, caption, rating, image, ingredients } = req.body;

    // ✅ rating dahil tüm alanlar zorunlu
    if (!title || !caption || !image || rating === undefined || rating === null) {
      return res.status(400).json({
        message: "Please provide all fields (title, caption, image, rating)",
      });
    }

    // ✅ rating kontrol (1-5)
    const r = Number(rating);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({
        message: "Rating must be a number between 1 and 5",
      });
    }

    // ✅ cloudinary için image base64 mi kontrol et (expo bug yakalar)
    // beklenen format: "data:image/jpeg;base64,...."
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({
        message: "Image must be a base64 data URL (data:image/...;base64,...)",
      });
    }

    // upload image to cloudinary (base64)
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "recipes",
    });

    const imageUrl = uploadResponse.secure_url;

    // save to DB
    const newRecipe = await Recipe.create({
      title,
      caption,
      rating: r, // ✅ artık default yok, zorunlu
      image: imageUrl,
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      user: req.user._id, // ✅ user middleware’den geliyor
    });

    const populated = await Recipe.findById(newRecipe._id).populate(
      "user",
      "username"
    );

    res.status(201).json(populated);
  } catch (error) {
    console.log("Error in create recipe:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Protected: delete recipe (only owner)
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) return res.status(404).json({ message: "Recipe not found" });

    if (recipe.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // delete cloudinary image
    if (recipe.image && recipe.image.includes("cloudinary")) {
      const marker = "/recipes/";
      let publicId;

      if (recipe.image.includes(marker)) {
        publicId = recipe.image.split(marker)[1].split("?")[0];
        publicId = publicId.replace(/\.[^/.]+$/, "");
        publicId = `recipes/${publicId}`;
      } else {
        const last = recipe.image.split("/").pop().split("?")[0];
        publicId = `recipes/${last.replace(/\.[^/.]+$/, "")}`;
      }

      await cloudinary.uploader.destroy(publicId);
    }

    await recipe.deleteOne();
    res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.log("Error in delete recipe:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
