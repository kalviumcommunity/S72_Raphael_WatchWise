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
  const searchRef = useRef(null);
  const genreRef = useRef(null);

  useEffect(() => {
    // Check if user is authenticated by looking for token
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
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
    <nav className="fixed top-0 left-0 w-full bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-md z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <button 
            onClick={() => navigate("/")} 
            className="text-black text-2xl font-bold tracking-wide focus:outline-none"
          >
            WatchWise
          </button>

          {/* Search Bar */}
          <div ref={searchRef} className="relative max-w-xl w-full mx-4 hidden md:block">
            <input
              type="text"
              value={query}
              onChange={handleSearch}
              onKeyPress={handleKeyPress}
              onFocus={handleFocus}
              placeholder="Search for movies, TV shows, or anime..."
              className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300
                     focus:ring-2 focus:ring-red-500 focus:border-red-500
                     focus:outline-none shadow-sm transition-shadow duration-300
                     bg-white/80 backdrop-blur-sm"
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
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
              </div>
            )}

            {/* Search Results Dropdown */}
            {showResults && (dropdownResults.movies.length > 0 || dropdownResults.tvShows.length > 0 || dropdownResults.anime.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-auto">
                {/* Movies Section */}
                {dropdownResults.movies.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-600">Movies 🎬</h3>
                    </div>
                    {dropdownResults.movies.map(movie => (
                      <button
                        key={movie.id}
                        onClick={() => handleItemClick('movie', movie.id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
                      >
                        {movie.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-10 h-15 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-15 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-2xl">🎬</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800">{movie.title}</div>
                          <div className="text-sm text-gray-500">
                            {movie.release_date?.split('-')[0] || 'TBA'} • ⭐ {movie.vote_average?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* TV Shows Section */}
                {dropdownResults.tvShows.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-600">TV Shows 📺</h3>
                    </div>
                    {dropdownResults.tvShows.map(show => (
                      <button
                        key={show.id}
                        onClick={() => handleItemClick('tv', show.id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
                      >
                        {show.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${show.poster_path}`}
                            alt={show.name}
                            className="w-10 h-15 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-15 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-2xl">📺</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800">{show.name}</div>
                          <div className="text-sm text-gray-500">
                            {show.first_air_date?.split('-')[0] || 'TBA'} • ⭐ {show.vote_average?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Anime Section */}
                {dropdownResults.anime.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-600">Anime 🎌</h3>
                    </div>
                    {dropdownResults.anime.map(anime => (
                      <button
                        key={anime.mal_id}
                        onClick={() => handleItemClick('anime', anime.mal_id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
                      >
                        {anime.images?.jpg?.image_url ? (
                          <img
                            src={anime.images.jpg.image_url}
                            alt={anime.title}
                            className="w-10 h-15 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-15 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-gray-400 text-2xl">🎌</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-800">{anime.title}</div>
                          <div className="text-sm text-gray-500">
                            {anime.year || 'TBA'} • ⭐ {anime.score?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
<ul className="hidden md:flex space-x-8 items-center">
  <li>
    <button 
      onClick={() => navigate("/home")} 
      className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 rounded-lg px-3 py-2 hover:bg-blue-50 transform hover:scale-105"
    >
      Home
    </button>
  </li>
  <li>
    <button 
      onClick={() => navigate("/recommendations")} 
      className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 rounded-lg px-3 py-2 hover:bg-blue-50 transform hover:scale-105"
    >
      Recommendations
    </button>
  </li>
  <li ref={genreRef} className="relative">
    <button 
      onClick={() => setShowGenres(!showGenres)}
      className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50 rounded-lg px-3 py-2 hover:bg-blue-50 transform hover:scale-105 flex items-center group"
    >
      Genres
      <svg 
        className={`w-4 h-4 ml-2 transform transition-all duration-300 group-hover:text-blue-600 ${showGenres ? 'rotate-180' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {showGenres && (
      <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-3 z-50 transform transition-all duration-200 opacity-100 scale-100">
        <div className="max-h-64 overflow-y-auto">
          {genres.map((genre, index) => (
            <button
              key={genre.id}
              onClick={() => handleGenreClick(genre.id)}
              className="w-full px-5 py-3 text-left text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium border-l-4 border-transparent hover:border-blue-400 transform hover:translate-x-1"
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              {genre.name}
            </button>
          ))}
        </div>
        {/* Dropdown Arrow */}
        <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"></div>
      </div>
    )}
  </li>
  <li>
    <button 
      onClick={handleAuthClick} 
      className={`font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 rounded-lg px-6 py-2 transform hover:scale-105 shadow-md hover:shadow-lg ${
        isAuthenticated 
          ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-200 border-2 border-blue-200 hover:border-blue-300' 
          : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-300'
      }`}
    >
      {isAuthenticated ? 'Profile' : 'Sign Up'}
    </button>
  </li>
</ul>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-black focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
