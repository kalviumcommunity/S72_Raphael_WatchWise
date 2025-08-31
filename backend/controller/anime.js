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
router.put('/:animeId', auth, async (req, res) => {
    try {
        console.log('Received update request:', {
            body: req.body,
            params: req.params,
            user: req.user
        });

        const { watchStatus, rating, animeTitle, posterPath } = req.body;
        const animeId = String(req.params.animeId);

        // Input validation
        if (!watchStatus || !animeId || !animeTitle) {
            console.log('Missing required fields:', {
                watchStatus,
                animeId,
                animeTitle
            });
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['watchStatus', 'animeId', 'animeTitle'],
                received: { watchStatus, animeId, animeTitle }
            });
        }

        // Validate watchStatus value
        const validStatuses = ['watched', 'inProgress', 'planToWatch', 'notPlanning'];
        if (!validStatuses.includes(watchStatus)) {
            console.log('Invalid watch status:', watchStatus);
            return res.status(400).json({ 
                error: 'Invalid watch status',
                validValues: validStatuses,
                received: watchStatus
            });
        }

        // Validate rating
        if (rating !== undefined && (rating < 0 || rating > 10)) {
            console.log('Invalid rating:', rating);
            return res.status(400).json({ 
                error: 'Invalid rating value',
                validRange: '0-10',
                received: rating
            });
        }

        console.log('Looking up user:', req.user.id);
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize anime array if it doesn't exist
        if (!user.anime) {
            user.anime = [];
        }

        // Find existing anime status using string comparison
        const animeIndex = user.anime.findIndex(a => String(a.animeId) === animeId);
        
        let updatedAnime;
        if (animeIndex > -1) {
            console.log('Updating existing anime status at index:', animeIndex);
            // Update existing anime status
            updatedAnime = {
                ...user.anime[animeIndex].toObject(),
                watchStatus,
                rating: rating || user.anime[animeIndex].rating,
                updatedAt: Date.now()
            };
            user.anime[animeIndex] = updatedAnime;
        } else {
            console.log('Adding new anime status');
            // Add new anime status
            updatedAnime = {
                animeId: animeId,
                animeTitle,
                posterPath: posterPath || '',
                watchStatus,
                rating: rating || 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            user.anime.push(updatedAnime);
        }

        // Initialize stats if they don't exist
        if (!user.stats) {
            console.log('Initializing user stats');
            user.stats = {
                anime: { watched: 0, inProgress: 0, planToWatch: 0 }
            };
        }

        // Reset anime counts
        user.stats.anime = { watched: 0, inProgress: 0, planToWatch: 0 };

        // Recalculate counts
        user.anime.forEach(anime => {
            if (anime.watchStatus === 'watched') user.stats.anime.watched++;
            else if (anime.watchStatus === 'inProgress') user.stats.anime.inProgress++;
            else if (anime.watchStatus === 'planToWatch') user.stats.anime.planToWatch++;
        });

        console.log('Saving updated user:', {
            animeCount: user.anime.length,
            stats: user.stats,
            updatedAnime
        });

        await user.save();

        res.json({ 
            message: 'Anime status updated successfully',
            animeStatus: updatedAnime,
            stats: user.stats
        });
    } catch (error) {
        console.error('Error updating anime status:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

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