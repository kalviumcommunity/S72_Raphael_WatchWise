//eslint-disable-next-line
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import MovieCard from "../components/Moviecard";
import LoadingScreen from "../components/LoadingScreen";
import MovieCoverCarousel from "../components/MovieCoverCarousel";
import { detectThemeFromKeywords, calculateQualityScore, isHollywoodMedia, partitionAndSortByYear, getMediaYear } from "../utils/themeEngine";

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const MOVIE_DETAILS_URL = "https://api.themoviedb.org/3/movie/";
const Endpoint = "https://s72-raphael-watchwise.onrender.com";
//http://localhost:3000

/**
 * Fire-and-forget interaction tracker.
 * Sends a signal to the recommendation engine without blocking the UI.
 */
const trackInteraction = async (token, payload) => {
    try {
        await axios.post(`${Endpoint}/api/recommendations/interact`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        // Non-critical — swallow silently
    }
};

const WATCH_STATUS = {
  NOT_PLANNING: 'notPlanning',
  NOT_STARTED: 'planToWatch',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'watched'
};

const WATCH_STATUS_LABELS = {
  [WATCH_STATUS.NOT_PLANNING]: "Not Planning to Watch",
  [WATCH_STATUS.NOT_STARTED]: "Plan to Watch",
  [WATCH_STATUS.IN_PROGRESS]: "In Progress",
  [WATCH_STATUS.COMPLETED]: "Watched"
};

const WATCH_STATUS_STYLES = {
  [WATCH_STATUS.NOT_PLANNING]: 'bg-red-500',
  [WATCH_STATUS.NOT_STARTED]: 'bg-blue-500',
  [WATCH_STATUS.IN_PROGRESS]: 'bg-yellow-500',
  [WATCH_STATUS.COMPLETED]: 'bg-green-500'
};

const RATING_CONFIG = [
  { value: 2, label: '1', color: 'bg-red-500' },
  { value: 4, label: '2', color: 'bg-orange-500' },
  { value: 6, label: '3', color: 'bg-yellow-500' },
  { value: 8, label: '4', color: 'bg-lime-500' },
  { value: 10, label: '5', color: 'bg-green-500' }
];

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchStatus, setWatchStatus] = useState(WATCH_STATUS.NOT_PLANNING);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trailers, setTrailers] = useState([]);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [movieImages, setMovieImages] = useState([]);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarPage, setSimilarPage] = useState(1);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [themeInfo, setThemeInfo] = useState(null);
  const seenMovieIdsRef = useRef(new Set());
  const userExcludedMovieIdsRef = useRef(new Set());
  const movieDetailsRef = useRef(null);
  const themeInfoRef = useRef(null);
  const pre2000ReservoirRef = useRef([]);
  const post2000ExhaustedRef = useRef(false);

  useEffect(() => {
    // Scroll to top when movie changes
    window.scrollTo(0, 0);

    // Reset states immediately when movie ID changes
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setHoverRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailers([]);
    setSelectedTrailer(null);
    setMovieImages([]);
    setSimilarMovies([]);
    setSimilarPage(1);
    setHasMoreSimilar(true);
    setLoadingSimilar(false);
    setThemeInfo(null);
    themeInfoRef.current = null;
    userExcludedMovieIdsRef.current = new Set();
    seenMovieIdsRef.current = new Set([Number(id)]);
    pre2000ReservoirRef.current = [];
    post2000ExhaustedRef.current = false;

    // Check authentication status when component mounts
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const fetchMovieDetails = async () => {
      try {
        const movieResponse = await axios.get(`${MOVIE_DETAILS_URL}${id}?api_key=${API_KEY}`);
        const movieData = movieResponse.data;
        setMovie(movieData);
        movieDetailsRef.current = movieData;
        
        // Fetch movie videos (trailers)
        const videosResponse = await axios.get(
          `${MOVIE_DETAILS_URL}${id}/videos?api_key=${API_KEY}`
        );
        
        // Filter for YouTube trailers
        const movieTrailers = videosResponse.data.results.filter(
          video => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser")
        );
        
        setTrailers(movieTrailers);
        if (movieTrailers.length > 0) {
          setSelectedTrailer(movieTrailers[0]);
        }

        // Fetch movie images (posters & scene stills for the carousel)
        let imagesList = [];
        if (movieData.poster_path) {
          imagesList.push({ file_path: movieData.poster_path, type: 'poster' });
        }
        try {
          const imagesResponse = await axios.get(
            `${MOVIE_DETAILS_URL}${id}/images?api_key=${API_KEY}&include_image_language=en,null`,
            { timeout: 5000 }
          );
          const seenPaths = new Set(imagesList.map(img => img.file_path));

          // Collect alternate posters
          const posters = imagesResponse.data?.posters || [];
          for (const p of posters) {
            if (p.file_path && !seenPaths.has(p.file_path)) {
              imagesList.push({ file_path: p.file_path, type: 'poster' });
              seenPaths.add(p.file_path);
              if (imagesList.length >= 6) break;
            }
          }

          // Collect movie stills and backdrops
          const backdrops = imagesResponse.data?.backdrops || [];
          for (const b of backdrops) {
            if (b.file_path && !seenPaths.has(b.file_path)) {
              imagesList.push({ file_path: b.file_path, type: 'backdrop' });
              seenPaths.add(b.file_path);
              if (imagesList.length >= 10) break;
            }
          }
        } catch (imgErr) {
          console.warn("Could not fetch movie gallery images:", imgErr?.message);
        }

        if (imagesList.length === 0 && movieData.poster_path) {
          imagesList = [{ file_path: movieData.poster_path, type: 'poster' }];
        }
        setMovieImages(imagesList);

        // Fetch movie keywords to detect specific narrative themes (e.g. Zombie vs Supernatural)
        let detectedTheme = null;
        try {
          const kwResponse = await axios.get(
            `${MOVIE_DETAILS_URL}${id}/keywords?api_key=${API_KEY}`,
            { timeout: 6000 }
          );
          detectedTheme = detectThemeFromKeywords(kwResponse.data?.keywords || [], false);
          setThemeInfo(detectedTheme);
          themeInfoRef.current = detectedTheme;
        } catch (kwErr) {
          console.warn("Could not fetch movie keywords:", kwErr?.message);
        }

        // If authenticated, fetch user's full movie library to exclude all watched, in-progress, and planned movies from Similar Movies
        if (token) {
          try {
            const libRes = await axios.get(`${Endpoint}/api/profile/movies`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 4000
            });
            const userMovies = libRes.data?.movies || [];
            const excluded = new Set();
            for (const m of userMovies) {
              if (m.watchStatus && ['watched', 'inProgress', 'planToWatch'].includes(m.watchStatus) && m.movieId) {
                excluded.add(Number(m.movieId));
              }
            }
            userExcludedMovieIdsRef.current = excluded;
          } catch {
            // non-critical
          }

          const userStatusResponse = await fetchUserMovieStatus();
          if (userStatusResponse) {
            setWatchStatus(userStatusResponse.watchStatus);
            setRating(userStatusResponse.rating || 0);
          }
        }

        // Fetch strictly similar, franchise, and thematic movies (excluding user's watched/planned/watching movies)
        await fetchSimilarMovies(1, true, movieData, detectedTheme);
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [id]);

  const calculateMovieQualityScore = (item) => {
    const active = movieDetailsRef.current || movie;
    const isHollywood = isHollywoodMedia(active);
    const currentLang = active?.original_language;
    return calculateQualityScore(item, themeInfo?.matchedThemeId, currentLang, isHollywood);
  };

  const fetchSimilarMovies = async (page = 1, reset = false, currentMovieData = null, currentThemeInfo = null) => {
    if (loadingSimilar && !reset) return;
    
    setLoadingSimilar(true);
    try {
      const activeMovie = currentMovieData || movieDetailsRef.current || movie;
      const activeTheme = currentThemeInfo || themeInfoRef.current || themeInfo;
      const movieIdNum = Number(id);
      const isHollywood = isHollywoodMedia(activeMovie);

      if (reset) {
        seenMovieIdsRef.current = new Set([movieIdNum, ...userExcludedMovieIdsRef.current]);
      }

      let combinedMovies = [];

      // 1. Franchise Priority:
      // If the movie belongs to a franchise/collection (e.g., James Bond Collection, The Dark Knight Collection),
      // fetch all collection movies, sort them with priority to newer, more popular and higher rated, and place them FIRST!
      if (page === 1 && activeMovie?.belongs_to_collection?.id) {
        try {
          const collectionRes = await axios.get(
            `https://api.themoviedb.org/3/collection/${activeMovie.belongs_to_collection.id}?api_key=${API_KEY}`,
            { timeout: 6000 }
          );
          if (collectionRes.data?.parts) {
            const franchiseParts = collectionRes.data.parts
              .filter(p => p.id !== movieIdNum && !userExcludedMovieIdsRef.current.has(p.id))
              .sort((a, b) => calculateMovieQualityScore(b) - calculateMovieQualityScore(a));

            for (const item of franchiseParts) {
              if (!seenMovieIdsRef.current.has(item.id)) {
                seenMovieIdsRef.current.add(item.id);
                combinedMovies.push(item);
              }
            }
          }
        } catch (collErr) {
          console.warn("Could not fetch collection parts:", collErr?.message);
        }
      }

      // 2. Thematic Discovery:
      // If specific narrative themes were identified (e.g. Zombie Apocalypse, Haunted House, Espionage),
      // query TMDB Discover with those exact thematic keyword IDs so movies of the same theme dominate.
      // If the current movie is a Hollywood film, enforce Hollywood / English releases.
      // Mandatory requirement: query post-2000 releases first.
      if (activeTheme?.themeKeywordIds?.length > 0) {
        try {
          const kwQuery = activeTheme.themeKeywordIds.slice(0, 3).join('|');
          const genreParam = activeMovie?.genres?.[0]?.id ? `&with_genres=${activeMovie.genres[0].id}` : '';
          const langParam = isHollywood
            ? '&with_original_language=en'
            : (activeMovie?.original_language ? `&with_original_language=${activeMovie.original_language}` : '');
          const dateParam = !post2000ExhaustedRef.current
            ? '&primary_release_date.gte=2000-01-01'
            : '&primary_release_date.lte=1999-12-31';

          const discoverRes = await axios.get(
            `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_keywords=${kwQuery}${genreParam}${langParam}${dateParam}&sort_by=popularity.desc&page=${page}`,
            { timeout: 6000 }
          );
          const discoverList = discoverRes.data?.results || [];
          const sortedDiscover = discoverList
            .filter(m => m.id !== movieIdNum && !userExcludedMovieIdsRef.current.has(m.id))
            .sort((a, b) => calculateMovieQualityScore(b) - calculateMovieQualityScore(a));

          for (const item of sortedDiscover) {
            if (!seenMovieIdsRef.current.has(item.id)) {
              seenMovieIdsRef.current.add(item.id);
              combinedMovies.push(item);
            }
          }
        } catch (discErr) {
          console.warn("Could not fetch thematic discover matches:", discErr?.message);
        }
      }

      // 3. High-Relevance Recommendations (collaborative filtering & user behavior matches)
      let recsList = [];
      let totalRecPages = 1;
      try {
        const recsRes = await axios.get(
          `${MOVIE_DETAILS_URL}${id}/recommendations?api_key=${API_KEY}&page=${page}`,
          { timeout: 6000 }
        );
        recsList = recsRes.data?.results || [];
        totalRecPages = recsRes.data?.total_pages || 1;
      } catch (recErr) {
        console.warn("Could not fetch recommendations:", recErr?.message);
      }

      // Prioritize newer, more popular, and higher rated recommended movies
      const sortedRecs = recsList
        .filter(r => r.id !== movieIdNum && !userExcludedMovieIdsRef.current.has(r.id))
        .sort((a, b) => calculateMovieQualityScore(b) - calculateMovieQualityScore(a));

      for (const item of sortedRecs) {
        if (!seenMovieIdsRef.current.has(item.id)) {
          seenMovieIdsRef.current.add(item.id);
          combinedMovies.push(item);
        }
      }

      // 4. Fallback: If recommendations and thematic discovery are empty or ran out of pages
      if (combinedMovies.length === 0 || page > totalRecPages) {
        try {
          const fallbackRes = await axios.get(
            `${MOVIE_DETAILS_URL}${id}/similar?api_key=${API_KEY}&page=${page}`,
            { timeout: 6000 }
          );
          const fallbackList = (fallbackRes.data?.results || [])
            .filter(f => f.id !== movieIdNum && !userExcludedMovieIdsRef.current.has(f.id))
            .sort((a, b) => calculateMovieQualityScore(b) - calculateMovieQualityScore(a));

          for (const item of fallbackList) {
            if (!seenMovieIdsRef.current.has(item.id)) {
              seenMovieIdsRef.current.add(item.id);
              combinedMovies.push(item);
            }
          }
        } catch (simErr) {
          console.warn("Could not fetch similar fallback:", simErr?.message);
        }
      }

      // MANDATORY YEAR REQUIREMENT:
      // Partition strictly into post-2000 (>= 2000) and pre-2000 (< 2000).
      // Post-2000 movies MUST appear first.
      // Pre-2000 movies appear ONLY after all similar movies after 2000 have been loaded already.
      const { post2000, pre2000 } = partitionAndSortByYear(
        combinedMovies,
        themeInfo?.matchedThemeId,
        activeMovie?.original_language,
        isHollywood
      );

      // Stash any discovered pre-2000 movies into the reservoir
      for (const pre of pre2000) {
        if (!pre2000ReservoirRef.current.some(item => item.id === pre.id)) {
          pre2000ReservoirRef.current.push(pre);
        }
      }
      pre2000ReservoirRef.current.sort((a, b) => calculateMovieQualityScore(b) - calculateMovieQualityScore(a));

      // Enforce Hollywood filter strictly if the current movie is Hollywood
      let targetPost2000 = post2000;
      if (isHollywood) {
        const hwOnly = post2000.filter(m => m.original_language === 'en');
        if (hwOnly.length >= 6) {
          targetPost2000 = hwOnly;
        }
      }

      let moviesToDisplay = [];
      if (!post2000ExhaustedRef.current) {
        if (targetPost2000.length > 0) {
          moviesToDisplay = targetPost2000;
        } else {
          // Post-2000 movies have now been completely exhausted!
          post2000ExhaustedRef.current = true;
          // Only now begin releasing pre-2000 movies from the reservoir
          moviesToDisplay = pre2000ReservoirRef.current.splice(0, 18);
        }
      } else {
        // Post-2000 already exhausted: release next batch of pre-2000 movies
        moviesToDisplay = pre2000ReservoirRef.current.splice(0, 18);
      }

      // Initial load fallback: if no post-2000 movies exist at all
      if (reset && moviesToDisplay.length === 0 && pre2000ReservoirRef.current.length > 0) {
        post2000ExhaustedRef.current = true;
        moviesToDisplay = pre2000ReservoirRef.current.splice(0, 18);
      }

      if (reset) {
        setSimilarMovies(moviesToDisplay);
      } else {
        setSimilarMovies(prev => [...prev, ...moviesToDisplay]);
      }
      
      const hasMore = (!post2000ExhaustedRef.current && page < 20) || pre2000ReservoirRef.current.length > 0;
      setHasMoreSimilar(hasMore);
      setSimilarPage(page);
    } catch (error) {
      console.error("Error fetching strictly similar movies:", error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100 && hasMoreSimilar && !loadingSimilar) {
        fetchSimilarMovies(similarPage + 1, false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMoreSimilar, loadingSimilar, similarPage, id]);

  const fetchUserMovieStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        return null;
      }
      //https://s72-raphael-watchwise.onrender.com/api/profile/movies/${id}
      //http://localhost:3000/api/profile/movies/${id}
      const response = await axios.get(`${Endpoint}/api/profile/movies/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } else if (error.response?.status === 404) {
        // Movie status not found is expected for new movies
        return null;
      }
      console.error("Error fetching user movie status:", error);
      return null;
    }
  };

  const updateMovieStatus = async (newStatus, newRating) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // setUpdateStatus('Updating...');
      
      // Ensure all required data is available
      if (!movie?.title) {
        setUpdateStatus('Error: Movie data not available');
        return;
      }

      const movieData = {
        watchStatus: newStatus,
        rating: newRating,
        movieId: id,
        movieTitle: movie.title,
        posterPath: movie.poster_path || ''
      };

      console.log('Sending update request:', movieData);

      //https://s72-raphael-watchwise.onrender.com/api/profile/movies/${id}
      //http://localhost:3000/api/profile/movies/${id}
      const response = await axios.put(`${Endpoint}/api/profile/movies/${id}`, movieData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Update response:', response.data);
      
      // Update local state with the response data
      if (response.data.movieStatus) {
        setWatchStatus(response.data.movieStatus.watchStatus);
        setRating(response.data.movieStatus.rating || 0);
      }

      // Track the watchStatus change for the recommendation engine
      trackInteraction(token, {
          mediaType: 'movie',
          mediaId: String(id),
          mediaTitle: movie.title,
          eventType: 'watchStatus',
          watchStatus: newStatus,
          rating: newRating || null,
          genreIds: (movie.genres || []).map((g) => g.id),
          metadata: { popularity: movie.popularity },
      });

      // If the user gave a high rating (>= 7), also fire a 'like' event
      if (newRating >= 7) {
          trackInteraction(token, {
              mediaType: 'movie',
              mediaId: String(id),
              mediaTitle: movie.title,
              eventType: 'like',
              rating: newRating,
              genreIds: (movie.genres || []).map((g) => g.id),
          });
      }

      // setUpdateStatus('Updated successfully!');
      setTimeout(() => setUpdateStatus(''), 2000);
    } catch (error) {
      console.error("Error updating movie status:", error);
      console.error("Request data:", {
        watchStatus: newStatus,
        rating: newRating,
        movieId: id,
        movieTitle: movie?.title,
        posterPath: movie?.poster_path
      });
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/login');
        return;
      }
      
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Unknown error';
      setTimeout(() => setUpdateStatus(''), 3000);
    }
  };

  const handleWatchStatusChange = (newStatus) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setWatchStatus(newStatus);
    const movieIdNum = Number(id);
    if (['watched', 'inProgress', 'planToWatch'].includes(newStatus)) {
      userExcludedMovieIdsRef.current.add(movieIdNum);
      seenMovieIdsRef.current.add(movieIdNum);
      setSimilarMovies(prev => prev.filter(m => m.id !== movieIdNum));
    } else {
      userExcludedMovieIdsRef.current.delete(movieIdNum);
    }
    updateMovieStatus(newStatus, rating);
  };

  const handleRatingChange = (newRating) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRating(newRating);
    setHoverRating(0);
    updateMovieStatus(watchStatus, newRating);
  };

  const getRatingColor = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.color : 'bg-gray-200';
  };

  const handleSimilarMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  if (loading) return <LoadingScreen message="Loading" />;
  if (!movie) return <p className="text-center mt-10 text-red-500">Movie not found!</p>;

  return (
      <div className="min-h-screen bg-[#151a24]">
        <div className="max-w-4xl mx-auto mt-20 p-6 bg-[#151a24]">
          <Navbar />

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-6 px-4 py-2 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="backdrop-blur-md bg-white/10 shadow-lg rounded-lg p-6 w-full">
  <div className="flex flex-col md:flex-row flex-wrap items-center md:items-start w-full">
    <div className="flex-shrink-0 mb-6 md:mb-0">
      <MovieCoverCarousel
        images={movieImages.length > 0 ? movieImages : (movie.poster_path ? [{ file_path: movie.poster_path, type: 'poster' }] : [])}
        title={movie.title}
      />
    </div>
    <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full md:w-auto">
      <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
      <p className="text-gray-300 mt-2">Release Date: {movie.release_date}</p>
      <p className="mt-4 text-gray-200">{movie.overview}</p>
      <p className="mt-4 font-semibold text-white">Rating: {movie.vote_average.toFixed(1)}/10</p>
      <p className="mt-2 text-gray-300">Genres: {movie.genres.map(g => g.name).join(", ")}</p>

      {!isAuthenticated ? (
        <div className="mt-6 p-4 backdrop-blur-md bg-blue-500/20 text-blue-200 rounded-lg border border-blue-400/30 w-full">
          <p>
            Please{" "}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-300 hover:text-blue-100 font-semibold"
            >
              log in
            </button>{" "}
            to track this movie and rate it.
          </p>
        </div>
      ) : (
        <>
          {/* Watch Status Buttons */}
          <div className="mt-6 w-full">
            <h3 className="text-lg font-semibold mb-2 text-white">Watch Status</h3>
            <div className="flex gap-2 w-full px-1 flex-wrap">
              {Object.entries(WATCH_STATUS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleWatchStatusChange(value)}
                  className={`
                    px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-1
                    ${watchStatus === value
                      ? `${WATCH_STATUS_STYLES[value]} text-white transform scale-105`
                      : 'backdrop-blur-md bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }
                  `}
                >
                  {WATCH_STATUS_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Star Rating - Only show for watched or in progress */}
          {(watchStatus === WATCH_STATUS.COMPLETED || watchStatus === WATCH_STATUS.IN_PROGRESS) && (
            <div className="mt-6 w-full">
              <div className="flex items-center justify-between mb-2 max-w-md">
                <h3 className="text-lg font-semibold text-white">Your Rating</h3>
                {rating > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRatingChange(0)}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors duration-150 underline decoration-dotted"
                  >
                    Clear rating
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 max-w-md">
                {[1, 2, 3, 4, 5].map((star) => {
                  const starValue = star * 2;
                  const isFilled = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRatingChange(rating === starValue ? 0 : starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-transform duration-150 transform hover:scale-110 focus:outline-none"
                      title={`${star}/5 Stars`}
                    >
                      <svg
                        className={`w-7 h-7 transition-colors duration-150 ${
                          isFilled ? 'text-amber-400 fill-amber-400' : 'text-gray-600 fill-transparent'
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    (hoverRating || rating) > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {(hoverRating || rating) > 0 ? `${(hoverRating || rating) / 2} / 5` : 'Not Rated'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Update Status Message */}
          {updateStatus && (
            <div className={`
              mt-4 p-2 rounded backdrop-blur-md w-full
              ${updateStatus.includes('failed') 
                ? 'bg-red-500/20 text-red-200 border border-red-400/30' 
                : 'bg-green-500/20 text-green-200 border border-green-400/30'}
            `}>
              {updateStatus}
            </div>
          )}
        </>
      )}
    </div>
  </div>

            {/* Embedded Trailer Section */}
            {selectedTrailer && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4 text-white">Trailer</h2>
                <div className="relative w-full overflow-hidden rounded-lg shadow-md" style={{ paddingTop: '56.25%' }}>
                  <iframe 
                    src={`https://www.youtube.com/embed/${selectedTrailer.key}`}
                    title={selectedTrailer.name}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Similar Movies Section - Outside main container, full width */}
        {similarMovies.length > 0 && (
          <div className="w-full py-12">
            <div className="max-w-7xl mx-auto px-6">
              <div className="mb-8 backdrop-blur-md bg-white/10 px-8 py-4 rounded-2xl shadow-xl w-fit max-w-xl mx-auto border border-white/20 text-center">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                  You'll Also Like
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {similarMovies.map(movie => (
                  <div key={movie.id} onClick={() => handleSimilarMovieClick(movie.id)}>
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
              
              {/* Loading indicator */}
              {loadingSimilar && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-300">Loading more movies...</span>
                </div>
              )}
              
              {/* End of results indicator */}
              {!hasMoreSimilar && similarMovies.length > 0 && (
                <div className="text-center py-8 text-gray-400">
                  No more similar movies to load
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    
  );
};

export default MovieDetails;