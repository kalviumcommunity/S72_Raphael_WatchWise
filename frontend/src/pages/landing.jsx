import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import MovieCard from '../components/Moviecard';
import TvShowCard from '../components/Tvshowcard';
import AnimeCard from '../components/Animecard';
import Navbar from '../components/navbar';
import { useSearch } from '../context/SearchContext';

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const POPULAR_MOVIES_URL = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`;
const POPULAR_TV_URL = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}`;
const POPULAR_ANIME_URL = "https://api.jikan.moe/v4/top/anime";
const SEARCH_MOVIES_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;
const SEARCH_TV_URL = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=`;
const SEARCH_ANIME_URL = "https://api.jikan.moe/v4/anime";

const Landing = () => {
  const { searchState, updateSearchState, clearSearch } = useSearch();
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'movies';
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Observer for infinite scrolling
  const observer = useRef();
  // Last element ref for intersection observer
  const lastElementRef = useRef(null);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Initial content load
  useEffect(() => {
    const loadInitialContent = async () => {
      if (searchState.results) {
        // If we have search results, use them
        setMovies(searchState.results.movies || []);
        setTvShows(searchState.results.tvShows || []);
        setAnime(searchState.results.anime || []);
        setPage(searchState.page || 1);
        setLoading(false);
      } else {
        // Otherwise load popular content
        await fetchPopularContent(1, true);
      }
    };

    loadInitialContent();
  }, [searchState.results]);

  const fetchPopularContent = async (pageNum, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const [movieResponse, tvResponse, animeResponse] = await Promise.all([
        axios.get(`${POPULAR_MOVIES_URL}&page=${pageNum}`),
        axios.get(`${POPULAR_TV_URL}&page=${pageNum}`),
        axios.get(`${POPULAR_ANIME_URL}?page=${pageNum}`)
      ]);

      if (isInitial) {
        setMovies(movieResponse.data.results);
        setTvShows(tvResponse.data.results);
        setAnime(animeResponse.data.data);
        setPage(1);
      } else {
        setMovies(prev => [...prev, ...movieResponse.data.results]);
        setTvShows(prev => [...prev, ...tvResponse.data.results]);
        setAnime(prev => [...prev, ...animeResponse.data.data]);
        setPage(pageNum);
      }
      
      // Check if we have more content to load
      const hasMoreMovies = movieResponse.data.page < movieResponse.data.total_pages;
      const hasMoreTv = tvResponse.data.page < tvResponse.data.total_pages;
      const hasMoreAnime = animeResponse.data.pagination?.has_next_page;
      
      setHasMore(hasMoreMovies || hasMoreTv || hasMoreAnime);
    } catch (error) {
      console.error("Error fetching popular content:", error);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const fetchMoreSearchResults = async (pageNum) => {
    setIsLoadingMore(true);
    try {
      const [movieResponse, tvResponse, animeResponse] = await Promise.all([
        axios.get(`${SEARCH_MOVIES_URL}${searchState.query}&page=${pageNum}`),
        axios.get(`${SEARCH_TV_URL}${searchState.query}&page=${pageNum}`),
        axios.get(SEARCH_ANIME_URL, {
          params: {
            q: searchState.query,
            page: pageNum,
            sfw: true
          }
        })
      ]);

      const newResults = {
        movies: [...searchState.results.movies, ...movieResponse.data.results],
        tvShows: [...searchState.results.tvShows, ...tvResponse.data.results],
        anime: [...searchState.results.anime, ...animeResponse.data.data]
      };

      updateSearchState({
        results: newResults,
        page: pageNum,
        query: searchState.query
      });

      // Update local state to match search results
      setMovies(newResults.movies);
      setTvShows(newResults.tvShows);
      setAnime(newResults.anime);
      
      // Check if we have more content to load
      const hasMoreMovies = movieResponse.data.page < movieResponse.data.total_pages;
      const hasMoreTv = tvResponse.data.page < tvResponse.data.total_pages;
      const hasMoreAnime = animeResponse.data.pagination?.has_next_page;
      
      setHasMore(hasMoreMovies || hasMoreTv || hasMoreAnime);
    } catch (error) {
      console.error("Error loading more search results:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load more content when reaching bottom of page
  const loadMoreContent = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    const nextPage = page + 1;
    
    if (searchState.results) {
      fetchMoreSearchResults(nextPage);
    } else {
      fetchPopularContent(nextPage);
    }
  }, [searchState.results, page, isLoadingMore, hasMore]);

  // Setup intersection observer for infinite scrolling
  const lastElementCallback = useCallback(node => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreContent();
      }
    }, { threshold: 0.5 });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, loadMoreContent]);

  const handleShowPopular = async () => {
    setLoading(true);
    clearSearch();
    await fetchPopularContent(1, true);
    // Reset to page 1
    window.scrollTo(0, 0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    const content = searchState.results || { movies, tvShows, anime };
    let items = [];
    
    switch (activeTab) {
      case 'movies':
        items = content.movies?.map((movie, index) => {
          // Add ref to last element for observer
          if (content.movies.length === index + 1) {
            return (
              <div ref={lastElementCallback} key={movie.id}>
                <MovieCard movie={movie} />
              </div>
            );
          } else {
            return <MovieCard key={movie.id} movie={movie} />;
          }
        });
        break;
      case 'tvShows':
        items = content.tvShows?.map((show, index) => {
          if (content.tvShows.length === index + 1) {
            return (
              <div ref={lastElementCallback} key={show.id}>
                <TvShowCard show={show} />
              </div>
            );
          } else {
            return <TvShowCard key={show.id} show={show} />;
          }
        });
        break;
      case 'anime':
        items = content.anime?.map((anime, index) => {
          if (content.anime.length === index + 1) {
            return (
              <div ref={lastElementCallback} key={anime.mal_id}>
                <AnimeCard anime={anime} />
              </div>
            );
          } else {
            return <AnimeCard key={anime.mal_id} anime={anime} />;
          }
        });
        break;
      default:
        return null;
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-200">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => handleTabChange('movies')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'movies' ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => handleTabChange('tvShows')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'tvShows' ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              TV Shows
            </button>
            <button
              onClick={() => handleTabChange('anime')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'anime' ? 'bg-red-500 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Anime
            </button>
          </div>
        </div>

        {/* Search Results Notice */}
        {searchState.results && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Search Results for "{searchState.query}"
            </h2>
            <button
              onClick={handleShowPopular}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Show Popular Content
            </button>
          </div>
        )}

        {/* Content Grid */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {renderContent()}

            {/* Loading indicator at bottom for infinite scroll */}
            {isLoadingMore && (
              <div className="mt-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent"></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Landing;