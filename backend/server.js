const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const port = 3000;

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(express.json());
const allowedOrigins = ['http://localhost:5173', 'https://watchwisely.netlify.app'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    console.log("❌ Blocked by CORS:", origin);
    callback(new Error('Not allowed by CORS'));
  }
  },
  credentials: true
}));

const user = require("./controller/user");
const movie = require("./controller/movie");
const tvshow = require("./controller/tvshow");
const anime = require("./controller/anime");
const recommendations = require("./routes/recommendations");
const { initSchema } = require("./services/vectorStore");

// Initialise pgvector schema (non-blocking — server starts even if PG is down)
initSchema().catch((err) =>
    console.warn("[vectorStore] Startup init skipped:", err.message)
);

// Auth routes
app.use("/api/auth", user.authRouter);
// Profile routes
app.use("/api/profile", user.router);
app.use("/api/profile/movies", movie);
app.use("/api/profile/tvshows", tvshow);
app.use("/api/profile/anime", anime);
// Personalised recommendation routes
app.use("/api/recommendations", recommendations);

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
