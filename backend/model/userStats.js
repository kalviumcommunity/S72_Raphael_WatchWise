const mongoose = require('mongoose');

const UserStatsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    movies: {
        watched: {
            type: Number,
            default: 0
        },
        inProgress: {
            type: Number,
            default: 0
        },
        planToWatch: {
            type: Number,
            default: 0
        }
    },
    tvShows: {
        watched: {
            type: Number,
            default: 0
        },
        inProgress: {
            type: Number,
            default: 0
        },
        planToWatch: {
            type: Number,
            default: 0
        }
    },
    anime: {
        watched: {
            type: Number,
            default: 0
        },
        inProgress: {
            type: Number,
            default: 0
        },
        planToWatch: {
            type: Number,
            default: 0
        }
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

const UserStats = mongoose.model('UserStats', UserStatsSchema);
module.exports = UserStats; 