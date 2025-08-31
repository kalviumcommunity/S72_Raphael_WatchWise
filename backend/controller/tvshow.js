const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../model/user');

// Get TV show status for current user
router.get('/:showId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const showStatus = user.tvShows?.find(s => s.showId === req.params.showId);
        
        if (!showStatus) {
            return res.status(404).json({ error: 'TV show status not found' });
        }

        res.json(showStatus);
    } catch (error) {
        console.error('Error fetching TV show status:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Update TV show status


// Get all TV shows for current user
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            tvShows: user.tvShows || [],
            stats: user.stats
        });
    } catch (error) {
        console.error('Error fetching user TV shows:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router; 