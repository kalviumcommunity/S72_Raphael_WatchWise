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
router.put('/:showId', auth, async (req, res) => {
    try {
        console.log('Received update request:', {
            body: req.body,
            params: req.params,
            user: req.user
        });

        const { watchStatus, rating, showTitle, posterPath } = req.body;
        const showId = req.params.showId;

        // Input validation
        if (!watchStatus || !showId || !showTitle) {
            console.log('Missing required fields:', {
                watchStatus,
                showId,
                showTitle
            });
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['watchStatus', 'showId', 'showTitle'],
                received: { watchStatus, showId, showTitle }
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

        // Initialize tvShows array if it doesn't exist
        if (!user.tvShows) {
            user.tvShows = [];
        }

        // Find existing show status
        const showIndex = user.tvShows.findIndex(s => String(s.showId) === String(showId));
        
        let updatedShow;
        if (showIndex > -1) {
            console.log('Updating existing TV show status at index:', showIndex);
            // Update existing show status
            updatedShow = {
                ...user.tvShows[showIndex].toObject(),
                watchStatus,
                rating: rating || user.tvShows[showIndex].rating,
                updatedAt: Date.now()
            };
            user.tvShows[showIndex] = updatedShow;
        } else {
            console.log('Adding new TV show status');
            // Add new show status
            updatedShow = {
                showId: String(showId),
                showTitle,
                posterPath: posterPath || '',
                watchStatus,
                rating: rating || 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            user.tvShows.push(updatedShow);
        }

        // Initialize stats if they don't exist
        if (!user.stats) {
            console.log('Initializing user stats');
            user.stats = {
                tvShows: { watched: 0, inProgress: 0, planToWatch: 0 }
            };
        }

        // Reset TV show counts
        user.stats.tvShows = { watched: 0, inProgress: 0, planToWatch: 0 };

        // Recalculate counts
        user.tvShows.forEach(show => {
            if (show.watchStatus === 'watched') user.stats.tvShows.watched++;
            else if (show.watchStatus === 'inProgress') user.stats.tvShows.inProgress++;
            else if (show.watchStatus === 'planToWatch') user.stats.tvShows.planToWatch++;
        });

        console.log('Saving updated user:', {
            tvShowsCount: user.tvShows.length,
            stats: user.stats,
            updatedShow
        });

        await user.save();

        res.json({ 
            message: 'TV show status updated successfully',
            showStatus: updatedShow,
            stats: user.stats
        });
    } catch (error) {
        console.error('Error updating TV show status:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

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