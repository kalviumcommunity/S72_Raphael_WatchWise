const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    trackInteraction,
    getRecommendations,
    getPreferenceProfile,
    getInteractionHistory,
} = require('../controller/recommendationsController');

/**
 * Recommendation Routes
 * All routes require a valid JWT Bearer token (auth middleware).
 *
 * POST   /api/recommendations/interact              → record a user interaction
 * GET    /api/recommendations/:mediaType            → get personalised recommendations
 * GET    /api/recommendations/profile/:mediaType    → get user preference profile
 * GET    /api/recommendations/history               → get interaction history
 */

// Record a user interaction (click, like, skip, watchStatus)
router.post('/interact', auth, trackInteraction);

// Get interaction history (must come before /:mediaType to avoid route conflict)
router.get('/history', auth, getInteractionHistory);

// Get preference profile for a media type
router.get('/profile/:mediaType', auth, getPreferenceProfile);

// Get personalised recommendations for a media type
router.get('/:mediaType', auth, getRecommendations);

module.exports = router;
