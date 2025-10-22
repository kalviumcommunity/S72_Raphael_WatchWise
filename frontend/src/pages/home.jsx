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

        const groupedMovies = {};
        movieResponse.data.movies.forEach(movie => {
          if (movie.watchStatus !== WATCH_STATUS.NOT_PLANNING) {
            if (!groupedMovies[movie.watchStatus]) {
              groupedMovies[movie.watchStatus] = [];
            }
            groupedMovies[movie.watchStatus].push(movie);
          }
        });

        const groupedTvShows = {};
        tvResponse.data.tvShows.forEach(show => {
          if (show.watchStatus !== WATCH_STATUS.NOT_PLANNING) {
            if (!groupedTvShows[show.watchStatus]) {
              groupedTvShows[show.watchStatus] = [];
            }
            groupedTvShows[show.watchStatus].push(show);
          }
        });

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
        
        setFilteredContent({
          movies: { ...groupedMovies },
          tvShows: { ...groupedTvShows },
          anime: { ...groupedAnime }
        });

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

    const statsInterval = setInterval(() => {
      fetchStats(token);
    }, 30000);

    return () => clearInterval(statsInterval);
  }, [navigate]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContent({
        movies: { ...movies },
        tvShows: { ...tvShows },
        anime: { ...anime }
      });
      return;
    }
    
    const query = searchQuery.toLowerCase();
    
    const filteredMovies = {};
    Object.entries(movies).forEach(([status, items]) => {
      filteredMovies[status] = items.filter(movie => 
        movie.movieTitle.toLowerCase().includes(query)
      );
    });
    
    const filteredTvShows = {};
    Object.entries(tvShows).forEach(([status, items]) => {
      filteredTvShows[status] = items.filter(show => 
        show.showTitle.toLowerCase().includes(query)
      );
    });
    
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
          <h2 className="text-2xl font-bold text-white">{label}</h2>
          {content[status]?.length > 0 && (
            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm font-medium">
              {content[status].length}
            </span>
          )}
        </div>
        
        {content[status]?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {content[status].map((item) => (
              <div 
                key={type === 'movies' ? item.movieId : type === 'tvShows' ? item.showId : item.animeId}
                className={`aspect-[2/3] relative rounded-md overflow-hidden transition-transform hover:scale-105 hover:z-10
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
          <div className="text-center py-16">
            <div className="inline-block p-4 bg-gray-900 rounded-full mb-4">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">
              No {type === 'movies' ? 'movies' : type === 'tvShows' ? 'TV shows' : 'anime'} in this category yet
            </p>
            {searchQuery && (
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search</p>
            )}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Hero Section with Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My List</h1>
          <p className="text-gray-400 text-lg">Track your favorite movies, TV shows, and anime</p>
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800 hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Plan to Watch</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Movies</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.movies.planToWatch}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">TV Shows</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.tvShows.planToWatch}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Anime</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.anime.planToWatch}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800 hover:border-yellow-500 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Watching</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Movies</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.movies.inProgress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">TV Shows</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.tvShows.inProgress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Anime</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.anime.inProgress}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800 hover:border-green-500 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Completed</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Movies</p>
                  <p className="text-2xl font-bold text-green-400">{stats.movies.watched}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">TV Shows</p>
                  <p className="text-2xl font-bold text-green-400">{stats.tvShows.watched}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Anime</p>
                  <p className="text-2xl font-bold text-green-400">{stats.anime.watched}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Tabs Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Content Type Tabs */}
          <div className="flex gap-2 border-b border-gray-800 pb-4">
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
          
          {/* Search Bar */}
          <div className="w-full sm:w-64">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full px-4 py-3 pl-10 rounded-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-900/30 border border-red-500 text-red-400 p-4 rounded-lg">
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