//eslint-disable-next-line
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useSearch } from '../context/SearchContext';

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const SEARCH_MOVIES_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;
const SEARCH_TV_URL = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=`;
const SEARCH_ANIME_URL = "https://api.jikan.moe/v4/anime";
const GENRES_URL = `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}`;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchState, updateSearchState, clearSearch } = useSearch();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownResults, setDropdownResults] = useState({
    movies: [],
    tvShows: [],
    anime: []
  });
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showGenres, setShowGenres] = useState(false);
  const [genres, setGenres] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);
  const genreRef = useRef(null);

  useEffect(() => {
    // Check if user is authenticated by looking for token
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    // Handle scroll effect for navbar background
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Clear search when changing pages
    setQuery("");
    setDropdownResults({ movies: [], tvShows: [], anime: [] });
    setShowResults(false);
  }, [location.pathname]);

  useEffect(() => {
    // Fetch genres when component mounts
    const fetchGenres = async () => {
      try {
        const response = await axios.get(GENRES_URL);
        setGenres(response.data.genres);
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    // Add click outside listener for both search and genre dropdowns
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setIsFocused(false);
      }
      if (genreRef.current && !genreRef.current.contains(event.target)) {
        setShowGenres(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (e) => {
    const searchTerm = e.target.value;
    setQuery(searchTerm);
    
    if (searchTerm.trim() === "") {
      setDropdownResults({ movies: [], tvShows: [], anime: [] });
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const [movieResponse, tvResponse, animeResponse] = await Promise.all([
        axios.get(SEARCH_MOVIES_URL + searchTerm),
        axios.get(SEARCH_TV_URL + searchTerm),
        axios.get(SEARCH_ANIME_URL, {
          params: {
            q: searchTerm,
            limit: 5,
            sfw: true
          }
        })
      ]);

      setDropdownResults({
        movies: movieResponse.data.results.slice(0, 5),
        tvShows: tvResponse.data.results.slice(0, 5),
        anime: animeResponse.data.data.slice(0, 5)
      });
      
      setShowResults(true && isFocused);
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowResults(false);
      
      if (query.trim() === "") {
        clearSearch();
        return;
      }
      
      try {
        const [movieResponse, tvResponse, animeResponse] = await Promise.all([
          axios.get(SEARCH_MOVIES_URL + query),
          axios.get(SEARCH_TV_URL + query),
          axios.get(SEARCH_ANIME_URL, {
            params: {
              q: query,
              sfw: true
            }
          })
        ]);

        updateSearchState({
          results: {
            movies: movieResponse.data.results,
            tvShows: tvResponse.data.results,
            anime: animeResponse.data.data
          },
          query: query,
          page: 1
        });

        if (location.pathname !== '/') {
          navigate('/');
        }
      } catch (error) {
        console.error("Error searching:", error);
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (Object.values(dropdownResults).some(arr => arr.length > 0)) {
      setShowResults(true);
    }
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      navigate("/profile");
    } else {
      navigate("/signup");
    }
  };

  const handleItemClick = (type, id) => {
    setShowResults(false);
    setIsFocused(false);
    setQuery("");
    navigate(`/${type}/${id}`);
  };

  const handleGenreClick = async (genreId) => {
    try {
      const response = await axios.get(`https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreId}`);
      updateSearchState({
        results: {
          movies: response.data.results,
          tvShows: [],
          anime: []
        },
        query: genres.find(g => g.id === genreId)?.name || '',
        page: 1
      });
      setShowGenres(false);
      if (location.pathname !== '/') {
        navigate('/');
      }
    } catch (error) {
      console.error("Error fetching genre movies:", error);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-black/95 backdrop-blur-md shadow-lg' 
        : 'bg-gradient-to-b from-black via-black/50 to-transparent'
    }`}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center gap-3 focus:outline-none group"
            >
              <img 
                src="https://t4.ftcdn.net/jpg/06/89/35/41/360_F_689354146_zTRjLu14CB4OYuENFrgL9Aditp2OK3p7.jpg" 
                alt="WatchWise" 
                className="w-10 h-10 rounded-lg group-hover:scale-110 transition-transform duration-200"
              />
              <span className="text-white text-2xl font-bold tracking-tight group-hover:text-blue-600 transition-colors duration-200">
                WatchWise
              </span>
            </button>

            {/* Navigation Links - Desktop */}
            <ul className="hidden lg:flex space-x-1 items-center">
              <li>
                <button 
                  onClick={() => navigate("/home")} 
                  className="text-white hover:text-gray-300 font-medium px-3 py-2 transition-colors duration-200 relative group"
                >
                  Home
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/recommendations")} 
                  className="text-white hover:text-gray-300 font-medium px-3 py-2 transition-colors duration-200 relative group"
                >
                  Recommendations
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
                </button>
              </li>
              <li ref={genreRef} className="relative">
                <button 
                  onClick={() => setShowGenres(!showGenres)}
                  className="text-white hover:text-gray-300 font-medium px-3 py-2 transition-colors duration-200 flex items-center group relative"
                >
                  Genres
                  <svg 
                    className={`w-4 h-4 ml-1 transform transition-transform duration-300 ${showGenres ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className={`absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 ${showGenres ? 'w-full' : ''}`}></span>
                </button>
                {showGenres && (
                  <div className="absolute top-full left-0 mt-3 w-80 bg-black/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-600 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-700 mb-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Browse by Genre</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto px-2">
                      <div className="grid grid-cols-2 gap-2">
                        {genres.map((genre) => (
                          <button
                            key={genre.id}
                            onClick={() => handleGenreClick(genre.id)}
                            className="px-4 py-3 text-left text-gray-300 hover:text-white bg-gray-900/30 hover:bg-blue-600/40 rounded-lg transition-all duration-200 font-medium text-sm border border-gray-700 hover:border-blue-500 group"
                          >
                            <span className="flex items-center justify-between">
                              {genre.name}
                              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Custom scrollbar styling */}
                    <style>{`
                      .max-h-96::-webkit-scrollbar {
                        width: 6px;
                      }
                      .max-h-96::-webkit-scrollbar-track {
                        background: transparent;
                      }
                      .max-h-96::-webkit-scrollbar-thumb {
                        background: rgba(239, 68, 68, 0.5);
                        border-radius: 3px;
                      }
                      .max-h-96::-webkit-scrollbar-thumb:hover {
                        background: rgba(239, 68, 68, 0.8);
                      }
                    `}</style>
                  </div>
                )}
              </li>
            </ul>
          </div>

          {/* Right Side - Search & Auth */}
          <div className="flex items-center gap-6">
            {/* Search Bar */}
            <div ref={searchRef} className="relative hidden sm:block group">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={handleSearch}
                  onKeyPress={handleKeyPress}
                  onFocus={handleFocus}
                  placeholder="Search..."
                  className={`px-4 py-2 pl-10 rounded-full bg-black/30 border border-gray-600 
                         text-white placeholder-gray-400
                         focus:bg-black/60 focus:border-blue-500 focus:outline-none
                         transition-all duration-300 w-48 group-hover:w-56 group-focus-within:w-56 group-focus-within:bg-black/60`}
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {/* Loading Indicator */}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (dropdownResults.movies.length > 0 || dropdownResults.tvShows.length > 0 || dropdownResults.anime.length > 0) && (
                <div className="absolute top-full left-0 mt-3 w-[600px] bg-black/98 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[500px] overflow-y-auto">
                    {/* Movies Section */}
                    {dropdownResults.movies.length > 0 && (
                      <div>
                        <div className="px-5 py-3 bg-gray-900/70 border-b border-gray-700 sticky top-0 backdrop-blur-sm z-10">
                          <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            MOVIES
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {dropdownResults.movies.map((movie, index) => (
                            <button
                              key={movie.id}
                              onClick={() => handleItemClick('movie', movie.id)}
                              className="group px-4 py-3 text-left hover:bg-blue-600/20 flex items-center gap-4 transition-all duration-200 border-b border-gray-800/50 last:border-b-0"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="relative flex-shrink-0">
                                {movie.poster_path ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                                    alt={movie.title}
                                    className="w-12 h-18 object-cover rounded-md shadow-lg group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-12 h-18 bg-gray-800 rounded-md flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                    </svg>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 rounded-md transition-colors duration-200" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors text-base">
                                  {movie.title}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
                                    </svg>
                                    {movie.release_date?.split('-')[0] || 'TBA'}
                                  </span>
                                  <span className="flex items-center gap-1 text-yellow-500">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    {movie.vote_average?.toFixed(1) || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TV Shows Section */}
                    {dropdownResults.tvShows.length > 0 && (
                      <div>
                        <div className="px-5 py-3 bg-gray-900/70 border-b border-gray-700 sticky top-0 backdrop-blur-sm z-10">
                          <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            TV SHOWS
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {dropdownResults.tvShows.map((show, index) => (
                            <button
                              key={show.id}
                              onClick={() => handleItemClick('tv', show.id)}
                              className="group px-4 py-3 text-left hover:bg-blue-600/20 flex items-center gap-4 transition-all duration-200 border-b border-gray-800/50 last:border-b-0"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="relative flex-shrink-0">
                                {show.poster_path ? (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w92${show.poster_path}`}
                                    alt={show.name}
                                    className="w-12 h-18 object-cover rounded-md shadow-lg group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-12 h-18 bg-gray-800 rounded-md flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 rounded-md transition-colors duration-200" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors text-base">
                                  {show.name}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
                                    </svg>
                                    {show.first_air_date?.split('-')[0] || 'TBA'}
                                  </span>
                                  <span className="flex items-center gap-1 text-yellow-500">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    {show.vote_average?.toFixed(1) || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Anime Section */}
                    {dropdownResults.anime.length > 0 && (
                      <div>
                        <div className="px-5 py-3 bg-gray-900/70 border-b border-gray-700 sticky top-0 backdrop-blur-sm z-10">
                          <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                            </svg>
                            ANIME
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {dropdownResults.anime.map((anime, index) => (
                            <button
                              key={anime.mal_id}
                              onClick={() => handleItemClick('anime', anime.mal_id)}
                              className="group px-4 py-3 text-left hover:bg-blue-600/20 flex items-center gap-4 transition-all duration-200 border-b border-gray-800/50 last:border-b-0"
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="relative flex-shrink-0">
                                {anime.images?.jpg?.image_url ? (
                                  <img
                                    src={anime.images.jpg.image_url}
                                    alt={anime.title}
                                    className="w-12 h-18 object-cover rounded-md shadow-lg group-hover:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-12 h-18 bg-gray-800 rounded-md flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 rounded-md transition-colors duration-200" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white truncate group-hover:text-blue-400 transition-colors text-base">
                                  {anime.title}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
                                    </svg>
                                    {anime.year || 'TBA'}
                                  </span>
                                  <span className="flex items-center gap-1 text-yellow-500">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    {anime.score?.toFixed(1) || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Custom scrollbar */}
                  <style>{`
                    .max-h-\\[500px\\]::-webkit-scrollbar {
                      width: 8px;
                    }
                    .max-h-\\[500px\\]::-webkit-scrollbar-track {
                      background: rgba(0, 0, 0, 0.3);
                    }
                    .max-h-\\[500px\\]::-webkit-scrollbar-thumb {
                      background: rgba(59, 130, 246, 0.5);
                      border-radius: 4px;
                    }
                    .max-h-\\[500px\\]::-webkit-scrollbar-thumb:hover {
                      background: rgba(59, 130, 246, 0.7);
                    }
                  `}</style>
                </div>
              )}
            </div>

            {/* Auth Button */}
            <button 
              onClick={handleAuthClick} 
              className={`font-semibold rounded-lg px-4 py-2 transition-all duration-200 focus:outline-none text-sm ${
                isAuthenticated 
                  ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300' 
                  : 'text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700'
              }`}
            >
              {isAuthenticated ? 'Profile' : 'Sign Up'}
            </button>

            {/* Mobile Menu Button */}
            <button className="lg:hidden text-white hover:text-blue-600 transition-colors focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;