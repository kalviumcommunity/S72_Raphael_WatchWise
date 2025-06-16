import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";

const ANIME_DETAILS_URL = "https://api.jikan.moe/v4/anime/";

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

const AnimeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchStatus, setWatchStatus] = useState(WATCH_STATUS.NOT_PLANNING);
  const [rating, setRating] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [similarAnime, setSimilarAnime] = useState([]);
  const [trailerLoading, setTrailerLoading] = useState(true);

  useEffect(() => {
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailerLoading(true);
    setSimilarAnime([]);

    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const fetchAnimeDetails = async () => {
      try {
        const animeResponse = await axios.get(`${ANIME_DETAILS_URL}${id}/full`);
        setAnime(animeResponse.data.data);
        
        if (token) {
          const userStatusResponse = await fetchUserAnimeStatus();
          if (userStatusResponse) {
            setWatchStatus(userStatusResponse.watchStatus);
            setRating(userStatusResponse.rating || 0);
          }
        }
        
        // Fetch similar anime (recommendations)
        fetchSimilarAnime(id);
        
        setTrailerLoading(false);
      } catch (error) {
        console.error("Error fetching anime details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnimeDetails();
  }, [id]);

  const fetchSimilarAnime = async (animeId) => {
    try {
      const response = await axios.get(`${ANIME_DETAILS_URL}${animeId}/recommendations`);
      // Limit to 6 recommendations
      setSimilarAnime(response.data.data.slice(0, 6));
    } catch (error) {
      console.error("Error fetching similar anime:", error);
    }
  };

  const fetchUserAnimeStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        return null;
      }

      const response = await axios.get(`https://s72-raphael-watchwise.onrender.com/api/profile/anime/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // If the response is null, it means this is a new anime for the user
      if (response.data === null) {
        return {
          watchStatus: WATCH_STATUS.NOT_PLANNING,
          rating: 0
        };
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
      console.error("Error fetching user anime status:", error);
      return {
        watchStatus: WATCH_STATUS.NOT_PLANNING,
        rating: 0
      };
    }
  };

  const updateAnimeStatus = async (newStatus, newRating) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (!anime?.title) {
        setUpdateStatus('Error: Anime data not available');
        return;
      }

      const animeData = {
        watchStatus: newStatus,
        rating: newRating,
        animeId: id,
        animeTitle: anime.title,
        posterPath: anime.images.jpg.large_image_url || ''
      };

      const response = await axios.put(`https://s72-raphael-watchwise.onrender.com/api/profile/anime/${id}`, animeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.animeStatus) {
        setWatchStatus(response.data.animeStatus.watchStatus);
        setRating(response.data.animeStatus.rating || 0);
      }

      setTimeout(() => setUpdateStatus(''), 2000);
    } catch (error) {
      console.error("Error updating anime status:", error);
      
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
    updateAnimeStatus(newStatus, rating);
  };

  const handleRatingChange = (newRating) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRating(newRating);
    updateAnimeStatus(watchStatus, newRating);
  };

  const getRatingEmoji = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.emoji : '🤔';
  };

  const getRatingColor = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.color : 'bg-gray-200';
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;
  if (!anime) return <p className="text-center mt-10 text-red-500">Anime not found!</p>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-grey-100 shadow-lg rounded-lg mb-10">
      <Navbar />

      <div className="flex flex-col md:flex-row items-center md:items-start">
        <img
          src={anime.images.jpg.large_image_url}
          alt={anime.title}
          className="w-80 rounded-lg shadow-md"
        />
        <div className="md:ml-6 mt-4 md:mt-0 flex-1">
          <h1 className="text-3xl font-bold">{anime.title}</h1>
          <p className="text-gray-500 mt-2">📅 {new Date(anime.aired.from).getFullYear()}</p>
          <p className="mt-4">{anime.synopsis}</p>
          <p className="mt-4 font-semibold">⭐ Rating: {anime.score?.toFixed(1) || 'N/A'}/10</p>
          <p className="mt-2 text-gray-700">🎭 Genres: {anime.genres.map(g => g.name).join(", ")}</p>
          <p className="mt-2 text-gray-700">📺 Episodes: {anime.episodes || 'Unknown'}</p>
          <p className="mt-2 text-gray-700">⏱️ Duration: {anime.duration}</p>
          <p className="mt-2 text-gray-700">🎬 Status: {anime.status}</p>

          {!isAuthenticated ? (
            <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg">
              <p>Please <button 
                onClick={() => navigate('/login')}
                className="text-blue-500 hover:text-blue-700 font-semibold"
              >
                log in
              </button> to track this anime and rate it.</p>
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

      {/* Trailer Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Trailer</h2>
        {trailerLoading ? (
          <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Loading trailer...</p>
          </div>
        ) : anime.trailer?.embed_url ? (
          <div className="relative pb-9 h-0" style={{ paddingBottom: '56.25%' }}> {/* 16:9 Aspect Ratio */}
            <iframe
              src={anime.trailer.embed_url}
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
              allowFullScreen
              title={`${anime.title} trailer`}
            ></iframe>
          </div>
        ) : (
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No trailer available</p>
          </div>
        )}
      </div>

      {/* Similar Anime Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Similar Anime</h2>
        {similarAnime.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {similarAnime.map((recommendation) => (
              <Link 
                to={`/anime/${recommendation.entry.mal_id}`} 
                key={recommendation.entry.mal_id}
                className="block transition-transform hover:scale-105"
              >
                <div className="rounded-lg overflow-hidden shadow-md bg-gray-200">
                  <img
                    src={recommendation.entry.images.jpg.image_url}
                    alt={recommendation.entry.title}
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/120x180?text=No+Image';
                    }}
                  />
                  <div className="p-2">
                    <p className="text-sm font-medium line-clamp-2" title={recommendation.entry.title}>
                      {recommendation.entry.title}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No similar anime found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimeDetails;