import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import MovieCard from "../components/Moviecard";

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const TV_DETAILS_URL = "https://api.themoviedb.org/3/tv/";

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

const TvShowDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchStatus, setWatchStatus] = useState(WATCH_STATUS.NOT_PLANNING);
  const [rating, setRating] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trailers, setTrailers] = useState([]);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [similarShows, setSimilarShows] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarPage, setSimilarPage] = useState(1);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);

  useEffect(() => {
    // Reset states immediately when show ID changes
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailers([]);
    setSelectedTrailer(null);
    setSimilarShows([]);
    setSimilarPage(1);
    setHasMoreSimilar(true);
    setLoadingSimilar(false);

    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const fetchTvShowDetails = async () => {
      try {
        const showResponse = await axios.get(`${TV_DETAILS_URL}${id}?api_key=${API_KEY}`);
        setShow(showResponse.data);
        
        // Fetch TV show videos (trailers)
        const videosResponse = await axios.get(
          `${TV_DETAILS_URL}${id}/videos?api_key=${API_KEY}`
        );
        
        // Filter for YouTube trailers
        const showTrailers = videosResponse.data.results.filter(
          video => video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser")
        );
        
        setTrailers(showTrailers);
        if (showTrailers.length > 0) {
          setSelectedTrailer(showTrailers[0]);
        }
        
        // Fetch initial similar TV shows
        await fetchSimilarShows(1, true);
        
        if (token) {
          const userStatusResponse = await fetchUserTvShowStatus();
          if (userStatusResponse) {
            setWatchStatus(userStatusResponse.watchStatus);
            setRating(userStatusResponse.rating || 0);
          }
        }
      } catch (error) {
        console.error("Error fetching TV show details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTvShowDetails();
  }, [id]);

  const fetchSimilarShows = async (page = 1, reset = false) => {
    if (loadingSimilar) return;
    
    setLoadingSimilar(true);
    try {
      const response = await axios.get(
        `${TV_DETAILS_URL}${id}/similar?api_key=${API_KEY}&page=${page}`
      );
      
      const newShows = response.data.results;
      
      if (reset) {
        setSimilarShows(newShows);
      } else {
        setSimilarShows(prev => [...prev, ...newShows]);
      }
      
      setHasMoreSimilar(page < response.data.total_pages && newShows.length > 0);
      setSimilarPage(page);
    } catch (error) {
      console.error("Error fetching similar TV shows:", error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100 && hasMoreSimilar && !loadingSimilar) {
        fetchSimilarShows(similarPage + 1, false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMoreSimilar, loadingSimilar, similarPage, id]);

  const fetchUserTvShowStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        return null;
      }

      const response = await axios.get(`https://s72-raphael-watchwise.onrender.com/api/profile/tvshows/${id}`, {
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
        return null;
      }
      console.error("Error fetching user TV show status:", error);
      return null;
    }
  };

  const updateTvShowStatus = async (newStatus, newRating) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (!show?.name) {
        setUpdateStatus('Error: TV show data not available');
        return;
      }

      const showData = {
        watchStatus: newStatus,
        rating: newRating,
        showId: id,
        showTitle: show.name,
        posterPath: show.poster_path || ''
      };

      const response = await axios.put(`https://s72-raphael-watchwise.onrender.com/api/profile/tvshows/${id}`, showData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.showStatus) {
        setWatchStatus(response.data.showStatus.watchStatus);
        setRating(response.data.showStatus.rating || 0);
      }

      setTimeout(() => setUpdateStatus(''), 2000);
    } catch (error) {
      console.error("Error updating TV show status:", error);
      
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
    updateTvShowStatus(newStatus, rating);
  };

  const handleRatingChange = (newRating) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRating(newRating);
    updateTvShowStatus(watchStatus, newRating);
  };

  const getRatingEmoji = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.emoji : '🤔';
  };

  const getRatingColor = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.color : 'bg-gray-200';
  };
  
  const handleSimilarShowClick = (showId) => {
    navigate(`/tv/${showId}`);
  };

  if (loading) return <p className="text-center mt-10 text-white">Loading...</p>;
  if (!show) return <p className="text-center mt-10 text-red-500">TV show not found!</p>;

  return (
    <div className="bg-[#151a24] min-h-screen w-full">
      <div className="max-w-4xl mx-auto mt-20 p-6">
        <Navbar />

        <div className="backdrop-blur-md bg-white/10 shadow-lg rounded-lg p-6 w-full">
          <div className="flex flex-col md:flex-row flex-wrap items-center md:items-start w-full">
            <img
              src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
              alt={show.name}
              className="w-80 max-w-full rounded-lg shadow-md"
            />
            <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full md:w-auto">
              <h1 className="text-3xl font-bold text-white">{show.name}</h1>
              <p className="text-gray-300 mt-2">📅 {show.first_air_date}</p>
              <p className="mt-4 text-gray-200">{show.overview}</p>
              <p className="mt-4 font-semibold text-white">⭐ Rating: {show.vote_average.toFixed(1)}/10</p>
              <p className="mt-2 text-gray-300">🎭 Genres: {show.genres.map(g => g.name).join(", ")}</p>
              <p className="mt-2 text-gray-300">📺 Seasons: {show.number_of_seasons}</p>
              <p className="mt-2 text-gray-300">🎬 Episodes: {show.number_of_episodes}</p>

              {!isAuthenticated ? (
                <div className="mt-6 p-4 backdrop-blur-md bg-blue-500/20 text-blue-200 rounded-lg border border-blue-400/30 w-full">
                  <p>
                    Please{" "}
                    <button
                      onClick={() => navigate('/login')}
                      className="text-blue-500 hover:text-blue-100 font-semibold"
                    >
                      log in
                    </button>{" "}
                    to track this TV show and rate it.
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

      {/* Similar Shows Section - Outside main container, full width */}
      {similarShows.length > 0 && (
        <div className="w-full py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-8 backdrop-blur-md bg-white/10 p-4 rounded-lg shadow-md w-[300px] mx-auto border border-white/20">
              <h2 className="text-3xl font-bold text-center text-white">Similar Shows</h2>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {similarShows.map(show => (
                <div key={show.id} onClick={() => handleSimilarShowClick(show.id)}>
                  <MovieCard movie={show} />
                </div>
              ))}
            </div>
            
            {/* Loading indicator */}
            {loadingSimilar && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-300">Loading more shows...</span>
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasMoreSimilar && similarShows.length > 0 && (
              <div className="text-center py-8 text-gray-400">
                No more similar shows to load
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TvShowDetails;