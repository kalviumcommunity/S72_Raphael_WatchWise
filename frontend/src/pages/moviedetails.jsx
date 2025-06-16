//eslint-disable-next-line
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";

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

  useEffect(() => {
    // Reset states immediately when movie ID changes
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailers([]);
    setSelectedTrailer(null);
    setSimilarMovies([]);

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
        
        // Fetch similar movies
        const similarMoviesResponse = await axios.get(
          `${MOVIE_DETAILS_URL}${id}/similar?api_key=${API_KEY}`
        );
        setSimilarMovies(similarMoviesResponse.data.results.slice(0, 12));
        
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
      setUpdateStatus(`Update failed: ${errorMessage}`);
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

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;
  if (!movie) return <p className="text-center mt-10 text-red-500">Movie not found!</p>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-gray-50 shadow-lg rounded-lg">
      <Navbar />

      <div className="flex flex-col md:flex-row items-center md:items-start">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          className="w-80 rounded-lg shadow-md"
        />
        <div className="md:ml-6 mt-4 md:mt-0 flex-1">
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="text-gray-500 mt-2">📅 {movie.release_date}</p>
          <p className="mt-4">{movie.overview}</p>
          <p className="mt-4 font-semibold">⭐ Rating: {movie.vote_average.toFixed(1)}/10</p>
          <p className="mt-2 text-gray-700">🎭 Genres: {movie.genres.map(g => g.name).join(", ")}</p>

          {!isAuthenticated ? (
            <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg">
              <p>Please <button 
                onClick={() => navigate('/login')}
                className="text-blue-500 hover:text-blue-700 font-semibold"
              >
                log in
              </button> to track this movie and rate it.</p>
            </div>
          ) : (
            <>
              {/* Watch Status Buttons */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Watch Status</h3>
                <div className="flex gap-2 w-full px-1">
                  {Object.entries(WATCH_STATUS).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleWatchStatusChange(value)}
                      className={`
                        px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap flex-1
                        ${watchStatus === value
                          ? `${WATCH_STATUS_STYLES[value]} text-white transform scale-105`
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Your Rating</h3>
                  <div className="flex w-full max-w-md">
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
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }
                          ${index > 0 ? '-ml-px' : ''} // Create joined effect
                        `}
                      >
                        <span className="text-2xl">{config.emoji}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
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
                <div className={`mt-4 p-2 rounded ${
                  updateStatus.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
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
          <h2 className="text-2xl font-bold mb-4">Trailer</h2>
          <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
            <iframe 
              src={`https://www.youtube.com/embed/${selectedTrailer.key}`}
              title={selectedTrailer.name}
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {/* Similar Movies Section with Horizontal Scroll */}
      {similarMovies.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Similar Movies</h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-4 min-w-max">
              {similarMovies.map(movie => (
                <div 
                  key={movie.id}
                  className="cursor-pointer flex-none w-32 md:w-40 transition hover:scale-105 bg-gray-200 rounded-xl"
                  onClick={() => handleSimilarMovieClick(movie.id)}
                >
                  <img
                    src={movie.poster_path 
                      ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                      : 'https://via.placeholder.com/200x300?text=No+Poster'
                    }
                    alt={movie.title}
                    className="rounded-lg shadow-md w-full h-48 md:h-60 object-cover"
                  />
                  <h3 className="mt-2 text-sm font-medium truncate">{movie.title}</h3>
                  <p className="text-xs text-gray-500">{movie.release_date?.substring(0, 4)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MovieDetails;