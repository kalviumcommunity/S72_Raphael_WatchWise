import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/navbar";
import TvShowCard from "../components/Tvshowcard";
import LoadingScreen from "../components/LoadingScreen";
import { detectThemeFromKeywords, calculateQualityScore, isHollywoodMedia, partitionAndSortByYear, getMediaYear } from "../utils/themeEngine";

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const TV_DETAILS_URL = "https://api.themoviedb.org/3/tv/";
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

const TvShowDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchStatus, setWatchStatus] = useState(WATCH_STATUS.NOT_PLANNING);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trailers, setTrailers] = useState([]);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [similarShows, setSimilarShows] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarPage, setSimilarPage] = useState(1);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [themeInfo, setThemeInfo] = useState(null);
  const seenShowIdsRef = useRef(new Set());
  const userExcludedShowIdsRef = useRef(new Set());
  const showDetailsRef = useRef(null);
  const themeInfoRef = useRef(null);
  const pre2000ReservoirRef = useRef([]);
  const post2000ExhaustedRef = useRef(false);

  useEffect(() => {
    // Scroll to top when show changes
    window.scrollTo(0, 0);

    // Reset states immediately when show ID changes
    setWatchStatus(WATCH_STATUS.NOT_PLANNING);
    setRating(0);
    setHoverRating(0);
    setLoading(true);
    setUpdateStatus('');
    setTrailers([]);
    setSelectedTrailer(null);
    setSimilarShows([]);
    setSimilarPage(1);
    setHasMoreSimilar(true);
    setLoadingSimilar(false);
    setThemeInfo(null);
    themeInfoRef.current = null;
    userExcludedShowIdsRef.current = new Set();
    seenShowIdsRef.current = new Set([Number(id)]);
    pre2000ReservoirRef.current = [];
    post2000ExhaustedRef.current = false;

    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    const fetchTvShowDetails = async () => {
      try {
        const showResponse = await axios.get(`${TV_DETAILS_URL}${id}?api_key=${API_KEY}`);
        const showData = showResponse.data;
        setShow(showData);
        showDetailsRef.current = showData;
        
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

        // Fetch TV keywords for thematic analysis (e.g. Zombie vs Supernatural vs Space)
        let detectedTheme = null;
        try {
          const kwResponse = await axios.get(
            `${TV_DETAILS_URL}${id}/keywords?api_key=${API_KEY}`,
            { timeout: 6000 }
          );
          // Note: TMDB TV keywords endpoint returns { id, results: [...] }
          detectedTheme = detectThemeFromKeywords(kwResponse.data?.results || [], true);
          setThemeInfo(detectedTheme);
          themeInfoRef.current = detectedTheme;
        } catch (kwErr) {
          console.warn("Could not fetch TV show keywords:", kwErr?.message);
        }
        
        // Fetch user's TV library to exclude watched/inProgress/planToWatch shows from Similar Shows
        if (token) {
          try {
            const libRes = await axios.get(`${Endpoint}/api/profile/tvshows`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 4000
            });
            const userShows = libRes.data?.tvShows || [];
            const excluded = new Set();
            for (const s of userShows) {
              if (s.watchStatus && ['watched', 'inProgress', 'planToWatch'].includes(s.watchStatus) && s.showId) {
                excluded.add(Number(s.showId));
              }
            }
            userExcludedShowIdsRef.current = excluded;
          } catch {
            // non-critical
          }

          const userStatusResponse = await fetchUserTvShowStatus();
          if (userStatusResponse) {
            setWatchStatus(userStatusResponse.watchStatus);
            setRating(userStatusResponse.rating || 0);
          }
        }

        // Fetch initial strictly similar and thematic TV shows (excluding user's watched/planned/watching shows)
        await fetchSimilarShows(1, true, showData, detectedTheme);
      } catch (error) {
        console.error("Error fetching TV show details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTvShowDetails();
  }, [id]);

  const calculateShowQualityScore = (item) => {
    const active = showDetailsRef.current || show;
    const isHollywood = isHollywoodMedia(active);
    const currentLang = active?.original_language;
    return calculateQualityScore(item, themeInfo?.matchedThemeId, currentLang, isHollywood);
  };

  const fetchSimilarShows = async (page = 1, reset = false, currentShowData = null, currentThemeInfo = null) => {
    if (loadingSimilar && !reset) return;
    
    setLoadingSimilar(true);
    try {
      const showIdNum = Number(id);
      const activeShow = currentShowData || showDetailsRef.current || show;
      const activeTheme = currentThemeInfo || themeInfoRef.current || themeInfo;
      const isHollywood = isHollywoodMedia(activeShow);

      if (reset) {
        seenShowIdsRef.current = new Set([showIdNum, ...userExcludedShowIdsRef.current]);
      }

      let combinedShows = [];
      let totalRecPages = 1;

      // 1. Thematic Discovery:
      // If specific narrative themes were identified (e.g. Zombie, Space Exploration, Supernatural),
      // query TMDB Discover for TV with those theme keywords.
      // Mandatory requirement: query post-2000 releases first.
      if (activeTheme?.themeKeywordIds?.length > 0) {
        try {
          const kwQuery = activeTheme.themeKeywordIds.slice(0, 3).join('|');
          const genreParam = activeShow?.genres?.[0]?.id ? `&with_genres=${activeShow.genres[0].id}` : '';
          const langParam = isHollywood
            ? '&with_original_language=en'
            : (activeShow?.original_language ? `&with_original_language=${activeShow.original_language}` : '');
          const dateParam = !post2000ExhaustedRef.current
            ? '&first_air_date.gte=2000-01-01'
            : '&first_air_date.lte=1999-12-31';

          const discoverRes = await axios.get(
            `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_keywords=${kwQuery}${genreParam}${langParam}${dateParam}&sort_by=popularity.desc&page=${page}`,
            { timeout: 6000 }
          );
          const discoverList = discoverRes.data?.results || [];
          const sortedDiscover = discoverList
            .filter(s => s.id !== showIdNum && !userExcludedShowIdsRef.current.has(s.id))
            .sort((a, b) => calculateShowQualityScore(b) - calculateShowQualityScore(a));

          for (const item of sortedDiscover) {
            if (!seenShowIdsRef.current.has(item.id)) {
              seenShowIdsRef.current.add(item.id);
              combinedShows.push(item);
            }
          }
        } catch (discErr) {
          console.warn("Could not fetch thematic TV discover matches:", discErr?.message);
        }
      }

      // 2. Fetch TV Recommendations (collaborative filtering & direct spin-offs/prequels/genre matches)
      try {
        const response = await axios.get(
          `${TV_DETAILS_URL}${id}/recommendations?api_key=${API_KEY}&page=${page}`,
          { timeout: 6000 }
        );
        const recList = response.data?.results || [];
        totalRecPages = response.data?.total_pages || 1;

        // Sort by newer, more popular, and higher rated first
        const sortedRecs = recList
          .filter(r => r.id !== showIdNum && !userExcludedShowIdsRef.current.has(r.id))
          .sort((a, b) => calculateShowQualityScore(b) - calculateShowQualityScore(a));

        for (const item of sortedRecs) {
          if (!seenShowIdsRef.current.has(item.id)) {
            seenShowIdsRef.current.add(item.id);
            combinedShows.push(item);
          }
        }
      } catch (recErr) {
        console.warn("Could not fetch TV recommendations:", recErr?.message);
      }

      // 3. Fallback to similar if recommendations is empty or ran out
      if (combinedShows.length === 0 || page > totalRecPages) {
        try {
          const fallbackRes = await axios.get(
            `${TV_DETAILS_URL}${id}/similar?api_key=${API_KEY}&page=${page}`,
            { timeout: 6000 }
          );
          const fallbackList = (fallbackRes.data?.results || [])
            .filter(f => f.id !== showIdNum && !userExcludedShowIdsRef.current.has(f.id))
            .sort((a, b) => calculateShowQualityScore(b) - calculateShowQualityScore(a));

          for (const item of fallbackList) {
            if (!seenShowIdsRef.current.has(item.id)) {
              seenShowIdsRef.current.add(item.id);
              combinedShows.push(item);
            }
          }
        } catch (simErr) {
          console.warn("Could not fetch TV similar fallback:", simErr?.message);
        }
      }

      // MANDATORY YEAR REQUIREMENT:
      // Partition strictly into post-2000 (>= 2000) and pre-2000 (< 2000).
      // Post-2000 TV shows MUST appear first.
      // Pre-2000 TV shows appear ONLY after all similar shows after 2000 have been loaded already.
      const { post2000, pre2000 } = partitionAndSortByYear(
        combinedShows,
        activeTheme?.matchedThemeId,
        activeShow?.original_language,
        isHollywood
      );

      // Stash any discovered pre-2000 shows into the reservoir
      for (const pre of pre2000) {
        if (!pre2000ReservoirRef.current.some(item => item.id === pre.id)) {
          pre2000ReservoirRef.current.push(pre);
        }
      }
      pre2000ReservoirRef.current.sort((a, b) => calculateShowQualityScore(b) - calculateShowQualityScore(a));

      // Enforce Hollywood filter strictly if the current show is Hollywood
      let targetPost2000 = post2000;
      if (isHollywood) {
        const hwOnly = post2000.filter(s => s.original_language === 'en');
        if (hwOnly.length >= 6) {
          targetPost2000 = hwOnly;
        }
      }

      let showsToDisplay = [];
      if (!post2000ExhaustedRef.current) {
        if (targetPost2000.length > 0) {
          showsToDisplay = targetPost2000;
        } else {
          // Post-2000 shows have now been completely exhausted!
          post2000ExhaustedRef.current = true;
          // Only now begin releasing pre-2000 shows from the reservoir
          showsToDisplay = pre2000ReservoirRef.current.splice(0, 18);
        }
      } else {
        // Post-2000 already exhausted: release next batch of pre-2000 shows
        showsToDisplay = pre2000ReservoirRef.current.splice(0, 18);
      }

      // Initial load fallback: if no post-2000 shows exist at all
      if (reset && showsToDisplay.length === 0 && pre2000ReservoirRef.current.length > 0) {
        post2000ExhaustedRef.current = true;
        showsToDisplay = pre2000ReservoirRef.current.splice(0, 18);
      }

      if (reset) {
        setSimilarShows(showsToDisplay);
      } else {
        setSimilarShows(prev => [...prev, ...showsToDisplay]);
      }

      setHasMoreSimilar(
        (showsToDisplay.length > 0 || pre2000ReservoirRef.current.length > 0) && page < 20
      );
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
      //https://s72-raphael-watchwise.onrender.com/api/profile/tvshows/${id}
      //http://localhost:3000/api/profile/tvshows/${id}
      const response = await axios.get(`${Endpoint}/api/profile/tvshows/${id}`, {
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
      //https://s72-raphael-watchwise.onrender.com/api/profile/tvshows/${id}
      //http://localhost:3000/api/profile/tvshows/${id}
      const response = await axios.put(`${Endpoint}/api/profile/tvshows/${id}`, showData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.showStatus) {
        setWatchStatus(response.data.showStatus.watchStatus);
        setRating(response.data.showStatus.rating || 0);
      }

      // Track the watchStatus change for the recommendation engine
      trackInteraction(token, {
          mediaType: 'tvshow',
          mediaId: String(id),
          mediaTitle: show.name,
          eventType: 'watchStatus',
          watchStatus: newStatus,
          rating: newRating || null,
          genreIds: (show.genres || []).map((g) => g.id),
          metadata: { popularity: show.popularity },
      });

      if (newRating >= 7) {
          trackInteraction(token, {
              mediaType: 'tvshow',
              mediaId: String(id),
              mediaTitle: show.name,
              eventType: 'like',
              rating: newRating,
              genreIds: (show.genres || []).map((g) => g.id),
          });
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
    const showIdNum = Number(id);
    if (['watched', 'inProgress', 'planToWatch'].includes(newStatus)) {
      userExcludedShowIdsRef.current.add(showIdNum);
      seenShowIdsRef.current.add(showIdNum);
      setSimilarShows(prev => prev.filter(s => s.id !== showIdNum));
    } else {
      userExcludedShowIdsRef.current.delete(showIdNum);
    }
    updateTvShowStatus(newStatus, rating);
  };

  const handleRatingChange = (newRating) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setRating(newRating);
    setHoverRating(0);
    updateTvShowStatus(watchStatus, newRating);
  };

  const getRatingColor = (currentRating) => {
    const config = RATING_CONFIG.find(r => r.value === currentRating);
    return config ? config.color : 'bg-gray-200';
  };
  
  const handleSimilarShowClick = (showId) => {
    navigate(`/tv/${showId}`);
  };

  if (loading) return <LoadingScreen message="Loading" />;
  if (!show) return <p className="text-center mt-10 text-red-500">TV show not found!</p>;

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
              src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
              alt={show.name}
              className="w-80 max-w-full rounded-lg shadow-md"
            />
            <div className="md:ml-6 mt-4 md:mt-0 flex-1 w-full md:w-auto">
              <h1 className="text-3xl font-bold text-white">{show.name}</h1>
              <p className="text-gray-300 mt-2">First Aired: {show.first_air_date}</p>
              <p className="mt-4 text-gray-200">{show.overview}</p>
              <p className="mt-4 font-semibold text-white">Rating: {show.vote_average.toFixed(1)}/10</p>
              <p className="mt-2 text-gray-300">Genres: {show.genres.map(g => g.name).join(", ")}</p>
              <p className="mt-2 text-gray-300">Seasons: {show.number_of_seasons}</p>
              <p className="mt-2 text-gray-300">Episodes: {show.number_of_episodes}</p>

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

      {/* Similar Shows Section - Outside main container, full width */}
      {similarShows.length > 0 && (
        <div className="w-full py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-8 backdrop-blur-md bg-white/10 px-8 py-4 rounded-2xl shadow-xl w-fit max-w-xl mx-auto border border-white/20 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                You'll Also Like
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {similarShows.map(show => (
                <div key={show.id} onClick={() => handleSimilarShowClick(show.id)}>
                  <TvShowCard show={show} />
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