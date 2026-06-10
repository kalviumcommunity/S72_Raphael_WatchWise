const mongoose = require('mongoose');

/**
 * Interaction Schema
 *
 * Records every meaningful user action on a media item.
 * These events are the raw signal used to build and update
 * the user's preference profile over time.
 *
 * mediaType: 'movie' | 'tvshow' | 'anime'
 * eventType:
 *   - 'click'       → user opened the detail page
 *   - 'like'        → user explicitly liked / rated >= 7
 *   - 'skip'        → user dismissed a recommendation
 *   - 'watchStatus' → user changed the watch status (most valuable signal)
 */
const InteractionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        mediaType: {
            type: String,
            enum: ['movie', 'tvshow', 'anime'],
            required: true,
        },

        // The external ID (TMDB id for movies/tvshows, MAL id for anime)
        mediaId: {
            type: String,
            required: true,
        },

        mediaTitle: {
            type: String,
            default: '',
        },

        eventType: {
            type: String,
            enum: ['click', 'like', 'skip', 'watchStatus'],
            required: true,
        },

        // For watchStatus events, store the new status value
        watchStatus: {
            type: String,
            enum: ['watched', 'inProgress', 'planToWatch', 'notPlanning', null],
            default: null,
        },

        // For like events or explicit ratings (0-10)
        rating: {
            type: Number,
            min: 0,
            max: 10,
            default: null,
        },

        /**
         * Genre IDs at the time of interaction (from TMDB / Jikan).
         * Stored here so we can update preference weights without
         * needing to re-fetch the external API.
         */
        genreIds: {
            type: [Number],
            default: [],
        },

        // Free-form metadata (e.g. original_language, popularity score)
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true, // createdAt / updatedAt managed by Mongoose
    }
);

// Compound index: fast lookup of all interactions for a user+media combo
InteractionSchema.index({ userId: 1, mediaType: 1, mediaId: 1 });

module.exports = mongoose.model('Interaction', InteractionSchema);
