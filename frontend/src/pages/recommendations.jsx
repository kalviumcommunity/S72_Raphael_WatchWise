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
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeRecommendationTab') || 'movies');
    const [currentPage, setCurrentPage] = useState({
        movies: 1,
        tvShows: 1,
        anime: 1
    });
    
    const observer = useRef();
    const contentRef = useRef(null);
    const loadingRef = useRef(null);
    
    const [hasMore, setHasMore] = useState({
        movies: true,
        tvShows: true,
        anime: true
    });

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

    const fetchUserContent = async (token, forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            
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

            const watchedOrInProgressMovies = movieResponse.data.movies.filter(movie =>
                movie.watchStatus !== 'not_planning_to_watch'
            );
            const watchedOrInProgressTvShows = tvResponse.data.tvShows.filter(show =>
                show.watchStatus !== 'not_planning_to_watch'
            );
            const watchedOrInProgressAnime = animeResponse.data.anime.filter(item =>
                item.watchStatus !== 'not_planning_to_watch'
            );

            setMovies(watchedOrInProgressMovies);
            setTvShows(watchedOrInProgressTvShows);
            setAnime(watchedOrInProgressAnime);

            const allWatchedMovieIds = watchedOrInProgressMovies.map(m => m.movieId);
            const allWatchedTvShowIds = watchedOrInProgressTvShows.map(s => s.showId);
            const allWatchedAnimeIds = watchedOrInProgressAnime.map(a => a.animeId);

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
                
                // Shuffle recommendations if refreshing
                const finalRecommendations = forceRefresh 
                    ? shuffleArray(uniqueRecommendations).slice(0, 50)
                    : uniqueRecommendations.slice(0, 50);
                
                setRecommendedMovies(finalRecommendations);
                setHasMore(prev => ({ ...prev, movies: uniqueRecommendations.length > 50 }));
                localStorage.setItem('recommendations_movies', JSON.stringify(finalRecommendations));
            }

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
                
                const finalRecommendations = forceRefresh 
                    ? shuffleArray(uniqueRecommendations).slice(0, 50)
                    : uniqueRecommendations.slice(0, 50);
                
                setRecommendedTvShows(finalRecommendations);
                setHasMore(prev => ({ ...prev, tvShows: uniqueRecommendations.length > 50 }));
                localStorage.setItem('recommendations_tvShows', JSON.stringify(finalRecommendations));
            }

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
                
                const finalRecommendations = forceRefresh 
                    ? shuffleArray(uniqueRecommendations).slice(0, 50)
                    : uniqueRecommendations.slice(0, 50);
                
                setRecommendedAnime(finalRecommendations);
                setHasMore(prev => ({ ...prev, anime: uniqueRecommendations.length > 50 }));
                localStorage.setItem('recommendations_anime', JSON.stringify(finalRecommendations));
            }

            setLoading(false);
            setRefreshing(false);
        } catch (error) {
            console.error("Error fetching user content:", error);
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                setError("Failed to fetch your content. Please try again later.");
            }
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Shuffle array utility function
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const handleRefresh = () => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUserContent(token, true);
        }
    };

    const loadMoreContent = useCallback(async (type) => {
        const token = localStorage.getItem('token');
        if (!token || loadingMore || !hasMore[type]) return;

        try {
            setLoadingMore(true);

            const currentRecommendations = type === 'movies' ? recommendedMovies
                : type === 'tvShows' ? recommendedTvShows
                : recommendedAnime;

            const currentWatchedContent = type === 'movies' ? movies
                : type === 'tvShows' ? tvShows
                : anime;

            const currentWatchedIds = currentWatchedContent.map(item =>
                type === 'movies' ? item.movieId
                    : type === 'tvShows' ? item.showId
                        : item.animeId
            );

            const existingRecommendationIds = new Set(
                currentRecommendations.map(item =>
                    type === 'anime' ? item.mal_id : item.id
                )
            );

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

            const uniqueNewRecommendations = newRecommendations.filter(item => {
                const itemId = type === 'anime' ? item.mal_id : item.id;
                return !existingRecommendationIds.has(itemId);
            });

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

            setCurrentPage(prev => ({
                ...prev,
                [type]: prev[type] + 1
            }));

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

    useEffect(() => {
        if (observer.current) observer.current.disconnect();
    }, [activeTab]);

    const fetchMovieRecommendations = async (movieId, allWatchedMovieIds) => {
        try {
            const response = await axios.get(
                `https://api.themoviedb.org/3/movie/${movieId}/recommendations?api_key=${TMDB_API_KEY}&include_adult=false&with_original_language=en`
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
                `https://api.themoviedb.org/3/tv/${showId}/recommendations?api_key=${TMDB_API_KEY}&include_adult=false&with_original_language=en`
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
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                    <div className="flex justify-center items-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                    <div className="bg-red-900/30 border border-red-500 text-red-400 p-4 rounded-lg text-center">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'movies':
                return (
                    <div ref={contentRef}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                );
            case 'tvShows':
                return (
                    <div ref={contentRef}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                );
            case 'anime':
                return (
                    <div ref={contentRef}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-black">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                {/* Hero Section */}
                <div className="mb-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-3">Recommended For You</h1>
                            <p className="text-gray-400 text-lg max-w-3xl">
                                Personalized picks based on your watching history and preferences
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            <svg 
                                className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 border-b border-gray-800 mb-8">
                    {['movies', 'tvShows', 'anime'].map((tab) => {
                        const labels = { movies: 'Movies', tvShows: 'TV Shows', anime: 'Anime' };
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 font-semibold text-lg whitespace-nowrap transition-all duration-300 relative ${
                                    activeTab === tab
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {labels[tab]}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {movies.length === 0 && tvShows.length === 0 && anime.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-block p-6 bg-gray-900 rounded-full mb-6">
                            <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">No Recommendations Yet</h2>
                        <p className="text-gray-400 text-lg max-w-md mx-auto">
                            Start watching and rating content to get personalized recommendations tailored just for you!
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