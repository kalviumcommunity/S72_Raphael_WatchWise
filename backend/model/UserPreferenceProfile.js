const mongoose = require('mongoose');

/**
 * GenreWeight Sub-Schema
 *
 * Tracks how much a user likes a particular genre.
 * score is a float that increases on positive signals
 * (watched, liked, high rating) and decreases on negative
 * ones (skipped, notPlanning).
 */
const GenreWeightSchema = new mongoose.Schema(
    {
        genreId: { type: Number, required: true },
        genreName: { type: String, default: '' },
        // Cumulative preference score — higher = stronger preference
        score: { type: Number, default: 0 },
        // How many interactions contributed to this score
        interactionCount: { type: Number, default: 0 },
    },
    { _id: false }
);

/**
 * UserPreferenceProfile Schema
 *
 * One document per user, per media type.
 * Stores aggregated genre weights derived from all past interactions.
 *
 * The recommendation service reads this to re-rank candidates
 * returned by the 3rd-party API (TMDB / Jikan).
 */
const UserPreferenceProfileSchema = new mongoose.Schema(
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

        // Map of genreId → weight object
        genreWeights: {
            type: [GenreWeightSchema],
            default: [],
        },

        /**
         * IDs of items the user has already seen / interacted with.
         * Used to filter them out of future recommendations.
         */
        seenMediaIds: {
            type: [String],
            default: [],
        },

        /**
         * IDs the user explicitly skipped or marked notPlanning.
         * These are excluded from recommendations permanently.
         */
        dislikedMediaIds: {
            type: [String],
            default: [],
        },

        // Timestamp of the last profile update
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Unique constraint: one profile per user per media type
UserPreferenceProfileSchema.index({ userId: 1, mediaType: 1 }, { unique: true });

module.exports = mongoose.model('UserPreferenceProfile', UserPreferenceProfileSchema);
