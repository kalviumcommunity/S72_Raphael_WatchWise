auth.js in middleware
const jwt = require("jsonwebtoken");
require("dotenv").config(); // Load environment variables

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        
        if (!authHeader) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }

        // Check if it's a Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Invalid token format. Must be a Bearer token." });
        }

        // Extract the token
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: "No token found in Bearer string." });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = decoded;
            next();
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError);
            return res.status(401).json({ error: "Invalid or expired token." });
        }
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({ error: "Authentication error." });
    }
};

module.exports = authMiddleware;
