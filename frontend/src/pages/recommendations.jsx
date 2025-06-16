import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import MovieCard from "../components/Moviecard";
import TvShowCard from "../components/Tvshowcard";
import AnimeCard from "../components/Animecard";

const TMDB_API_KEY = "0ace2af581de1152e9f38a6c477220b8";

const Recommendations = () => {
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [tvShows, setTvShows] = useState([]);
    const [anime, setAnime] = useState([]);
    const [recommendedMovies, setRecommendedMovies] = useState([]);
    const [recommendedTvShows, setRecommendedTvShows] = useState([]);
    const [recommendedAnime, setRecommendedAnime] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeRecommendationTab') || 'movies');
    const [currentPage, setCurrentPage] = useState({
        movies: 1,
        tvShows: 1,
        anime: 1
    });
    
    // Refs for intersection observer and content
    const observer = useRef();
    const contentRef = useRef(null);
    const loadingRef = useRef(null);
    
    // Flag to determine if there's more content to load
    const [hasMore, setHasMore] = useState({
        movies: true,
        tvShows: true,
        anime: true
    });

    // New function to retrieve recommendations from local storage
    const getRecommendationsFromStorage = (type) => {
        try {
            const stored = localStorage.getItem(`recommendations_${type}`);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error(`Error retrieving ${type} recommendations:`, error);
            return [];
        }
    };

    useEffect(() => {
        localStorage.setItem('activeRecommendationTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        // Retrieve stored recommendations on initial load
        const storedMovieRecommendations = getRecommendationsFromStorage('movies');
        const storedTvShowRecommendations = getRecommendationsFromStorage('tvShows');
        const storedAnimeRecommendations = getRecommendationsFromStorage('anime');

        if (storedMovieRecommendations.length > 0) {
            setRecommendedMovies(storedMovieRecommendations);
        }
        if (storedTvShowRecommendations.length > 0) {
            setRecommendedTvShows(storedTvShowRecommendations);
        }
        if (storedAnimeRecommendations.length > 0) {
            setRecommendedAnime(storedAnimeRecommendations);
        }

        fetchUserContent(token);

        const handleWatchStatusUpdate = () => {
            fetchUserContent(token);
        };

        window.addEventListener('watchStatusUpdated', handleWatchStatusUpdate);

        return () => {
            window.removeEventListener('watchStatusUpdated', handleWatchStatusUpdate);
        };
    }, [navigate]);

    const fetchUserContent = async (token) => {
        try {
            setLoading(true);
            const [movieResponse, tvResponse, animeResponse] = await Promise.all([
                axios.get("https://s72-raphael-watchwise.onrender.com/api/profile/movies", {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get("https://s72-raphael-watchwise.onrender.com/api/profile/tvshows", {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                axios.get("https://s72-raphael-watchwise.onrender.com/api/profile/anime", {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            // Filter movies, TV shows, and anime, excluding 'not_planning_to_watch' items
            const watchedOrInProgressMovies = movieResponse.data.movies.filter(movie =>
                movie.watchStatus !== 'not_planning_to_watch'
            );
            const watchedOrInProgressTvShows = tvResponse.data.tvShows.filter(show =>
                show.watchStatus !== 'not_planning_to_watch'
            );
            const watchedOrInProgressAnime = animeResponse.data.anime.filter(item =>
                item.watchStatus !== 'not_planning_to_watch'
            );

            // Update state with filtered content
            setMovies(watchedOrInProgressMovies);
            setTvShows(watchedOrInProgressTvShows);
            setAnime(watchedOrInProgressAnime);

            // Prepare arrays of watched content IDs
            const allWatchedMovieIds = watchedOrInProgressMovies.map(m => m.movieId);
            const allWatchedTvShowIds = watchedOrInProgressTvShows.map(s => s.showId);
            const allWatchedAnimeIds = watchedOrInProgressAnime.map(a => a.animeId);

            // Fetch movie recommendations
            if (watchedOrInProgressMovies.length > 0) {
                const recommendations = await Promise.all(
                    watchedOrInProgressMovies.map(movie =>
                        fetchMovieRecommendations(movie.movieId, allWatchedMovieIds)
                    )
                );
                const allRecommendations = recommendations.flat();
                const uniqueRecommendations = Array.from(
                    new Map(allRecommendations.map(item => [item.id, item])).values()
                );
                const topRecommendations = uniqueRecommendations.slice(0, 50);
                setRecommendedMovies(topRecommendations);
                setHasMore(prev => ({ ...prev, movies: uniqueRecommendations.length > 50 }));
                localStorage.setItem('recommendations_movies', JSON.stringify(topRecommendations));
            }

            // Fetch TV show recommendations
            if (watchedOrInProgressTvShows.length > 0) {
                const recommendations = await Promise.all(
                    watchedOrInProgressTvShows.map(show =>
                        fetchTvShowRecommendations(show.showId, allWatchedTvShowIds)
                    )
                );
                const allRecommendations = recommendations.flat();
                const uniqueRecommendations = Array.from(
                    new Map(allRecommendations.map(item => [item.id, item])).values()
                );
                const topRecommendations = uniqueRecommendations.slice(0, 50);
                setRecommendedTvShows(topRecommendations);
                setHasMore(prev => ({ ...prev, tvShows: uniqueRecommendations.length > 50 }));
                localStorage.setItem('recommendations_tvShows', JSON.stringify(topRecommendations));
            }

            // Fetch anime recommendations
            if (watchedOrInProgressAnime.length > 0) {
                const recommendations = await Promise.all(
                    watchedOrInProgressAnime.map(item =>
                        fetchAnimeRecommendations(item.animeId, allWatchedAnimeIds)
                    )
                );
                const allRecommendations = recommendations.flat();
                const uniqueRecommendations = Array.from(
                    new Map(allRecommendations.map(item => [item.mal_id, item])).values()
                );
                const topRecommendations = uniqueRecommendations.slice(0, 50);
                setRecommendedAnime(topRecommendations);
                setHasMore(prev => ({ ...prev, anime: uniqueRecommendations.length > 50 }));
                localStorage.setItem('recommendations_anime', JSON.stringify(topRecommendations));
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching user content:", error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                setError("Failed to fetch your content. Please try again later.");
            }
            setLoading(false);
        }
    };

    const loadMoreContent = useCallback(async (type) => {
        const token = localStorage.getItem('token');
        if (!token || loadingMore || !hasMore[type]) return;

        try {
            setLoadingMore(true);

            // Determine current recommendations and watched content based on type
            const currentRecommendations = type === 'movies' ? recommendedMovies
                : type === 'tvShows' ? recommendedTvShows
                : recommendedAnime;

            const currentWatchedContent = type === 'movies' ? movies
                : type === 'tvShows' ? tvShows
                : anime;

            // Get IDs of watched content
            const currentWatchedIds = currentWatchedContent.map(item =>
                type === 'movies' ? item.movieId
                    : type === 'tvShows' ? item.showId
                        : item.animeId
            );

            // Track existing recommendation IDs to prevent duplicates
            const existingRecommendationIds = new Set(
                currentRecommendations.map(item =>
                    type === 'anime' ? item.mal_id : item.id
                )
            );

            // Fetch new recommendations
            let newRecommendations = [];
            if (type === 'movies' && currentWatchedContent.length > 0) {
                const recommendations = await Promise.all(
                    currentWatchedContent.map(movie =>
                        fetchMovieRecommendations(movie.movieId, currentWatchedIds)
                    )
                );
                newRecommendations = recommendations.flat();
            } else if (type === 'tvShows' && currentWatchedContent.length > 0) {
                const recommendations = await Promise.all(
                    currentWatchedContent.map(show =>
                        fetchTvShowRecommendations(show.showId, currentWatchedIds)
                    )
                );
                newRecommendations = recommendations.flat();
            } else if (type === 'anime' && currentWatchedContent.length > 0) {
                const recommendations = await Promise.all(
                    currentWatchedContent.map(item =>
                        fetchAnimeRecommendations(item.animeId, currentWatchedIds)
                    )
                );
                newRecommendations = recommendations.flat();
            }

            // Filter out duplicates and existing recommendations
            const uniqueNewRecommendations = newRecommendations.filter(item => {
                const itemId = type === 'anime' ? item.mal_id : item.id;
                return !existingRecommendationIds.has(itemId);
            });

            // Update recommendations based on type
            let updatedRecommendations;
            const batchSize = 20;
            switch (type) {
                case 'movies':
                    updatedRecommendations = [...recommendedMovies, ...uniqueNewRecommendations.slice(0, batchSize)];
                    setRecommendedMovies(updatedRecommendations);
                    localStorage.setItem('recommendations_movies', JSON.stringify(updatedRecommendations));
                    break;
                case 'tvShows':
                    updatedRecommendations = [...recommendedTvShows, ...uniqueNewRecommendations.slice(0, batchSize)];
                    setRecommendedTvShows(updatedRecommendations);
                    localStorage.setItem('recommendations_tvShows', JSON.stringify(updatedRecommendations));
                    break;
                case 'anime':
                    updatedRecommendations = [...recommendedAnime, ...uniqueNewRecommendations.slice(0, batchSize)];
                    setRecommendedAnime(updatedRecommendations);
                    localStorage.setItem('recommendations_anime', JSON.stringify(updatedRecommendations));
                    break;
                default:
                    break;
            }

            // Update current page
            setCurrentPage(prev => ({
                ...prev,
                [type]: prev[type] + 1
            }));

            // Update hasMore flag
            setHasMore(prev => ({
                ...prev,
                [type]: uniqueNewRecommendations.length > batchSize
            }));

        } catch (error) {
            console.error(`Error loading more ${type}:`, error);
            setError(`Failed to load more ${type}. Please try again later.`);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, recommendedMovies, recommendedTvShows, recommendedAnime, movies, tvShows, anime, hasMore]);

    // Intersection Observer setup
    const lastElementRef = useCallback(node => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore[activeTab]) {
                loadMoreContent(activeTab);
            }
        }, { threshold: 0.5 });
        
        if (node) observer.current.observe(node);
    }, [loadingMore, activeTab, loadMoreContent, hasMore]);

    // Reset observer when changing tabs
    useEffect(() => {
        if (observer.current) observer.current.disconnect();
    }, [activeTab]);

    const fetchMovieRecommendations = async (movieId, allWatchedMovieIds) => {
        try {
            const response = await axios.get(
                `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}`
            );

            const filteredRecommendations = response.data.results.filter(movie =>
                !allWatchedMovieIds.includes(movie.id.toString())
            );

            return filteredRecommendations;
        } catch (error) {
            console.error("Error fetching movie recommendations:", error);
            return [];
        }
    };

    const fetchTvShowRecommendations = async (showId, allWatchedTvShowIds) => {
        try {
            const response = await axios.get(
                `https://api.themoviedb.org/3/tv/${showId}/recommendations?api_key=${TMDB_API_KEY}`
            );

            const filtered = response.data.results.filter(show =>
                !allWatchedTvShowIds.includes(show.id.toString())
            );

            return filtered;
        } catch (error) {
            console.error("Error fetching TV show recommendations:", error);
            return [];
        }
    };

    const fetchAnimeRecommendations = async (animeId, allWatchedAnimeIds) => {
        try {
            const response = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/recommendations`);
            const filtered = response.data.data
                .map(rec => rec.entry)
                .filter(item => !allWatchedAnimeIds.includes(item.mal_id.toString()));

            return filtered;
        } catch (error) {
            console.error("Error fetching anime recommendations:", error);
            return [];
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                    <div className="flex justify-center items-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                    <div className="text-center text-red-500">{error}</div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'movies':
                return (
                    <div ref={contentRef}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {recommendedMovies.map((movie, index) => {
                                if (recommendedMovies.length === index + 1) {
                                    return (
                                        <div key={movie.id} ref={lastElementRef}>
                                            <MovieCard movie={movie} />
                                        </div>
                                    );
                                } else {
                                    return <MovieCard key={movie.id} movie={movie} />;
                                }
                            })}
                        </div>
                        {loadingMore && (
                            <div className="flex justify-center mt-8" ref={loadingRef}>
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                );
            case 'tvShows':
                return (
                    <div ref={contentRef}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {recommendedTvShows.map((show, index) => {
                                if (recommendedTvShows.length === index + 1) {
                                    return (
                                        <div key={show.id} ref={lastElementRef}>
                                            <TvShowCard show={show} />
                                        </div>
                                    );
                                } else {
                                    return <TvShowCard key={show.id} show={show} />;
                                }
                            })}
                        </div>
                        {loadingMore && (
                            <div className="flex justify-center mt-8" ref={loadingRef}>
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                );
            case 'anime':
                return (
                    <div ref={contentRef}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {recommendedAnime.map((anime, index) => {
                                if (recommendedAnime.length === index + 1) {
                                    return (
                                        <div key={anime.mal_id} ref={lastElementRef}>
                                            <AnimeCard anime={anime} />
                                        </div>
                                    );
                                } else {
                                    return <AnimeCard key={anime.mal_id} anime={anime} />;
                                }
                            })}
                        </div>
                        {loadingMore && (
                            <div className="flex justify-center mt-8" ref={loadingRef}>
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-200">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h1 className="text-3xl font-bold mb-4">Your Personalized Recommendations</h1>
                    <p className="text-gray-600">
                        Based on your watch history and ratings, we've analyzed your preferences to recommend content
                        you're likely to enjoy. Our AI considers factors like genres, themes, directors, and more to
                        provide tailored suggestions.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setActiveTab('movies')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                activeTab === 'movies' ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Movies
                        </button>
                        <button
                            onClick={() => setActiveTab('tvShows')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                activeTab === 'tvShows' ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            TV Shows
                        </button>
                        <button
                            onClick={() => setActiveTab('anime')}
                            className={`px-4 py-2 rounded-md transition-colors ${
                                activeTab === 'anime' ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            Anime
                        </button>
                    </div>
                </div>

                {movies.length === 0 && tvShows.length === 0 && anime.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <h2 className="text-xl font-semibold mb-4">No Recommendations Yet</h2>
                        <p className="text-gray-600">
                            To get personalized recommendations, start watching and rating some content!
                        </p>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>
        </div>
    );
};

export default Recommendations;