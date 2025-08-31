const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const authRouter = express.Router();
const User = require("../model/user"); // Import User model
const UserStats = require("../model/userStats");
const authMiddleware = require("../middleware/auth"); // Import auth middleware
require("dotenv").config(); // Load environment variables

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profile-images';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only image files are allowed!"));
    }
}).single('image');

// Auth Routes (mounted at /api/auth)
authRouter.post("/register", (req, res) => {
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: "File upload error: " + err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        try {
            const { name, email, password } = req.body;

            console.log("Registration request received:", { 
                name,
                email,
                passwordLength: password?.length,
                hasPassword: !!password
            });

            if (!name || !email || !password) {
                return res.status(400).json({ error: "Name, email, and password are required" });
            }

            if (typeof name !== 'string' || name.length < 3 || name.length > 16) {
                return res.status(400).json({ error: "Name must be between 3 and 16 characters" });
            }
            if (!/^[a-zA-Z0-9_ ]+$/.test(name)) {
                return res.status(400).json({ error: "Name can only contain letters, numbers, spaces, and underscores" });
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: "Password must be at least 8 characters long" });
            }
            if (!/[a-z]/.test(password)) {
                return res.status(400).json({ error: "Password must contain at least one lowercase letter" });
            }
            if (!/[A-Z]/.test(password)) {
                return res.status(400).json({ error: "Password must contain at least one uppercase letter" });
            }
            if (!/[0-9]/.test(password)) {
                return res.status(400).json({ error: "Password must contain at least one number" });
            }
            if (!/[^a-zA-Z0-9\s]/.test(password)) {
                return res.status(400).json({ error: "Password must contain at least one special character" });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: "Email is already registered" });
            }

            const userData = {
                name,
                email,
                password
            };

            if (req.file) {
                userData.image = req.file.path;
            }

            const newUser = new User(userData);
            const savedUser = await newUser.save();

            console.log("User registered:", {
                email: savedUser.email,
                hashedPasswordLength: savedUser.password?.length,
                hasPassword: !!savedUser.password
            });

            res.status(201).json({ message: "User registered successfully" });
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({ error: "Server error" });
        }
    });
});

authRouter.post("/login", async (req, res) => {
    try {
        console.log("Received login request body:", req.body);
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log("Missing email or password");
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        console.log("User search result:", {
            found: !!user,
            email: email,
            userEmail: user?.email,
            hasPassword: !!user?.password
        });

        if (!user) {
            return res.status(400).json({ error: "User not found with this email" });
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password);
            console.log("Password comparison:", {
                isMatch,
                providedPassword: password,
                hashedPasswordLength: user.password.length
            });
            
            if (!isMatch) {
                return res.status(400).json({ error: "Incorrect password" });
            }

            // Generate JWT token with user ID
            const token = jwt.sign(
                { id: user._id.toString() }, 
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: "1h" }
            );

            // Log the token details for debugging
            console.log("Generated token details:", {
                userId: user._id.toString(),
                tokenLength: token.length
            });

            res.json({ 
                token, 
                user: { 
                    id: user._id.toString(), 
                    name: user.name, 
                    email: user.email 
                } 
            });
        } catch (bcryptError) {
            console.error("Bcrypt comparison error:", bcryptError);
            return res.status(500).json({ error: "Error verifying password" });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Profile Routes (mounted at /api/profile)
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });

        // Get or create user stats
        let userStats = await UserStats.findOne({ userId: user._id });
        if (!userStats) {
            userStats = await new UserStats({ userId: user._id }).save();
        }

        // Log the user profile data including the image path
        console.log("User profile fetched:", {
            id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            stats: userStats
        });

        res.json({
            ...user.toObject(),
            stats: {
                movies: userStats.movies,
                tvShows: userStats.tvShows,
                anime: userStats.anime
            }
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ error: "Server error" });
    }
});



module.exports = { router, authRouter };
