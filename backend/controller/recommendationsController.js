const User = require('../models/user');
const Movie = require('../models/movie');
const TvShow = require('../models/TvShow');
const Anime = require('../models/Anime');

exports.getWatchedMedia = async (req, res) => {
    try {
        // Get user's watch lists
        const movieList = await Movie.find({ 
            userId: req.user.id,
            status: 'COMPLETED'
        }).select('tmdbId status rating');

        const tvShowList = await TvShow.find({ 
            userId: req.user.id,
            status: 'COMPLETED'
        }).select('tmdbId status rating');

        const animeList = await Anime.find({ 
            userId: req.user.id,
            status: 'COMPLETED'
        }).select('malId status rating');

        // Format the response
        const response = {
            movies: movieList.map(movie => ({
                tmdbId: movie.tmdbId,
                status: movie.status,
                rating: movie.rating
            })),
            tvShows: tvShowList.map(show => ({
                tmdbId: show.tmdbId,
                status: show.status,
                rating: show.rating
            })),
            anime: animeList.map(anime => ({
                malId: anime.malId,
                status: anime.status,
                rating: anime.rating
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching watched media:', error);
        res.status(500).json({ error: 'Server error while fetching watched media' });
    }
}; 