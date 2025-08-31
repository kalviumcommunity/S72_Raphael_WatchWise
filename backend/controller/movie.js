const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../model/user');
const cors = require('cors');

router.use(cors());

// Get movie status for current user
router.get('/:movieId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const movieStatus = user.movies.find(m => m.movieId === req.params.movieId);
        
        if (!movieStatus) {
            return res.status(404).json({ error: 'Movie status not found' });
        }
        
        res.json(movieStatus);
    } catch (error) {
        console.error('Error fetching movie status:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Update movie status


// Get all movies for current user
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            movies: user.movies,
            stats: user.stats
        });
    } catch (error) {
        console.error('Error fetching user movies:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

module.exports = router; 