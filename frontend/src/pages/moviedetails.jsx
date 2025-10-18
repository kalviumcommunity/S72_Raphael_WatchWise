//eslint-disable-next-line
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import MovieCard from "../components/Moviecard";

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const MOVIE_DETAILS_URL = "https://api.themoviedb.org/3/movie/";

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
  { value: 2, emoji: '😫', color: 'bg-red-500' },
  { value: 4, emoji: '😕', color: 'bg-orange-500' },
  { value: 6, emoji: '😐', color: 'bg-yellow-500' },
  { value: 8, emoji: '😊', color: 'bg-lime-500' },
  { value: 10, emoji: '😍', color: 'bg-green-500' }
];

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchStatus, setWatchStatus] = useState(WATCH_STATUS.NOT_PLANNING);
  const [rating, setRating] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trailers, setTrailers] = useState([]);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarPage, setSimilarPage] = useState(1);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);

  useEffect(() => {
    // Reset states immediately when movie ID changes
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailers([]);
    setSelectedTrailer(null);
    setSimilarMovies([]);
    setSimilarPage(1);
    setHasMoreSimilar(true);
    setLoadingSimilar(false);

    // Check authentication status when component mounts
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const fetchMovieDetails = async () => {
      try {
        const movieResponse = await axios.get(`${MOVIE_DETAILS_URL}${id}?api_key=${API_KEY}`);
        setMovie(movieResponse.data);
        
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
        
        // Fetch initial similar movies
        await fetchSimilarMovies(1, true);
        
        // Only fetch user status if authenticated
        if (token) {
          const userStatusResponse = await fetchUserMovieStatus();
          if (userStatusResponse) {
            setWatchStatus(userStatusResponse.watchStatus);
            setRating(userStatusResponse.rating || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [id]);

  const fetchSimilarMovies = async (page = 1, reset = false) => {
    if (loadingSimilar) return;
    
    setLoadingSimilar(true);
    try {
      const response = await axios.get(
        `${MOVIE_DETAILS_URL}${id}/similar?api_key=${API_KEY}&page=${page}`
      );
      
      const newMovies = response.data.results;
      
      if (reset) {
        setSimilarMovies(newMovies);
      } else {
        setSimilarMovies(prev => [...prev, ...newMovies]);
      }
      
      setHasMoreSimilar(page < response.data.total_pages && newMovies.length > 0);
      setSimilarPage(page);
    } catch (error) {
      console.error("Error fetching similar movies:", error);
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

      const response = await axios.get(`https://s72-raphael-watchwise.onrender.com/api/profile/movies/${id}`, {
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
      
      const response = await axios.put(`https://s72-raphael-watchwise.onrender.com/api/profile/movies/${id}`, movieData, {
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
    updateMovieStatus(newStatus, rating);
  };

  const handleRatingChange = (newRating) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRating(newRating);
    updateMovieStatus(watchStatus, newRating);
  };

  const getRatingEmoji = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.emoji : '🤔';
  };

  const getRatingColor = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.color : 'bg-gray-200';
  };

  const handleSimilarMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  if (loading) return <p className="text-center mt-10 text-white">Loading...</p>;
  if (!movie) return <p className="text-center mt-10 text-red-500">Movie not found!</p>;

  return (
      <div className="min-h-screen bg-[#151a24]">
        <div className="max-w-4xl mx-auto mt-20 p-6 bg-[#151a24]">
          <Navbar />

          <div className="backdrop-blur-md bg-white/10 shadow-lg rounded-lg p-6 w-full">
  <div className="flex flex-col md:flex-row flex-wrap items-center md:items-start w-full">
    <img
      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
      alt={movie.title}
      className="w-80 max-w-full rounded-lg shadow-md"
    />
    <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full md:w-auto">
      <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
      <p className="text-gray-300 mt-2">📅 {movie.release_date}</p>
      <p className="mt-4 text-gray-200">{movie.overview}</p>
      <p className="mt-4 font-semibold text-white">⭐ Rating: {movie.vote_average.toFixed(1)}/10</p>
      <p className="mt-2 text-gray-300">🎭 Genres: {movie.genres.map(g => g.name).join(", ")}</p>

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

          {/* Rating Buttons - Only show for watched or in progress */}
          {(watchStatus === WATCH_STATUS.COMPLETED || watchStatus === WATCH_STATUS.IN_PROGRESS) && (
            <div className="mt-6 w-full">
              <h3 className="text-lg font-semibold mb-2 text-white">Your Rating</h3>
              <div className="flex w-full max-w-md flex-wrap">
                {RATING_CONFIG.map((config, index) => (
                  <button
                    key={config.value}
                    onClick={() => handleRatingChange(config.value)}
                    className={`
                      flex-1 h-12 flex items-center justify-center
                      transition-all duration-300 relative
                      ${index === 0 ? 'rounded-l-lg' : ''}
                      ${index === RATING_CONFIG.length - 1 ? 'rounded-r-lg' : ''}
                      ${rating === config.value 
                        ? `${config.color} text-white transform scale-y-105 z-10 shadow-md` 
                        : 'backdrop-blur-md bg-white/10 text-white hover:bg-white/20 border border-white/20'
                      }
                      ${index > 0 ? '-ml-px' : ''}
                    `}
                  >
                    <span className="text-2xl">{config.emoji}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-300 flex items-center gap-2">
                {rating > 0 ? (
                  <>
                    <span>Your rating: {getRatingEmoji(rating)}</span>
                    <span className={`
                      px-2 py-1 rounded text-white text-xs
                      ${getRatingColor(rating)}
                    `}>
                      {rating/2}/5
                    </span>
                  </>
                ) : "Not rated yet"}
              </p>
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
              <div className="mb-8 backdrop-blur-md bg-white/10 p-4 rounded-lg shadow-md w-[300px] mx-auto border border-white/20">
                <h2 className="text-3xl font-bold text-center text-white">Similar Movies</h2>
              </div>
              <div className="grid grid-cols-4 gap-6">
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