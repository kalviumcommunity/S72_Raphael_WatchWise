const mongoose = require('mongoose')
const bcrypt = require('bcryptjs');

const MovieSchema = new mongoose.Schema({
    movieId: {
        type: String,
        required: true
    },
    movieTitle: {
        type: String,
        required: true
    },
    posterPath: {
        type: String
    },
    watchStatus: {
        type: String,
        enum: ['watched', 'inProgress', 'planToWatch', 'notPlanning'],
        default: 'planToWatch'
    },
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    features:{
        type: [Number],
        default: []
    }
});

const TvShowSchema = new mongoose.Schema({
    showId: {
        type: String,
        required: true
    },
    showTitle: {
        type: String,
        required: true
    },
    posterPath: {
        type: String
    },
    watchStatus: {
        type: String,
        enum: ['watched', 'inProgress', 'planToWatch', 'notPlanning'],
        default: 'planToWatch'
    },
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    features:{
        type: [Number],
        default: []
    }
});

const AnimeSchema = new mongoose.Schema({
    animeId: {
        type: String,
        required: true
    },
    animeTitle: {
        type: String,
        required: true
    },
    posterPath: {
        type: String
    },
    watchStatus: {
        type: String,
        enum: ['watched', 'inProgress', 'planToWatch', 'notPlanning'],
        default: 'planToWatch'
    },
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    features:{
        type: [Number],
        default: []
    }
});

const StatsSchema = new mongoose.Schema({
    movies: {
        watched: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        planToWatch: { type: Number, default: 0 }
    },
    tvShows: {
        watched: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        planToWatch: { type: Number, default: 0 }
    },
    anime: {
        watched: { type: Number, default: 0 },
        inProgress: { type: Number, default: 0 },
        planToWatch: { type: Number, default: 0 }
    }
});

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        data: Buffer,
        contentType: String,
        filename: String,
        createdAt: {
        type: Date,
        default: Date.now
    },
    movies: [MovieSchema],
    tvShows: [TvShowSchema],
    anime: [AnimeSchema],
    stats: {
        type: StatsSchema,
        default: () => ({})
    }
}});

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // Skip if password hasn't changed
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;