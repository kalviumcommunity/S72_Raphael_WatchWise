const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route
app.get("/", (req, res) => {
  res.send("backend working");
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS setup
const allowedOrigins = [
  "http://localhost:5173",
  "https://watchwisely.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Session middleware (required for Passport.js)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Import controllers
const user = require("./controller/user");
const movie = require("./controller/movie");
const tvshow = require("./controller/tvshow");
const anime = require("./controller/anime");

// Auth routes
app.use("/api/auth", user.authRouter);

// Profile routes
app.use("/api/profile", user.router);
app.use("/api/profile/movies", movie);
app.use("/api/profile/tvshows", tvshow);
app.use("/api/profile/anime", anime);

// --- Google OAuth Setup ---
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. http://localhost:3000/auth/google/callback
    },
    (accessToken, refreshToken, profile, done) => {
      // You can save/update the user in the database here
      return done(null, profile);
    }
  )
);

// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Generate a JWT token for the authenticated user
    const token = jwt.sign(
      {
        id: req.user.id || req.user.email, // fallback if no id in profile
        name: req.user.displayName,
        email: req.user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token as query param
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    console.log(`✅ Redirecting to ${FRONTEND_URL}/home with token`);
    res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
    // res.redirect(`https://watchwisely.netlify.app/auth/callback?token=${token}`);
  }
);


app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// --- Error handling middleware ---
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

// Start server
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
