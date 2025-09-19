const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../model/user");
const UserStats = require("../model/userStats");
const { authMiddleware } = require("../middleware/auth");
require("dotenv").config();

const authRouter = express.Router();
const router = express.Router();

// Multer configuration for profile image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "uploads/profile-images";
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const isValidType = allowedTypes.test(file.mimetype) && allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (isValidType) return cb(null, true);
        cb(new Error("Only image files are allowed!"));
    },
}).single("image");

// ---------------- AUTH ROUTES ----------------

// Register new user
authRouter.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password are required" });
        if (typeof name !== "string" || name.length < 3 || name.length > 16) return res.status(400).json({ error: "Name must be between 3 and 16 characters" });
        if (!/^[a-zA-Z0-9_ ]+$/.test(name)) return res.status(400).json({ error: "Name can only contain letters, numbers, spaces, and underscores" });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email format" });

        // Password validation
        if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long" });
        if (!/[a-z]/.test(password)) return res.status(400).json({ error: "Password must contain at least one lowercase letter" });
        if (!/[A-Z]/.test(password)) return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
        if (!/[0-9]/.test(password)) return res.status(400).json({ error: "Password must contain at least one number" });
        if (!/[^a-zA-Z0-9\s]/.test(password)) return res.status(400).json({ error: "Password must contain at least one special character" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email is already registered" });

        const userData = { name, email, password };
        const newUser = new User(userData);
        await newUser.save();

        // Generate JWT token for immediate login after registration
        const token = jwt.sign({ id: newUser._id.toString() }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "1h" });
        
        res.status(201).json({ 
            message: "User registered successfully",
            token,
            user: { id: newUser._id.toString(), name: newUser.name, email: newUser.email }
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Login user
authRouter.post("/login", async (req, res) => {
  try {
    console.log("Login request received:", { body: req.body, headers: req.headers });

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for user:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" }
    );

    console.log("Login successful for user:", email);
    res.json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ---------------- PROFILE ROUTES ----------------

// Get current user profile
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });

        let userStats = await UserStats.findOne({ userId: user._id });
        if (!userStats) userStats = await new UserStats({ userId: user._id }).save();

        res.json({ ...user.toObject(), stats: userStats });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Update profile
router.put("/me", authMiddleware, (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) return res.status(400).json({ error: "File upload error: " + err.message });
        if (err) return res.status(400).json({ error: err.message });

        try {
            const { name, email, password } = req.body;
            const userId = req.user.id;
            const updateData = {};

            if (name) updateData.name = name;
            if (email) {
                const existingUser = await User.findOne({ email });
                if (existingUser && existingUser._id.toString() !== userId) return res.status(400).json({ error: "Email is already in use" });
                updateData.email = email;
            }

            if (password) {
                if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long" });
                if (!/[a-z]/.test(password)) return res.status(400).json({ error: "Password must contain at least one lowercase letter" });
                if (!/[A-Z]/.test(password)) return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
                if (!/[0-9]/.test(password)) return res.status(400).json({ error: "Password must contain at least one number" });
                if (!/[^a-zA-Z0-9\s]/.test(password)) return res.status(400).json({ error: "Password must contain at least one symbol" });

                updateData.password = await bcrypt.hash(password, 10);
            }

            if (req.file) {
                const user = await User.findById(userId);
                if (user.image && user.image.startsWith("uploads/")) {
                    const oldImagePath = path.join(__dirname, "..", user.image);
                    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
                }
                updateData.image = req.file.path;
            }

            const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
            if (!updatedUser) return res.status(404).json({ error: "User not found" });

            res.json(updatedUser);
        } catch (error) {
            console.error("Profile update error:", error);
            res.status(500).json({ error: "Server error" });
        }
    });
});

// Update stats
router.put("/me/stats", authMiddleware, async (req, res) => {
    try {
        const { movies, tvShows, anime } = req.body;
        let userStats = await UserStats.findOne({ userId: req.user.id });
        if (!userStats) userStats = new UserStats({ userId: req.user.id });

        if (movies) userStats.movies = { ...userStats.movies, ...movies };
        if (tvShows) userStats.tvShows = { ...userStats.tvShows, ...tvShows };
        if (anime) userStats.anime = { ...userStats.anime, ...anime };

        userStats.lastUpdated = Date.now();
        await userStats.save();

        res.json({ message: "Stats updated successfully", stats: userStats });
    } catch (error) {
        console.error("Stats update error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Delete user account
router.delete("/me", authMiddleware, async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.user.id);
        if (!deletedUser) return res.status(404).json({ error: "User not found" });

        await UserStats.findOneAndDelete({ userId: req.user.id });
        res.json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("Account deletion error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Change password
router.put("/me/password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new passwords are required" });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Password update error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = { authRouter, router };