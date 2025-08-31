const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../model/user');

// Get anime status for current user
router.get('/:animeId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Convert both IDs to strings for comparison
        const requestedAnimeId = String(req.params.animeId);
        const animeStatus = user.anime?.find(a => String(a.animeId) === requestedAnimeId);
        
        // If no status is found, return a 404 but with a null status
        // This allows the frontend to differentiate between errors and new entries
        if (!animeStatus) {
            return res.json(null);
        }

        res.json(animeStatus);
    } catch (error) {
        console.error('Error fetching anime status:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Update anime status


// Get all anime for current user
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            anime: user.anime || [],
            stats: user.stats
        });
    } catch (error) {
        console.error('Error fetching user anime:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router; 