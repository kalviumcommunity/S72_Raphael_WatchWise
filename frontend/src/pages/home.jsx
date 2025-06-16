import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/navbar';
import MovieCard from '../components/Moviecard';
import TvShowCard from '../components/Tvshowcard';
import AnimeCard from '../components/Animecard';

const WATCH_STATUS = {
  NOT_PLANNING: 'notPlanning',
  NOT_STARTED: 'planToWatch',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'watched'
};

const WATCH_STATUS_LABELS = {
  [WATCH_STATUS.NOT_STARTED]: "Plan to Watch",
  [WATCH_STATUS.IN_PROGRESS]: "Currently Watching",
  [WATCH_STATUS.COMPLETED]: "Completed"
};

const WATCH_STATUS_COLORS = {
  [WATCH_STATUS.NOT_STARTED]: 'border-blue-500',
  [WATCH_STATUS.IN_PROGRESS]: 'border-yellow-500',
  [WATCH_STATUS.COMPLETED]: 'border-green-500'
};

const Home = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState({});
  const [tvShows, setTvShows] = useState({});
  const [anime, setAnime] = useState({});
  const [loading, setLoading] = useState({
    movies: true,
    tvShows: true,
    anime: true
  });
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('homeActiveTab');
    return savedTab || 'movies';
  });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContent, setFilteredContent] = useState({
    movies: {},
    tvShows: {},
    anime: {}
  });

  const fetchStats = async (token) => {
    try {
      const [movieResponse, tvResponse, animeResponse] = await Promise.all([
        axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/movies', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/tvshows', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/anime', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      // Calculate stats from the responses
      const calculateStats = (items) => {
        return {
          planToWatch: items.filter(item => item.watchStatus === WATCH_STATUS.NOT_STARTED).length,
          inProgress: items.filter(item => item.watchStatus === WATCH_STATUS.IN_PROGRESS).length,
          watched: items.filter(item => item.watchStatus === WATCH_STATUS.COMPLETED).length
        };
      };

      setStats({
        movies: calculateStats(movieResponse.data.movies),
        tvShows: calculateStats(tvResponse.data.tvShows),
        anime: calculateStats(animeResponse.data.anime)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('homeActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchUserContent = async () => {
      try {
        setLoading(prev => ({ ...prev, movies: true }));
        const [movieResponse, tvResponse, animeResponse] = await Promise.all([
          axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/movies', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/tvshows', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          axios.get('https://s72-raphael-watchwise.onrender.com/api/profile/anime', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        // Group movies by watch status
        const groupedMovies = {};
        movieResponse.data.movies.forEach(movie => {
          if (movie.watchStatus !== WATCH_STATUS.NOT_PLANNING) {
            if (!groupedMovies[movie.watchStatus]) {
              groupedMovies[movie.watchStatus] = [];
            }
            groupedMovies[movie.watchStatus].push(movie);
          }
        });

        // Group TV shows by watch status
        const groupedTvShows = {};
        tvResponse.data.tvShows.forEach(show => {
          if (show.watchStatus !== WATCH_STATUS.NOT_PLANNING) {
            if (!groupedTvShows[show.watchStatus]) {
              groupedTvShows[show.watchStatus] = [];
            }
            groupedTvShows[show.watchStatus].push(show);
          }
        });

        // Group anime by watch status
        const groupedAnime = {};
        animeResponse.data.anime.forEach(item => {
          if (item.watchStatus !== WATCH_STATUS.NOT_PLANNING) {
            if (!groupedAnime[item.watchStatus]) {
              groupedAnime[item.watchStatus] = [];
            }
            groupedAnime[item.watchStatus].push(item);
          }
        });

        setMovies(groupedMovies);
        setTvShows(groupedTvShows);
        setAnime(groupedAnime);
        
        // Initialize filtered content with all content
        setFilteredContent({
          movies: { ...groupedMovies },
          tvShows: { ...groupedTvShows },
          anime: { ...groupedAnime }
        });

        // Calculate and set stats
        const calculateStats = (items) => {
          return {
            planToWatch: items.filter(item => item.watchStatus === WATCH_STATUS.NOT_STARTED).length,
            inProgress: items.filter(item => item.watchStatus === WATCH_STATUS.IN_PROGRESS).length,
            watched: items.filter(item => item.watchStatus === WATCH_STATUS.COMPLETED).length
          };
        };

        setStats({
          movies: calculateStats(movieResponse.data.movies),
          tvShows: calculateStats(tvResponse.data.tvShows),
          anime: calculateStats(animeResponse.data.anime)
        });
        
        setError(null);
      } catch (error) {
        console.error('Error fetching user content:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Failed to fetch your content. Please try again later.');
        }
      } finally {
        setLoading({
          movies: false,
          tvShows: false,
          anime: false
        });
      }
    };

    fetchUserContent();

    // Set up an interval to fetch stats periodically
    const statsInterval = setInterval(() => {
      fetchStats(token);
    }, 30000); // Fetch every 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(statsInterval);
  }, [navigate]);
  
  // Filter content based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // If search is empty, show all content
      setFilteredContent({
        movies: { ...movies },
        tvShows: { ...tvShows },
        anime: { ...anime }
      });
      return;
    }
    
    const query = searchQuery.toLowerCase();
    
    // Filter movies
    const filteredMovies = {};
    Object.entries(movies).forEach(([status, items]) => {
      filteredMovies[status] = items.filter(movie => 
        movie.movieTitle.toLowerCase().includes(query)
      );
    });
    
    // Filter TV shows
    const filteredTvShows = {};
    Object.entries(tvShows).forEach(([status, items]) => {
      filteredTvShows[status] = items.filter(show => 
        show.showTitle.toLowerCase().includes(query)
      );
    });
    
    // Filter anime
    const filteredAnimeItems = {};
    Object.entries(anime).forEach(([status, items]) => {
      filteredAnimeItems[status] = items.filter(animeItem => 
        animeItem.animeTitle.toLowerCase().includes(query)
      );
    });
    
    setFilteredContent({
      movies: filteredMovies,
      tvShows: filteredTvShows,
      anime: filteredAnimeItems
    });
  }, [searchQuery, movies, tvShows, anime]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  if (loading.movies || loading.tvShows || loading.anime) {
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

  const renderContent = (type) => {
    const content = type === 'movies' 
      ? filteredContent.movies 
      : type === 'tvShows' 
        ? filteredContent.tvShows 
        : filteredContent.anime;
        
    const CardComponent = type === 'movies' ? MovieCard : type === 'tvShows' ? TvShowCard : AnimeCard;
    
    return Object.entries(WATCH_STATUS_LABELS).map(([status, label]) => (
      <div key={status} className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{label}</h2>
          {content[status]?.length > 0 && (
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
              {content[status].length}
            </span>
          )}
        </div>
        
        {content[status]?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {content[status].map((item) => (
              <div 
                key={type === 'movies' ? item.movieId : type === 'tvShows' ? item.showId : item.animeId}
                className={`aspect-[2/3] relative rounded-lg overflow-hidden transition-transform hover:-translate-y-1
                          border-t-4 ${WATCH_STATUS_COLORS[status]}`}
              >
                <CardComponent 
                  {...(type === 'movies' 
                    ? { 
                        movie: {
                          id: item.movieId,
                          title: item.movieTitle,
                          poster_path: item.posterPath,
                          vote_average: item.rating || 0
                        }
                      }
                    : type === 'tvShows'
                    ? {
                        show: {
                          id: item.showId,
                          name: item.showTitle,
                          poster_path: item.posterPath,
                          vote_average: item.rating || 0
                        }
                      }
                    : {
                        anime: {
                          mal_id: item.animeId,
                          title: item.animeTitle,
                          images: {
                            jpg: {
                              large_image_url: item.posterPath
                            }
                          },
                          score: item.rating || 0
                        }
                      }
                  )}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8 bg-white rounded-lg">
            No {type === 'movies' ? 'movies' : type === 'tvShows' ? 'TV shows' : 'anime'} in this category yet
            {searchQuery && " matching your search"}
          </p>
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
              <h3 className="text-lg font-semibold text-gray-800">Plan to Watch</h3>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-sm text-gray-600">Movies</p>
                  <p className="text-xl font-bold text-blue-500">{stats.movies.planToWatch}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">TV Shows</p>
                  <p className="text-xl font-bold text-blue-500">{stats.tvShows.planToWatch}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Anime</p>
                  <p className="text-xl font-bold text-blue-500">{stats.anime.planToWatch}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-yellow-500">
              <h3 className="text-lg font-semibold text-gray-800">Currently Watching</h3>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-sm text-gray-600">Movies</p>
                  <p className="text-xl font-bold text-yellow-500">{stats.movies.inProgress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">TV Shows</p>
                  <p className="text-xl font-bold text-yellow-500">{stats.tvShows.inProgress}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Anime</p>
                  <p className="text-xl font-bold text-yellow-500">{stats.anime.inProgress}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
              <h3 className="text-lg font-semibold text-gray-800">Completed</h3>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-sm text-gray-600">Movies</p>
                  <p className="text-xl font-bold text-green-500">{stats.movies.watched}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">TV Shows</p>
                  <p className="text-xl font-bold text-green-500">{stats.tvShows.watched}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Anime</p>
                  <p className="text-xl font-bold text-green-500">{stats.anime.watched}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Type Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('movies')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'movies'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => setActiveTab('tvShows')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'tvShows'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            TV Shows
          </button>
          <button
            onClick={() => setActiveTab('anime')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'anime'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Anime
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder={`Search your ${activeTab === 'movies' ? 'movies' : activeTab === 'tvShows' ? 'TV shows' : 'anime'}...`}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {searchQuery ? (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        ) : (
          renderContent(activeTab)
        )}
      </div>
    </div>
  );
};

export default Home;