import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import LoadingScreen from "../components/LoadingScreen";

const ANIME_DETAILS_URL = "https://api.jikan.moe/v4/anime/";
  const Endpoint = "https://s72-raphael-watchwise.onrender.com";
  //http://localhost:3000

/**
 * Fire-and-forget interaction tracker.
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

const AnimeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchStatus, setWatchStatus] = useState(WATCH_STATUS.NOT_PLANNING);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [similarAnime, setSimilarAnime] = useState([]);
  const [trailerLoading, setTrailerLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(4);
  const userExcludedAnimeIdsRef = useRef(new Set());

  useEffect(() => {
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setHoverRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailerLoading(true);
    setSimilarAnime([]);
    setDisplayedCount(4);
    userExcludedAnimeIdsRef.current = new Set();

    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const fetchAnimeDetails = async () => {
      try {
        const animeResponse = await axios.get(`${ANIME_DETAILS_URL}${id}/full`);
        setAnime(animeResponse.data.data);
        
        // Fetch user's anime library to exclude all watched/inProgress/planToWatch anime from Similar Anime
        if (token) {
          try {
            const libRes = await axios.get(`${Endpoint}/api/profile/anime`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 4000
            });
            const userAnime = libRes.data?.anime || [];
            const excluded = new Set();
            for (const a of userAnime) {
              if (a.watchStatus && ['watched', 'inProgress', 'planToWatch'].includes(a.watchStatus) && a.animeId) {
                excluded.add(String(a.animeId));
              }
            }
            userExcludedAnimeIdsRef.current = excluded;
          } catch {
            // non-critical
          }

          const userStatusResponse = await fetchUserAnimeStatus();
          if (userStatusResponse) {
            setWatchStatus(userStatusResponse.watchStatus);
            setRating(userStatusResponse.rating || 0);
          }
        }
        
        // Fetch similar anime (excluding user's watched/planned/watching anime)
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
      const response = await axios.get(`${ANIME_DETAILS_URL}${animeId}/recommendations`, { timeout: 3500 });
      const rawRecs = response.data?.data || [];
      const filtered = rawRecs.filter(r => {
        const malId = String(r?.entry?.mal_id);
        return malId !== String(animeId) && !userExcludedAnimeIdsRef.current.has(malId);
      });
      setSimilarAnime(filtered);
    } catch (error) {
      console.error("Error fetching similar anime:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100 && displayedCount < similarAnime.length && !loadingSimilar) {
        setLoadingSimilar(true);
        setTimeout(() => {
          setDisplayedCount(prev => Math.min(prev + 4, similarAnime.length));
          setLoadingSimilar(false);
        }, 300);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayedCount, similarAnime.length, loadingSimilar]);

  const fetchUserAnimeStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        return null;
      }
      //https://s72-raphael-watchwise.onrender.com/api/profile/anime/${id}
      //http://localhost:3000/api/profile/anime/${id}
      const response = await axios.get(`${Endpoint}/api/profile/anime/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

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
      //https://s72-raphael-watchwise.onrender.com/api/profile/anime/${id}
      //http://localhost:3000/api/profile/anime/${id}
      const response = await axios.put(`${Endpoint}/api/profile/anime/${id}`, animeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.animeStatus) {
        setWatchStatus(response.data.animeStatus.watchStatus);
        setRating(response.data.animeStatus.rating || 0);
      }

      // Track the watchStatus change for the recommendation engine
      trackInteraction(token, {
          mediaType: 'anime',
          mediaId: String(id),
          mediaTitle: anime.title,
          eventType: 'watchStatus',
          watchStatus: newStatus,
          rating: newRating || null,
          genreIds: (anime.genres || []).map((g) => g.mal_id),
          metadata: { score: anime.score },
      });

      if (newRating >= 7) {
          trackInteraction(token, {
              mediaType: 'anime',
              mediaId: String(id),
              mediaTitle: anime.title,
              eventType: 'like',
              rating: newRating,
              genreIds: (anime.genres || []).map((g) => g.mal_id),
          });
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
    const animeIdStr = String(id);
    if (['watched', 'inProgress', 'planToWatch'].includes(newStatus)) {
      userExcludedAnimeIdsRef.current.add(animeIdStr);
      setSimilarAnime(prev => prev.filter(a => String(a?.entry?.mal_id) !== animeIdStr));
    } else {
      userExcludedAnimeIdsRef.current.delete(animeIdStr);
    }
    updateAnimeStatus(newStatus, rating);
  };

  const handleRatingChange = (newRating) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRating(newRating);
    setHoverRating(0);
    updateAnimeStatus(watchStatus, newRating);
  };

  const getRatingColor = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.color : 'bg-gray-200';
  };

  if (loading) return <LoadingScreen message="Loading" />;
  if (!anime) return <p className="text-center mt-10 text-red-500">Anime not found!</p>;

  return (
    <div className="bg-[#151a24] min-h-screen w-full">
      <div className="max-w-4xl mx-auto mt-20 p-6">
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
            <img
              src={anime.images.jpg.large_image_url}
              alt={anime.title}
              className="w-80 max-w-full rounded-lg shadow-md"
            />
            <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full md:w-auto">
              <h1 className="text-3xl font-bold text-white">{anime.title}</h1>
              <p className="text-gray-300 mt-2">Aired: {new Date(anime.aired.from).getFullYear()}</p>
              <p className="mt-4 text-gray-200">{anime.synopsis}</p>
              <p className="mt-4 font-semibold text-white">Rating: {anime.score?.toFixed(1) || 'N/A'}/10</p>
              <p className="mt-2 text-gray-300">Genres: {anime.genres.map(g => g.name).join(", ")}</p>
              <p className="mt-2 text-gray-300">Episodes: {anime.episodes || 'Unknown'}</p>
              <p className="mt-2 text-gray-300">Duration: {anime.duration}</p>
              <p className="mt-2 text-gray-300">Status: {anime.status}</p>

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
                    to track this anime and rate it.
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

          {/* Trailer Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Trailer</h2>
            {trailerLoading ? (
              <div className="h-64 backdrop-blur-md bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                <p className="text-gray-300">Loading trailer...</p>
              </div>
            ) : anime.trailer?.embed_url ? (
              <div className="relative w-full overflow-hidden rounded-lg shadow-md" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={anime.trailer.embed_url}
                  className="absolute top-0 left-0 w-full h-full"
                  allowFullScreen
                  title={`${anime.title} trailer`}
                ></iframe>
              </div>
            ) : (
              <div className="h-64 backdrop-blur-md bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                <p className="text-gray-300">No trailer available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar Anime Section - Outside main container, full width */}
      {similarAnime.length > 0 && (
        <div className="w-full py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-8 backdrop-blur-md bg-white/10 px-8 py-4 rounded-2xl shadow-xl w-fit max-w-xl mx-auto border border-white/20 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                You'll Also Like
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {similarAnime.slice(0, displayedCount).map((recommendation) => (
                <Link 
                  to={`/anime/${recommendation.entry.mal_id}`} 
                  key={recommendation.entry.mal_id}
                  className="block transition-transform hover:scale-105"
                >
                  <div className="rounded-lg overflow-hidden shadow-md backdrop-blur-md bg-white/10 border border-white/20 h-full flex flex-col">
                    <img
                      src={recommendation.entry.images.jpg.large_image_url}
                      alt={recommendation.entry.title}
                      className="w-full h-80 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/200x300?text=No+Image';
                      }}
                    />
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="text-base font-medium line-clamp-3 text-white" title={recommendation.entry.title}>
                        {recommendation.entry.title}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {/* Loading indicator */}
            {loadingSimilar && (
              <div className="flex justify-center items-center py-8 mt-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-300">Loading more anime...</span>
              </div>
            )}
            
            {/* End of results indicator */}
            {!loadingSimilar && displayedCount >= similarAnime.length && similarAnime.length > 0 && (
              <div className="text-center py-8 text-gray-400">
                No more anime to load
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimeDetails;