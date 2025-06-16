const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../model/user');

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
router.put('/:movieId', auth, async (req, res) => {
    if (watchStatus === 'notPlanning') {
    // Remove movie from history if it exists
    const movieIndex = user.movies.findIndex(m => String(m.movieId) === String(movieId));
    if (movieIndex > -1) {
        user.movies.splice(movieIndex, 1); // remove it
    }

    // Also remove from stats if needed (recalculate)
    user.stats.movies = { watched: 0, inProgress: 0, planToWatch: 0 };
    user.movies.forEach(movie => {
        if (movie.watchStatus === 'watched') user.stats.movies.watched++;
        else if (movie.watchStatus === 'inProgress') user.stats.movies.inProgress++;
        else if (movie.watchStatus === 'planToWatch') user.stats.movies.planToWatch++;
    });

    await user.save();
    return res.json({
        message: 'Movie not stored (watchStatus: notPlanning). Removed if existed.',
        stats: user.stats
    });
}
    try {
        console.log('Received update request:', {
            body: req.body,
            params: req.params,
            user: req.user
        });

        const { watchStatus, rating, movieTitle, posterPath } = req.body;
        const movieId = req.params.movieId;

        // Input validation
        if (!watchStatus || !movieId || !movieTitle) {
            console.log('Missing required fields:', {
                watchStatus,
                movieId,
                movieTitle
            });
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['watchStatus', 'movieId', 'movieTitle'],
                received: { watchStatus, movieId, movieTitle }
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

        // Find existing movie status
        console.log('Finding movie in user movies array:', {
            movieId,
            existingMovies: user.movies.map(m => ({ id: m.movieId, title: m.movieTitle }))
        });

        // Ensure consistent type for comparison
        const movieIndex = user.movies.findIndex(m => String(m.movieId) === String(movieId));
        
        let updatedMovie;
        if (movieIndex > -1) {
            console.log('Updating existing movie status at index:', movieIndex);
            // Update existing movie status
            updatedMovie = {
                ...user.movies[movieIndex].toObject(),
                watchStatus,
                rating: rating || user.movies[movieIndex].rating,
                updatedAt: Date.now()
            };
            user.movies[movieIndex] = updatedMovie;
        } else {
            console.log('Adding new movie status');
            // Add new movie status
            updatedMovie = {
                movieId: String(movieId),
                movieTitle,
                posterPath: posterPath || '',
                watchStatus,
                rating: rating || 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            user.movies.push(updatedMovie);
        }

        // Initialize stats if they don't exist
        if (!user.stats) {
            console.log('Initializing user stats');
            user.stats = {
                movies: { watched: 0, inProgress: 0, planToWatch: 0 }
            };
        }

        // Reset movie counts
        user.stats.movies = { watched: 0, inProgress: 0, planToWatch: 0 };

        // Recalculate counts
        user.movies.forEach(movie => {
            if (movie.watchStatus === 'watched') user.stats.movies.watched++;
            else if (movie.watchStatus === 'inProgress') user.stats.movies.inProgress++;
            else if (movie.watchStatus === 'planToWatch') user.stats.movies.planToWatch++;
        });

        console.log('Saving updated user:', {
            moviesCount: user.movies.length,
            stats: user.stats,
            updatedMovie
        });

        try {
            await user.save();
            console.log('Successfully saved user');
        } catch (saveError) {
            console.error('Error saving user:', saveError);
            console.error('User data:', {
                movies: user.movies,
                stats: user.stats
            });
            throw saveError;
        }

        console.log('Successfully updated movie status:', updatedMovie);

        res.json({ 
            message: 'Movie status updated successfully',
            movieStatus: updatedMovie,
            stats: user.stats
        });
    } catch (error) {
        console.error('Error updating movie status:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Server error',
            details: error.message,
            stack: error.stack
        });
    }
});

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