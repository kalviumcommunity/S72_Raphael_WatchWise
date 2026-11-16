import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import MovieCard from "../components/Moviecard";
import TvShowCard from "../components/Tvshowcard";
import AnimeCard from "../components/Animecard";
import {
    Sparkles,
    Biohazard,
    Ghost,
    Eye,
    Landmark,
    Skull,
    Clock,
    Cpu,
    Rocket,
    Shield,
    Brain,
    Swords,
    Flame,
    Briefcase,
    Bug,
    ChevronDown,
    Search,
    X,
    Check
} from "lucide-react";
import {
    THEME_DEFINITIONS,
    calculateQualityScore,
    getItemTheme,
    partitionAndSortByYear,
    detectThemeFromKeywords,
    isHollywoodMedia
} from "../utils/themeEngine";

const TMDB_API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const DEFAULT_ENDPOINT = "https://s72-raphael-watchwise.onrender.com";
const LOCAL_ENDPOINT = "http://localhost:3000";

const fetchProfileWithFallback = async (path, token) => {
    try {
        const res = await axios.get(`${DEFAULT_ENDPOINT}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
        });
        return res.data;
    } catch {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            try {
                const localRes = await axios.get(`${LOCAL_ENDPOINT}${path}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 3000
                });
                return localRes.data;
            } catch {
                return null;
            }
        }
        return null;
    }
};

const THEME_CHIPS = [
    { id: 'all', label: 'All Picks', icon: Sparkles },
    { id: 'zombie', label: 'Zombie & Infection', icon: Biohazard },
    { id: 'supernatural', label: 'Supernatural & Haunted', icon: Ghost },
    { id: 'spy', label: 'Espionage & Spy', icon: Eye },
    { id: 'heist', label: 'Heist & Con', icon: Landmark },
    { id: 'slasher', label: 'Slasher & Serial Killer', icon: Skull },
    { id: 'time_travel', label: 'Time Travel & Multiverse', icon: Clock },
    { id: 'cyberpunk', label: 'Cyberpunk & AI', icon: Cpu },
    { id: 'space', label: 'Space & Sci-Fi', icon: Rocket },
    { id: 'superhero', label: 'Superhero & Vigilante', icon: Shield },
    { id: 'psychological', label: 'Psychological Thriller', icon: Brain },
    { id: 'martial_arts', label: 'Martial Arts & Combat', icon: Swords },
    { id: 'dystopia', label: 'Dystopian & Survival', icon: Flame },
    { id: 'mafia', label: 'Mafia & Crime', icon: Briefcase },
    { id: 'creature', label: 'Creature & Monster', icon: Bug }
];

/**
 * Fire-and-forget interaction tracker — records clicks for personalization profile
 */
const trackClick = async (token, mediaType, item) => {
    try {
        const genreIds =
            mediaType === "anime"
                ? (item.genres || []).map((g) => g.mal_id)
                : item.genre_ids || [];

        await axios.post(
            `${DEFAULT_ENDPOINT}/api/recommendations/interact`,
            {
                mediaType,
                mediaId: String(mediaType === "anime" ? item.mal_id : item.id),
                mediaTitle: item.title || item.name || item.title_english || "",
                eventType: "click",
                genreIds,
                metadata: { popularity: item.popularity || item.score || 0 },
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch {
        // Non-critical
    }
};

const deduplicateMedia = (items = []) => {
    const seen = new Set();
    const unique = [];
    for (const item of items) {
        if (!item) continue;
        const id = String(item.mal_id || item.id);
        if (!id || id === 'undefined' || id === 'null') continue;
        if (!seen.has(id)) {
            seen.add(id);
            unique.push(item);
        }
    }
    return unique;
};

const getRecommendationsFromStorage = (type) => {
    try {
        const stored = localStorage.getItem(`recommendations_${type}`);
        const parsed = stored ? JSON.parse(stored) : [];
        return deduplicateMedia(parsed);
    } catch (error) {
        console.error(`Error retrieving ${type} recommendations:`, error);
        return [];
    }
};

const Recommendations = () => {
    const navigate = useNavigate();

    // Watched profile data (Strictly segregated by media type)
    const [movies, setMovies] = useState([]);
    const [tvShows, setTvShows] = useState([]);
    const [anime, setAnime] = useState([]);

    // Tab & Recommendations State
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeRecommendationTab') || 'movies');
    const [recommendedMovies, setRecommendedMovies] = useState(() => getRecommendationsFromStorage('movies'));
    const [recommendedTvShows, setRecommendedTvShows] = useState(() => getRecommendationsFromStorage('tvShows'));
    const [recommendedAnime, setRecommendedAnime] = useState(() => getRecommendationsFromStorage('anime'));

    const [selectedTheme, setSelectedTheme] = useState('all');
    const [themeContent, setThemeContent] = useState({});
    const [loadingTheme, setLoadingTheme] = useState(false);
    const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
    const [themeSearchQuery, setThemeSearchQuery] = useState('');
    const themeDropdownRef = useRef(null);

    // Dismiss popover on outside click or Escape key
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
                setIsThemeDropdownOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsThemeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const filteredThemes = useMemo(() => {
        if (!themeSearchQuery.trim()) return THEME_CHIPS;
        const q = themeSearchQuery.toLowerCase();
        return THEME_CHIPS.filter(c => c.label.toLowerCase().includes(q));
    }, [themeSearchQuery]);

    const activeThemeChip = useMemo(() => {
        return THEME_CHIPS.find(c => c.id === selectedTheme) || THEME_CHIPS[0];
    }, [selectedTheme]);

    // Initial page loading state: false if cached recommendations are already present for the active tab!
    const [loading, setLoading] = useState(() => {
        const initialTab = localStorage.getItem('activeRecommendationTab') || 'movies';
        const cached = getRecommendationsFromStorage(initialTab);
        return cached.length === 0;
    });

    const [tabLoading, setTabLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const [currentPage, setCurrentPage] = useState({
        movies: 1,
        tvShows: 1,
        anime: 1
    });

    const observer = useRef();
    const contentRef = useRef(null);
    const loadingRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const loadedTabsRef = useRef(new Set());
    const userProfileRef = useRef(null);

    const [hasMore, setHasMore] = useState({
        movies: true,
        tvShows: true,
        anime: true
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Multi-Channel Recommendation Helpers (Mirrors Similar Movies Pipeline)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Fetches candidates similar in theme/collection/story to a given movie
     * Uses append_to_response to retrieve keywords, recommendations, and similar in 1 request!
     */
    const fetchSimilarStyleMovieRecs = async (movieId, allWatchedMovieIds, page = 1) => {
        const candidates = [];
        const watchedSet = new Set(allWatchedMovieIds.map(String));

        try {
            const detailsRes = await axios.get(
                `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=keywords,recommendations,similar`,
                { timeout: 4500 }
            );

            const movieData = detailsRes.data;
            const keywords = movieData?.keywords?.keywords || [];
            const isHollywood = isHollywoodMedia(movieData);

            // 1. Franchise / Collection Discovery (e.g. Dark Knight, Fast & Furious, Harry Potter)
            if (page === 1 && movieData?.belongs_to_collection?.id) {
                try {
                    const collRes = await axios.get(
                        `https://api.themoviedb.org/3/collection/${movieData.belongs_to_collection.id}?api_key=${TMDB_API_KEY}`,
                        { timeout: 3500 }
                    );
                    for (const part of (collRes.data?.parts || [])) {
                        if (part.id && !watchedSet.has(String(part.id))) {
                            candidates.push(part);
                        }
                    }
                } catch {
                    // Non-critical
                }
            }

            // 2. Thematic Keyword Discovery (Zombie, Supernatural, Heist, Espionage, etc.)
            const detectedTheme = detectThemeFromKeywords(keywords, false);
            if (detectedTheme?.themeKeywordIds?.length > 0) {
                try {
                    const kwQuery = detectedTheme.themeKeywordIds.slice(0, 3).join('|');
                    const genreParam = movieData?.genres?.[0]?.id ? `&with_genres=${movieData.genres[0].id}` : '';
                    const langParam = isHollywood
                        ? '&with_original_language=en'
                        : (movieData?.original_language ? `&with_original_language=${movieData.original_language}` : '');

                    const discRes = await axios.get(
                        `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_keywords=${kwQuery}${genreParam}${langParam}&primary_release_date.gte=2000-01-01&sort_by=popularity.desc&page=${page}`,
                        { timeout: 4000 }
                    );
                    for (const item of (discRes.data?.results || [])) {
                        if (item.id && !watchedSet.has(String(item.id))) {
                            candidates.push(item);
                        }
                    }
                } catch {
                    // Non-critical
                }
            }

            // 3. TMDB Recommendations & Similar (Retrieved simultaneously in append_to_response)
            const recsList = movieData?.recommendations?.results || [];
            const simList = movieData?.similar?.results || [];

            for (const item of [...recsList, ...simList]) {
                if (item.id && !watchedSet.has(String(item.id))) {
                    candidates.push(item);
                }
            }
        } catch (err) {
            console.warn(`Movie recommendation fetch error for ${movieId}:`, err.message);
        }

        return candidates;
    };

    const fetchCuratedMovies = async (allWatchedIds = [], page = 1) => {
        const watchedSet = new Set(allWatchedIds.map(String));
        try {
            const res = await axios.get(
                `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&primary_release_date.gte=2000-01-01&vote_count.gte=300&include_adult=false&with_original_language=en&page=${page}`,
                { timeout: 5000 }
            );
            return (res.data?.results || []).filter(m => m.id && !watchedSet.has(String(m.id)));
        } catch (err) {
            console.error("Error fetching curated movies:", err);
            return [];
        }
    };

    /**
     * Fetches candidates similar in theme/format to a given TV show
     * Uses append_to_response to retrieve keywords, recommendations, and similar in 1 request!
     */
    const fetchSimilarStyleTvRecs = async (showId, allWatchedTvShowIds, page = 1) => {
        const candidates = [];
        const watchedSet = new Set(allWatchedTvShowIds.map(String));

        try {
            const detailsRes = await axios.get(
                `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}&append_to_response=keywords,recommendations,similar`,
                { timeout: 4500 }
            );

            const showData = detailsRes.data;
            const keywords = showData?.keywords?.results || [];
            const isHollywood = isHollywoodMedia(showData);

            const detectedTheme = detectThemeFromKeywords(keywords, true);
            if (detectedTheme?.themeKeywordIds?.length > 0) {
                try {
                    const kwQuery = detectedTheme.themeKeywordIds.slice(0, 3).join('|');
                    const genreParam = showData?.genres?.[0]?.id ? `&with_genres=${showData.genres[0].id}` : '';
                    const langParam = isHollywood
                        ? '&with_original_language=en'
                        : (showData?.original_language ? `&with_original_language=${showData.original_language}` : '');

                    const discRes = await axios.get(
                        `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_keywords=${kwQuery}${genreParam}${langParam}&first_air_date.gte=2000-01-01&sort_by=popularity.desc&page=${page}`,
                        { timeout: 4000 }
                    );
                    for (const item of (discRes.data?.results || [])) {
                        if (item.id && !watchedSet.has(String(item.id))) {
                            candidates.push(item);
                        }
                    }
                } catch {
                    // Non-critical
                }
            }

            const recsList = showData?.recommendations?.results || [];
            const simList = showData?.similar?.results || [];

            for (const item of [...recsList, ...simList]) {
                if (item.id && !watchedSet.has(String(item.id))) {
                    candidates.push(item);
                }
            }
        } catch (err) {
            console.warn(`TV recommendation fetch error for ${showId}:`, err.message);
        }

        return candidates;
    };

    const fetchCuratedTvShows = async (allWatchedIds = [], page = 1) => {
        const watchedSet = new Set(allWatchedIds.map(String));
        try {
            const res = await axios.get(
                `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&first_air_date.gte=2000-01-01&vote_count.gte=100&include_adult=false&with_original_language=en&page=${page}`,
                { timeout: 5000 }
            );
            return (res.data?.results || []).filter(s => s.id && !watchedSet.has(String(s.id)));
        } catch (err) {
            console.error("Error fetching curated TV shows:", err);
            return [];
        }
    };

    /**
     * Anime recommendation helper — bounded with a strict 3000ms timeout
     * so slow Jikan rate limits never hang or block the application
     */
    const fetchSimilarStyleAnimeRecs = async (animeId, allWatchedAnimeIds) => {
        const watchedSet = new Set(allWatchedAnimeIds.map(String));
        try {
            const res = await axios.get(`https://api.jikan.moe/v4/anime/${animeId}/recommendations`, { timeout: 3000 });
            const list = (res.data?.data || []).map(r => r.entry).filter(a => a?.mal_id && !watchedSet.has(String(a.mal_id)));
            return list;
        } catch (err) {
            console.warn(`Jikan recommendations failed for anime ${animeId}:`, err.message);
            return [];
        }
    };

    const fetchCuratedAnime = async (allWatchedIds = [], page = 1) => {
        const watchedSet = new Set(allWatchedIds.map(String));
        try {
            const res = await axios.get(`https://api.jikan.moe/v4/top/anime?page=${page}`, { timeout: 3500 });
            return (res.data?.data || []).filter(a => a?.mal_id && !watchedSet.has(String(a.mal_id)));
        } catch (err) {
            console.error("Error fetching curated anime:", err);
            return [];
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Tab-Specific Recommendation Generators
    // ──────────────────────────────────────────────────────────────────────────

    const generateMovieRecs = async (profile, page = 1) => {
        const watchedMovies = profile?.watchedMovies || [];
        const allWatchedMovieIds = profile?.allWatchedMovieIds || [];

        let movieCandidates = [];
        const topLikedMovies = watchedMovies.slice(0, 6);

        if (topLikedMovies.length > 0) {
            const recPromises = topLikedMovies.map(movie =>
                fetchSimilarStyleMovieRecs(movie.movieId, allWatchedMovieIds, page)
            );
            const settled = await Promise.allSettled(recPromises);
            movieCandidates = settled
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value)
                .flat();
        }

        if (movieCandidates.length < 24) {
            const curated = await fetchCuratedMovies(allWatchedMovieIds, page);
            movieCandidates = [...movieCandidates, ...curated];
        }

        const uniqueMovieCandidates = deduplicateMedia(movieCandidates);

        // Prioritize Hollywood movies if top watched movies are Hollywood / English
        const isUserHollywood = topLikedMovies.length === 0 || topLikedMovies.some(m => isHollywoodMedia(m) || m.original_language === 'en');
        const { combined: finalMovieRecs } = partitionAndSortByYear(uniqueMovieCandidates, null, 'en', isUserHollywood);
        const topMovieRecs = deduplicateMedia(finalMovieRecs).slice(0, 50);

        setRecommendedMovies(topMovieRecs);
        setHasMore(prev => ({ ...prev, movies: finalMovieRecs.length > 50 }));
        localStorage.setItem('recommendations_movies', JSON.stringify(topMovieRecs));
        return topMovieRecs;
    };

    const generateTvRecs = async (profile, page = 1) => {
        const watchedTvShows = profile?.watchedTvShows || [];
        const allWatchedTvShowIds = profile?.allWatchedTvShowIds || [];

        let tvCandidates = [];
        const topLikedShows = watchedTvShows.slice(0, 6);

        if (topLikedShows.length > 0) {
            const recPromises = topLikedShows.map(show =>
                fetchSimilarStyleTvRecs(show.showId, allWatchedTvShowIds, page)
            );
            const settled = await Promise.allSettled(recPromises);
            tvCandidates = settled
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value)
                .flat();
        }

        if (tvCandidates.length < 24) {
            const curated = await fetchCuratedTvShows(allWatchedTvShowIds, page);
            tvCandidates = [...tvCandidates, ...curated];
        }

        const uniqueTvCandidates = deduplicateMedia(tvCandidates);

        const isUserHollywood = topLikedShows.length === 0 || topLikedShows.some(s => isHollywoodMedia(s) || s.original_language === 'en');
        const { combined: finalTvRecs } = partitionAndSortByYear(uniqueTvCandidates, null, 'en', isUserHollywood);
        const topTvRecs = deduplicateMedia(finalTvRecs).slice(0, 50);

        setRecommendedTvShows(topTvRecs);
        setHasMore(prev => ({ ...prev, tvShows: finalTvRecs.length > 50 }));
        localStorage.setItem('recommendations_tvShows', JSON.stringify(topTvRecs));
        return topTvRecs;
    };

    const generateAnimeRecs = async (profile, page = 1) => {
        const watchedAnime = profile?.watchedAnime || [];
        const allWatchedAnimeIds = profile?.allWatchedAnimeIds || [];

        let animeCandidates = [];
        // Use at most 2 seeds for Jikan to respect rate limits and keep response snappy
        const topLikedAnime = watchedAnime.slice(0, 2);

        if (topLikedAnime.length > 0) {
            const recPromises = topLikedAnime.map(a =>
                fetchSimilarStyleAnimeRecs(a.animeId, allWatchedAnimeIds)
            );
            const settled = await Promise.allSettled(recPromises);
            animeCandidates = settled
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value)
                .flat();
        }

        if (animeCandidates.length < 20) {
            const curated = await fetchCuratedAnime(allWatchedAnimeIds, page);
            animeCandidates = [...animeCandidates, ...curated];
        }

        const uniqueAnimeCandidates = deduplicateMedia(animeCandidates);

        const { combined: finalAnimeRecs } = partitionAndSortByYear(uniqueAnimeCandidates);
        const topAnimeRecs = deduplicateMedia(finalAnimeRecs).slice(0, 50);

        setRecommendedAnime(topAnimeRecs);
        setHasMore(prev => ({ ...prev, anime: finalAnimeRecs.length > 50 }));
        localStorage.setItem('recommendations_anime', JSON.stringify(topAnimeRecs));
        return topAnimeRecs;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Profile Fetcher & Initial Load (Decoupled per Tab)
    // ──────────────────────────────────────────────────────────────────────────

    const fetchUserContent = async (token, forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else if (getRecommendationsFromStorage(activeTab).length === 0) {
                setLoading(true);
            }

            // Fetch user profile collections with timeout & fallback so network hiccups don't freeze the page
            const [movieRes, tvRes, animeRes] = await Promise.allSettled([
                fetchProfileWithFallback('/api/profile/movies', token),
                fetchProfileWithFallback('/api/profile/tvshows', token),
                fetchProfileWithFallback('/api/profile/anime', token),
            ]);

            const movieData = movieRes.status === 'fulfilled' && movieRes.value?.movies ? movieRes.value.movies : [];
            const tvData = tvRes.status === 'fulfilled' && tvRes.value?.tvShows ? tvRes.value.tvShows : [];
            const animeData = animeRes.status === 'fulfilled' && animeRes.value?.anime ? animeRes.value.anime : [];

            // STRICT MEDIA ISOLATION & FULL LIBRARY EXCLUSION:
            // 1. MOVIES: Watched movies prioritized by user rating (unrated defaults to 6.5 neutral)
            const watchedMovies = movieData
                .filter(m => m.watchStatus === 'watched')
                .sort((a, b) => (Number(b.rating) || 6.5) - (Number(a.rating) || 6.5));

            // 2. TV SHOWS: Watched TV shows prioritized by user rating
            const watchedTvShows = tvData
                .filter(s => s.watchStatus === 'watched')
                .sort((a, b) => (Number(b.rating) || 6.5) - (Number(a.rating) || 6.5));

            // 3. ANIME: Watched anime prioritized by user rating
            const watchedAnime = animeData
                .filter(a => a.watchStatus === 'watched')
                .sort((a, b) => (Number(b.rating) || 6.5) - (Number(a.rating) || 6.5));

            setMovies(watchedMovies);
            setTvShows(watchedTvShows);
            setAnime(watchedAnime);

            // All media items in user's library (watched, currently watching, planned) MUST be excluded from recommendations
            const allUserMovieIds = movieData
                .filter(m => ['watched', 'inProgress', 'planToWatch'].includes(m.watchStatus))
                .map(m => String(m.movieId));
            const allUserTvShowIds = tvData
                .filter(s => ['watched', 'inProgress', 'planToWatch'].includes(s.watchStatus))
                .map(s => String(s.showId));
            const allUserAnimeIds = animeData
                .filter(a => ['watched', 'inProgress', 'planToWatch'].includes(a.watchStatus))
                .map(a => String(a.animeId));

            const profileData = {
                watchedMovies,
                watchedTvShows,
                watchedAnime,
                allWatchedMovieIds: allUserMovieIds,
                allWatchedTvShowIds: allUserTvShowIds,
                allWatchedAnimeIds: allUserAnimeIds,
            };
            userProfileRef.current = profileData;

            loadedTabsRef.current.clear();

            // GENERATE ONLY THE ACTIVE TAB — Instant ~300ms render!
            // Other tabs will be generated seamlessly when clicked without blocking Movies!
            if (activeTab === 'movies') {
                await generateMovieRecs(profileData, 1);
                loadedTabsRef.current.add('movies');
            } else if (activeTab === 'tvShows') {
                await generateTvRecs(profileData, 1);
                loadedTabsRef.current.add('tvShows');
            } else if (activeTab === 'anime') {
                await generateAnimeRecs(profileData, 1);
                loadedTabsRef.current.add('anime');
            }
        } catch (err) {
            console.error("Error fetching user content:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                // Curated fallback so user is never stuck
                try {
                    if (activeTab === 'movies') {
                        const fallbackMovies = await fetchCuratedMovies([], 1);
                        const { combined } = partitionAndSortByYear(fallbackMovies, null, 'en', true);
                        setRecommendedMovies(combined.slice(0, 50));
                    }
                } catch {
                    // Non-critical
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        fetchUserContent(token);

        const handleWatchStatusUpdate = () => {
            fetchUserContent(token, true);
        };

        window.addEventListener('watchStatusUpdated', handleWatchStatusUpdate);

        return () => {
            window.removeEventListener('watchStatusUpdated', handleWatchStatusUpdate);
        };
    }, [navigate]);

    /**
     * Seamless Tab Switching — On-demand generation with inline loading
     */
    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        setSelectedTheme('all');
        localStorage.setItem('activeRecommendationTab', tab);

        if (!loadedTabsRef.current.has(tab) && userProfileRef.current) {
            const cached = getRecommendationsFromStorage(tab);
            if (cached.length === 0) {
                setTabLoading(true);
            }
            try {
                if (tab === 'movies') {
                    await generateMovieRecs(userProfileRef.current, 1);
                } else if (tab === 'tvShows') {
                    await generateTvRecs(userProfileRef.current, 1);
                } else if (tab === 'anime') {
                    await generateAnimeRecs(userProfileRef.current, 1);
                }
                loadedTabsRef.current.add(tab);
            } catch (err) {
                console.error(`Error loading recommendations for ${tab}:`, err);
            } finally {
                setTabLoading(false);
            }
        }
    };

    const handleRefresh = () => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUserContent(token, true);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Infinite Scroll / Load More
    // ──────────────────────────────────────────────────────────────────────────

    const loadMoreContent = useCallback(async (type) => {
        const token = localStorage.getItem('token');
        if (!token || loadingMoreRef.current || !hasMore[type]) return;

        try {
            loadingMoreRef.current = true;
            setLoadingMore(true);

            const currentRecommendations = type === 'movies' ? recommendedMovies
                : type === 'tvShows' ? recommendedTvShows
                : recommendedAnime;

            const currentWatchedContent = type === 'movies' ? movies
                : type === 'tvShows' ? tvShows
                : anime;

            const currentWatchedIds = currentWatchedContent.map(item =>
                String(type === 'movies' ? item.movieId : type === 'tvShows' ? item.showId : item.animeId)
            );

            // Master Set of existing IDs to prevent any duplicate insertion
            const seenIds = new Set([
                ...currentRecommendations.map(item => String(type === 'anime' ? item.mal_id : item.id)),
                ...currentWatchedIds.map(String)
            ]);

            const nextPage = (currentPage[type] || 1) + 1;
            let newRecommendations = [];

            if (type === 'movies') {
                if (currentWatchedContent.length > 0) {
                    const topLiked = currentWatchedContent.slice(0, 4);
                    const results = await Promise.allSettled(
                        topLiked.map(m => fetchSimilarStyleMovieRecs(m.movieId, currentWatchedIds, nextPage))
                    );
                    newRecommendations = results.filter(r => r.status === 'fulfilled').map(r => r.value).flat();
                }
                if (newRecommendations.length < 15) {
                    const curated = await fetchCuratedMovies(currentWatchedIds, nextPage);
                    newRecommendations = [...newRecommendations, ...curated];
                }
            } else if (type === 'tvShows') {
                if (currentWatchedContent.length > 0) {
                    const topLiked = currentWatchedContent.slice(0, 4);
                    const results = await Promise.allSettled(
                        topLiked.map(s => fetchSimilarStyleTvRecs(s.showId, currentWatchedIds, nextPage))
                    );
                    newRecommendations = results.filter(r => r.status === 'fulfilled').map(r => r.value).flat();
                }
                if (newRecommendations.length < 15) {
                    const curated = await fetchCuratedTvShows(currentWatchedIds, nextPage);
                    newRecommendations = [...newRecommendations, ...curated];
                }
            } else if (type === 'anime') {
                const curated = await fetchCuratedAnime(currentWatchedIds, nextPage);
                newRecommendations = curated;
            }

            // Deduplicate new incoming recommendations strictly in-place
            const uniqueNewRecommendations = [];
            for (const item of newRecommendations) {
                if (!item) continue;
                const itemId = String(type === 'anime' ? item.mal_id : item.id);
                if (!itemId || itemId === 'undefined' || itemId === 'null') continue;
                if (!seenIds.has(itemId)) {
                    seenIds.add(itemId);
                    uniqueNewRecommendations.push(item);
                }
            }

            const isUserHollywood = type === 'movies' && (currentWatchedContent.length === 0 || currentWatchedContent.some(m => isHollywoodMedia(m) || m.original_language === 'en'));
            const { combined: sortedUniqueNew } = partitionAndSortByYear(
                uniqueNewRecommendations,
                null,
                type === 'movies' ? 'en' : null,
                isUserHollywood
            );
            const batchSize = 20;
            const toAdd = sortedUniqueNew.slice(0, batchSize);

            if (type === 'movies') {
                setRecommendedMovies(prev => {
                    const updated = deduplicateMedia([...prev, ...toAdd]);
                    localStorage.setItem('recommendations_movies', JSON.stringify(updated));
                    return updated;
                });
            } else if (type === 'tvShows') {
                setRecommendedTvShows(prev => {
                    const updated = deduplicateMedia([...prev, ...toAdd]);
                    localStorage.setItem('recommendations_tvShows', JSON.stringify(updated));
                    return updated;
                });
            } else {
                setRecommendedAnime(prev => {
                    const updated = deduplicateMedia([...prev, ...toAdd]);
                    localStorage.setItem('recommendations_anime', JSON.stringify(updated));
                    return updated;
                });
            }

            setCurrentPage(prev => ({
                ...prev,
                [type]: nextPage
            }));

            setHasMore(prev => ({
                ...prev,
                [type]: toAdd.length > 0 && nextPage < 10
            }));

        } catch (error) {
            console.error(`Error loading more ${type}:`, error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [recommendedMovies, recommendedTvShows, recommendedAnime, movies, tvShows, anime, hasMore, currentPage]);

    const lastElementRef = useCallback(node => {
        if (loadingMoreRef.current) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore[activeTab] && !loadingMoreRef.current) {
                loadMoreContent(activeTab);
            }
        }, { threshold: 0.2 });
        
        if (node) observer.current.observe(node);
    }, [activeTab, loadMoreContent, hasMore]);

    useEffect(() => {
        if (observer.current) observer.current.disconnect();
    }, [activeTab]);

    // ──────────────────────────────────────────────────────────────────────────
    // Thematic Filter Handling
    // ──────────────────────────────────────────────────────────────────────────

    const handleThemeSelect = async (themeId) => {
        setSelectedTheme(themeId);
        if (themeId === 'all') return;

        const cacheKey = `${activeTab}_${themeId}`;
        if (themeContent[cacheKey]) return;

        const themeDef = THEME_DEFINITIONS.find(t => t.id === themeId);
        if (!themeDef) return;

        const excludedIds = activeTab === 'movies'
            ? (userProfileRef.current?.allWatchedMovieIds || [])
            : activeTab === 'tvShows'
                ? (userProfileRef.current?.allWatchedTvShowIds || [])
                : (userProfileRef.current?.allWatchedAnimeIds || []);
        const excludedSet = new Set(excludedIds.map(String));

        try {
            setLoadingTheme(true);
            if (activeTab === 'movies') {
                const kw = themeDef.defaultKeywordIds || '12377';
                const res = await axios.get(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_keywords=${kw}&sort_by=popularity.desc&primary_release_date.gte=2000-01-01&page=1`
                );
                const filtered = (res.data?.results || []).filter(m => m.id && !excludedSet.has(String(m.id)));
                const { combined: items } = partitionAndSortByYear(filtered, themeId, 'en', true);
                setThemeContent(prev => ({ ...prev, [cacheKey]: deduplicateMedia(items) }));
            } else if (activeTab === 'tvShows') {
                const kw = themeDef.defaultKeywordIds || '12377';
                const res = await axios.get(
                    `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_keywords=${kw}&sort_by=popularity.desc&first_air_date.gte=2000-01-01&page=1`
                );
                const filtered = (res.data?.results || []).filter(s => s.id && !excludedSet.has(String(s.id)));
                const { combined: items } = partitionAndSortByYear(filtered, themeId);
                setThemeContent(prev => ({ ...prev, [cacheKey]: deduplicateMedia(items) }));
            }
        } catch (err) {
            console.warn("Could not fetch thematic recommendations:", err?.message);
        } finally {
            setLoadingTheme(false);
        }
    };

    const displayedItems = useMemo(() => {
        const baseList = activeTab === 'movies' ? recommendedMovies
            : activeTab === 'tvShows' ? recommendedTvShows
            : recommendedAnime;

        const uniqueBase = deduplicateMedia(baseList);

        if (selectedTheme === 'all') {
            return uniqueBase;
        }

        const themeDef = THEME_DEFINITIONS.find(t => t.id === selectedTheme);
        const cacheKey = `${activeTab}_${selectedTheme}`;
        const externalThematic = themeContent[cacheKey] || [];

        // Filter local recommendations matching this theme
        const localMatching = uniqueBase.filter(item => {
            const itemTheme = getItemTheme(item);
            if (itemTheme === selectedTheme) return true;
            if (!themeDef) return false;
            const text = `${item.title || item.name || item.title_english || ''} ${item.overview || item.synopsis || ''}`.toLowerCase();
            return themeDef.patterns.some(p => text.includes(p));
        });

        // Merge local matching and on-demand discover results, deduplicating strictly by ID
        const merged = deduplicateMedia([...localMatching, ...externalThematic]);
        const { combined: sortedMerged } = partitionAndSortByYear(merged, selectedTheme);
        return deduplicateMedia(sortedMerged);
    }, [activeTab, recommendedMovies, recommendedTvShows, recommendedAnime, selectedTheme, themeContent]);

    // Full screen loading indicator (only on very first initial cold load when no cache exists)
    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
                    <div className="flex flex-col justify-center items-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-400 font-medium">Curating your personalized recommendations...</p>
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

    const token = localStorage.getItem('token');

    const renderContent = () => {
        if (tabLoading) {
            return (
                <div className="flex flex-col justify-center items-center py-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-400 font-medium">
                        Loading personalized {activeTab === 'movies' ? 'movies' : activeTab === 'tvShows' ? 'TV shows' : 'anime'}...
                    </p>
                </div>
            );
        }

        if (loadingTheme) {
            return (
                <div className="flex flex-col justify-center items-center py-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-400 font-medium">
                        Gathering top {THEME_CHIPS.find(c => c.id === selectedTheme)?.label || 'thematic'} titles...
                    </p>
                </div>
            );
        }

        if (displayedItems.length === 0) {
            const currentChip = THEME_CHIPS.find(c => c.id === selectedTheme);
            return (
                <div className="text-center py-20 bg-gray-900/40 rounded-2xl border border-gray-800 p-8 max-w-xl mx-auto">
                    <h3 className="text-xl font-bold text-white mb-2">No {currentChip?.label} titles found</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        We could not find matching titles in your immediate pool. Try exploring All Picks or other themes!
                    </p>
                    <button
                        onClick={() => setSelectedTheme('all')}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md"
                    >
                        Back to All Picks
                    </button>
                </div>
            );
        }

        return (
            <div ref={contentRef}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {displayedItems.map((item, index) => {
                        const itemId = activeTab === 'anime' ? item.mal_id : item.id;
                        const card = (
                            <div
                                key={`${activeTab}-${itemId}-${index}`}
                                onClick={() => trackClick(token, activeTab === 'movies' ? "movie" : activeTab === 'tvShows' ? "tvshow" : "anime", item)}
                            >
                                {activeTab === 'movies' && <MovieCard movie={item} />}
                                {activeTab === 'tvShows' && <TvShowCard show={item} />}
                                {activeTab === 'anime' && <AnimeCard anime={item} />}
                            </div>
                        );
                        if (displayedItems.length === index + 1 && selectedTheme === 'all') {
                            return <div key={`${activeTab}-${itemId}-last`} ref={lastElementRef}>{card}</div>;
                        }
                        return card;
                    })}
                </div>
                {loadingMore && selectedTheme === 'all' && (
                    <div className="flex justify-center mt-8" ref={loadingRef}>
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
            </div>
        );
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

                {/* Tab Navigation & Glassmorphic Theme Popover */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-3 mb-6">
                    {/* Media Tabs */}
                    <div className="flex items-center gap-1 sm:gap-2">
                        {['movies', 'tvShows', 'anime'].map((tab) => {
                            const labels = { movies: 'Movies', tvShows: 'TV Shows', anime: 'Anime' };
                            return (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`px-4 sm:px-6 py-2.5 font-semibold text-base sm:text-lg whitespace-nowrap transition-all duration-200 relative ${
                                        activeTab === tab
                                            ? 'text-white'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {labels[tab]}
                                    {activeTab === tab && (
                                        <div className="absolute -bottom-3 left-0 right-0 h-1 bg-blue-600 rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Glassmorphic Theme Popover */}
                    <div className="relative self-start sm:self-center" ref={themeDropdownRef}>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsThemeDropdownOpen(prev => !prev)}
                                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border backdrop-blur-md shadow-md ${
                                    selectedTheme !== 'all'
                                        ? 'bg-blue-600/25 border-blue-500/50 text-blue-200 hover:bg-blue-600/35'
                                        : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                                }`}
                                title="Filter recommendations by curated narrative theme"
                            >
                                {(() => {
                                    const ActiveIcon = activeThemeChip.icon || Sparkles;
                                    return <ActiveIcon className="w-4 h-4 text-blue-400" />;
                                })()}
                                <span>{activeThemeChip.label}</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {selectedTheme !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => handleThemeSelect('all')}
                                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition"
                                    title="Reset to All Picks"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Floating Liquid Glass Dropdown Panel */}
                        {isThemeDropdownOpen && (
                            <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-72 sm:w-80 md:w-96 rounded-2xl backdrop-blur-2xl bg-[#0c121e]/75 border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] p-3 animate-fadeIn backdrop-saturate-150">
                                {/* Search input inside popover */}
                                <div className="relative mb-2.5">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search themes..."
                                        value={themeSearchQuery}
                                        onChange={(e) => setThemeSearchQuery(e.target.value)}
                                        className="w-full bg-white/10 border border-white/15 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-white/30 backdrop-blur-md transition-colors"
                                        autoFocus
                                    />
                                    {themeSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setThemeSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Themes Grid - Hidden Scrollbar */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {filteredThemes.map(chip => {
                                        const ChipIcon = chip.icon || Sparkles;
                                        const isSelected = selectedTheme === chip.id;
                                        return (
                                            <button
                                                key={chip.id}
                                                type="button"
                                                onClick={() => {
                                                    handleThemeSelect(chip.id);
                                                    setIsThemeDropdownOpen(false);
                                                    setThemeSearchQuery('');
                                                }}
                                                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                                                    isSelected
                                                        ? 'bg-blue-600/90 text-white shadow-md font-semibold border border-blue-400/50 backdrop-blur-md'
                                                        : 'text-gray-200 hover:text-white hover:bg-white/15 border border-transparent hover:border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <ChipIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                                                    <span className="truncate">{chip.label}</span>
                                                </div>
                                                {isSelected && <Check className="w-3 h-3 flex-shrink-0 text-white" />}
                                            </button>
                                        );
                                    })}
                                    {filteredThemes.length === 0 && (
                                        <div className="col-span-2 text-center py-4 text-xs text-gray-400">
                                            No themes matching "{themeSearchQuery}"
                                        </div>
                                    )}
                                </div>

                                {/* Footer reset shortcut */}
                                {selectedTheme !== 'all' && (
                                    <div className="mt-2.5 pt-2 border-t border-white/15 flex justify-between items-center px-1">
                                        <span className="text-[11px] text-gray-300">Active: {activeThemeChip.label}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleThemeSelect('all');
                                                setIsThemeDropdownOpen(false);
                                                setThemeSearchQuery('');
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition"
                                        >
                                            Reset to All
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default Recommendations;
