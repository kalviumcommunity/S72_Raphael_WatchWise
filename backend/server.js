const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const port = 3000;
app.use(cors());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(express.json());
app.use(cors());

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
app.get("/",(req, res) => {
    res.send("Server is running");
  });  
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
