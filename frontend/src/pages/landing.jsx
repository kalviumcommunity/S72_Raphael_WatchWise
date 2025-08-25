import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MovieCard from '../components/Moviecard';
import TvShowCard from '../components/Tvshowcard';
import AnimeCard from '../components/Animecard';
import Navbar from '../components/navbar';
import { useSearch } from '../context/SearchContext';

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const POPULAR_MOVIES_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&include_adult=false`;
const POPULAR_TV_URL = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}`;
const POPULAR_ANIME_URL = "https://api.jikan.moe/v4/top/anime";
const SEARCH_MOVIES_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;
const SEARCH_TV_URL = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=`;
const SEARCH_ANIME_URL = "https://api.jikan.moe/v4/anime";

const Landing = () => {
  const navigate = useNavigate();
  const { searchState, updateSearchState, clearSearch } = useSearch();
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'movies';
  });
  
  // Separate pagination state for each tab
  const [moviePage, setMoviePage] = useState(1);
  const [tvPage, setTvPage] = useState(1);
  const [animePage, setAnimePage] = useState(1);
  const [movieHasMore, setMovieHasMore] = useState(true);
  const [tvHasMore, setTvHasMore] = useState(true);
  const [animeHasMore, setAnimeHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollRestored, setScrollRestored] = useState(false);
  
  // Observer for infinite scrolling
  const observer = useRef();
  // Separate ref for the observer trigger element
  const observerTriggerRef = useRef(null);

  // Debug logging - add this temporarily to see what's happening
  useEffect(() => {
    console.log('State changed:', { 
      activeTab, 
      moviesCount: movies.length, 
      tvShowsCount: tvShows.length, 
      animeCount: anime.length,
      searchResults: !!searchState.results 
    });
  }, [activeTab, movies.length, tvShows.length, anime.length, searchState.results]);

  // Save scroll position when component unmounts or user navigates away
  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollPosition = window.scrollY;
      sessionStorage.setItem(`landingScrollPosition_${activeTab}`, scrollPosition.toString());
    };

    // Save scroll position on beforeunload and visibilitychange
    const handleBeforeUnload = () => saveScrollPosition();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition();
      }
    };

    // Also save periodically while scrolling (throttled)
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition();
      }, 100); // Throttle to every 100ms
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll);

    return () => {
      saveScrollPosition(); // Save on component unmount
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeTab]);

  // Restore scroll position after content loads
  useEffect(() => {
    if (!loading && !scrollRestored && (movies.length > 0 || tvShows.length > 0 || anime.length > 0)) {
      const savedScrollPosition = sessionStorage.getItem(`landingScrollPosition_${activeTab}`);
      if (savedScrollPosition) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScrollPosition, 10));
          setScrollRestored(true);
        });
      } else {
        setScrollRestored(true);
      }
    }
  }, [loading, movies.length, tvShows.length, anime.length, scrollRestored, activeTab]);

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
        // Completely reset all arrays to prevent contamination
        setMovies([...movieResponse.data.results]);
        setTvShows([...tvResponse.data.results]);
        setAnime([...animeResponse.data.data]);
        setMoviePage(1);
        setTvPage(1);
        setAnimePage(1);
      } else {
        setMovies(prev => [...prev, ...movieResponse.data.results]);
        setTvShows(prev => [...prev, ...tvResponse.data.results]);
        setAnime(prev => [...prev, ...animeResponse.data.data]);
        setMoviePage(pageNum);
        setTvPage(pageNum);
        setAnimePage(pageNum);
      }
      
      // Check if we have more content to load for each type
      const hasMoreMovies = movieResponse.data.page < movieResponse.data.total_pages;
      const hasMoreTv = tvResponse.data.page < tvResponse.data.total_pages;
      const hasMoreAnime = animeResponse.data.pagination?.has_next_page;
      
      setMovieHasMore(hasMoreMovies);
      setTvHasMore(hasMoreTv);
      setAnimeHasMore(hasMoreAnime);
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
        movies: [...(searchState.results?.movies || []), ...movieResponse.data.results],
        tvShows: [...(searchState.results?.tvShows || []), ...tvResponse.data.results],
        anime: [...(searchState.results?.anime || []), ...animeResponse.data.data]
      };

      updateSearchState({
        results: newResults,
        page: pageNum,
        query: searchState.query
      });

      // Update local state to match search results
      setMovies([...newResults.movies]);
      setTvShows([...newResults.tvShows]);
      setAnime([...newResults.anime]);
      
    } catch (error) {
      console.error("Error loading more search results:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Fetch more content for a specific tab only
  const fetchMoreForTab = async (tab, pageNum) => {
    setIsLoadingMore(true);
    
    try {
      let response;
      
      switch (tab) {
        case 'movies':
          response = await axios.get(`${POPULAR_MOVIES_URL}&page=${pageNum}`);
          setMovies(prev => [...prev, ...response.data.results]);
          setMoviePage(pageNum);
          setMovieHasMore(response.data.page < response.data.total_pages);
          break;
        case 'tvShows':
          response = await axios.get(`${POPULAR_TV_URL}&page=${pageNum}`);
          setTvShows(prev => [...prev, ...response.data.results]);
          setTvPage(pageNum);
          setTvHasMore(response.data.page < response.data.total_pages);
          break;
        case 'anime':
          response = await axios.get(`${POPULAR_ANIME_URL}?page=${pageNum}`);
          setAnime(prev => [...prev, ...response.data.data]);
          setAnimePage(pageNum);
          setAnimeHasMore(response.data.pagination?.has_next_page);
          break;
      }
    } catch (error) {
      console.error(`Error fetching more ${tab}:`, error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load more content for specific tab
  const loadMoreForActiveTab = useCallback(() => {
    if (isLoadingMore) return;
    
    if (searchState.results) {
      // For search results, load more of all types
      const nextPage = (searchState.page || 1) + 1;
      fetchMoreSearchResults(nextPage);
    } else {
      // For popular content, load more based on active tab
      let nextPage, hasMoreForTab;
      
      switch (activeTab) {
        case 'movies':
          if (!movieHasMore) return;
          nextPage = moviePage + 1;
          hasMoreForTab = movieHasMore;
          break;
        case 'tvShows':
          if (!tvHasMore) return;
          nextPage = tvPage + 1;
          hasMoreForTab = tvHasMore;
          break;
        case 'anime':
          if (!animeHasMore) return;
          nextPage = animePage + 1;
          hasMoreForTab = animeHasMore;
          break;
        default:
          return;
      }
      
      if (hasMoreForTab) {
        fetchMoreForTab(activeTab, nextPage);
      }
    }
  }, [activeTab, moviePage, tvPage, animePage, movieHasMore, tvHasMore, animeHasMore, searchState.results, searchState.page, isLoadingMore]);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    if (loading) return;
    
    // Disconnect existing observer
    if (observer.current) {
      observer.current.disconnect();
    }
    
    // Determine if current tab has more content
    let currentTabHasMore;
    if (searchState.results) {
      // For search results, check if any category has more content
      currentTabHasMore = true; // Simplified for search results
    } else {
      switch (activeTab) {
        case 'movies':
          currentTabHasMore = movieHasMore;
          break;
        case 'tvShows':
          currentTabHasMore = tvHasMore;
          break;
        case 'anime':
          currentTabHasMore = animeHasMore;
          break;
        default:
          currentTabHasMore = false;
      }
    }
    
    // Only create observer if current tab has more content
    if (currentTabHasMore) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMoreForActiveTab();
        }
      }, { 
        threshold: 0.5,
        rootMargin: '100px'
      });
      
      // Observe the trigger element if it exists
      if (observerTriggerRef.current) {
        observer.current.observe(observerTriggerRef.current);
      }
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loadMoreForActiveTab, movieHasMore, tvHasMore, animeHasMore, activeTab, isLoadingMore, loading, searchState.results]);

  const handleShowPopular = async () => {
    setLoading(true);
    clearSearch();
    
    // Clear all content first to prevent contamination
    setMovies([]);
    setTvShows([]);
    setAnime([]);
    
    await fetchPopularContent(1, true);
    
    // Clear saved scroll positions
    sessionStorage.removeItem('landingScrollPosition_movies');
    sessionStorage.removeItem('landingScrollPosition_tvShows');
    sessionStorage.removeItem('landingScrollPosition_anime');
    setScrollRestored(false);
    
    // Reset to page 1
    window.scrollTo(0, 0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear scroll position when changing tabs so user starts at top
    sessionStorage.removeItem(`landingScrollPosition_${tab}`);
    setScrollRestored(false);
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    // Force re-render by using activeTab in the key and be very explicit about which data to show
    let items = [];
    let currentData = [];
    
    if (searchState.results) {
      // For search results
      switch (activeTab) {
        case 'movies':
          currentData = searchState.results.movies || [];
          items = currentData.map((movie, index) => (
            <MovieCard key={`search-movie-${movie.id}-${index}`} movie={movie} />
          ));
          break;
        case 'tvShows':
          currentData = searchState.results.tvShows || [];
          items = currentData.map((show, index) => (
            <TvShowCard key={`search-tv-${show.id}-${index}`} show={show} />
          ));
          break;
        case 'anime':
          currentData = searchState.results.anime || [];
          items = currentData.map((animeItem, index) => (
            <AnimeCard key={`search-anime-${animeItem.mal_id}-${index}`} anime={animeItem} />
          ));
          break;
      }
    } else {
      // For popular content - be very explicit about which array to use
      switch (activeTab) {
        case 'movies':
          currentData = movies;
          items = movies.map((movie, index) => (
            <MovieCard key={`popular-movie-${movie.id}-${index}`} movie={movie} />
          ));
          break;
        case 'tvShows':
          currentData = tvShows;
          items = tvShows.map((show, index) => (
            <TvShowCard key={`popular-tv-${show.id}-${index}`} show={show} />
          ));
          break;
        case 'anime':
          currentData = anime;
          items = anime.map((animeItem, index) => (
            <AnimeCard key={`popular-anime-${animeItem.mal_id}-${index}`} anime={animeItem} />
          ));
          break;
      }
    }
    
    return (
      <>
        <div key={`content-${activeTab}`} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {items}
        </div>
        
        {/* Invisible trigger element for infinite scroll */}
        {(() => {
          let currentTabHasMore;
          if (searchState.results) {
            currentTabHasMore = currentData.length > 0; // Simplified for search results
          } else {
            switch (activeTab) {
              case 'movies':
                currentTabHasMore = movieHasMore;
                break;
              case 'tvShows':
                currentTabHasMore = tvHasMore;
                break;
              case 'anime':
                currentTabHasMore = animeHasMore;
                break;
              default:
                currentTabHasMore = false;
            }
          }
          
          return currentTabHasMore && !loading && currentData.length > 0 ? (
            <div 
              ref={observerTriggerRef}
              key={`trigger-${activeTab}`}
              className="h-4 w-full mt-8"
              style={{ visibility: 'hidden' }}
            />
          ) : null;
        })()}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-200">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
        <div className="relative flex space-x-2 bg-white rounded-lg p-1 shadow-sm">
          {/* Tab Buttons */}
          <button
            onClick={() => handleTabChange('movies')}
            className={`px-4 py-2 rounded-md transition-colors duration-300 ease-in-out ${
              activeTab === 'movies'
                ? 'bg-red-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => handleTabChange('tvShows')}
            className={`px-4 py-2 rounded-md transition-colors duration-300 ease-in-out ${
              activeTab === 'tvShows'
                ? 'bg-red-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            TV Shows
          </button>
          <button
            onClick={() => handleTabChange('anime')}
            className={`px-4 py-2 rounded-md transition-colors duration-300 ease-in-out ${
              activeTab === 'anime'
                ? 'bg-red-500 text-white'
                : 'text-gray-700 hover:bg-gray-100'
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