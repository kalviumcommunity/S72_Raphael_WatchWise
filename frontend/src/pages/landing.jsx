import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MovieCard from '../components/Moviecard';
import TvShowCard from '../components/Tvshowcard';
import AnimeCard from '../components/Animecard';
import Navbar from '../components/navbar';
import { useSearch } from '../context/SearchContext';
import ImageCarousel from '../components/imageCarousel';

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const POPULAR_MOVIES_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&include_adult=false&with_original_language=en`;
const POPULAR_TV_URL = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&include_adult=false&with_original_language=en`;
const POPULAR_ANIME_URL = "https://api.jikan.moe/v4/top/anime";
const SEARCH_MOVIES_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;
const SEARCH_TV_URL = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=`;
const SEARCH_ANIME_URL = "https://api.jikan.moe/v4/anime";
const latestYear = new Date().getFullYear();
const TOP_RATED_MOVIES_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=vote_average.desc&vote_count.gte=200&primary_release_date.gte=2024-01-01&include_adult=false&with_original_language=en`;

const Landing = () => {
  const navigate = useNavigate();
  const { searchState, updateSearchState, clearSearch } = useSearch();
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [anime, setAnime] = useState([]);
  const [carouselMovies, setCarouselMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'movies';
  });
  
  const [moviePage, setMoviePage] = useState(1);
  const [tvPage, setTvPage] = useState(1);
  const [animePage, setAnimePage] = useState(1);
  const [movieHasMore, setMovieHasMore] = useState(true);
  const [tvHasMore, setTvHasMore] = useState(true);
  const [animeHasMore, setAnimeHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollRestored, setScrollRestored] = useState(false);
  
  const observer = useRef();
  const observerTriggerRef = useRef(null);

  useEffect(() => {
    console.log('State changed:', { 
      activeTab, 
      moviesCount: movies.length, 
      tvShowsCount: tvShows.length, 
      animeCount: anime.length,
      searchResults: !!searchState.results 
    });
  }, [activeTab, movies.length, tvShows.length, anime.length, searchState.results]);

  useEffect(() => {
    const fetchCarouselMovies = async () => {
      try {
        const response = await axios.get(TOP_RATED_MOVIES_URL);
        const validMovies = response.data.results.filter(movie => movie.backdrop_path);
        setCarouselMovies(validMovies.slice(0, 8));
      } catch (error) {
        console.error("Error fetching carousel movies:", error);
      }
    };
    
    fetchCarouselMovies();
  }, []);

  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollPosition = window.scrollY;
      sessionStorage.setItem(`landingScrollPosition_${activeTab}`, scrollPosition.toString());
    };

    const handleBeforeUnload = () => saveScrollPosition();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScrollPosition();
      }
    };

    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition();
      }, 100);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll);

    return () => {
      saveScrollPosition();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!loading && !scrollRestored && (movies.length > 0 || tvShows.length > 0 || anime.length > 0)) {
      const savedScrollPosition = sessionStorage.getItem(`landingScrollPosition_${activeTab}`);
      if (savedScrollPosition) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScrollPosition, 10));
          setScrollRestored(true);
        });
      } else {
        setScrollRestored(true);
      }
    }
  }, [loading, movies.length, tvShows.length, anime.length, scrollRestored, activeTab]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
      const loadInitialContent = async () => {
        if (searchState.results) {
          setMovies(searchState.results.movies || []);
          setTvShows(searchState.results.tvShows || []);
          setAnime(searchState.results.anime || []);
          setLoading(false);
        } else {
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

      setMovies([...newResults.movies]);
      setTvShows([...newResults.tvShows]);
      setAnime([...newResults.anime]);
      
    } catch (error) {
      console.error("Error loading more search results:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  const loadMoreForActiveTab = useCallback(() => {
    if (isLoadingMore) return;
    
    if (searchState.results) {
      const nextPage = (searchState.page || 1) + 1;
      fetchMoreSearchResults(nextPage);
    } else {
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

  useEffect(() => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    let currentTabHasMore;
    if (searchState.results) {
      currentTabHasMore = true;
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
    
    if (currentTabHasMore) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMoreForActiveTab();
        }
      }, { 
        threshold: 0.5,
        rootMargin: '100px'
      });
      
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
    
    setMovies([]);
    setTvShows([]);
    setAnime([]);
    
    await fetchPopularContent(1, true);
    
    sessionStorage.removeItem('landingScrollPosition_movies');
    sessionStorage.removeItem('landingScrollPosition_tvShows');
    sessionStorage.removeItem('landingScrollPosition_anime');
    setScrollRestored(false);
    
    window.scrollTo(0, 0);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    sessionStorage.removeItem(`landingScrollPosition_${tab}`);
    setScrollRestored(false);
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    let items = [];
    let currentData = [];
    
    if (searchState.results) {
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
        <div key={`content-${activeTab}`} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items}
        </div>
        
        {(() => {
          let currentTabHasMore;
          if (searchState.results) {
            currentTabHasMore = currentData.length > 0;
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
<div className="min-h-screen bg-black">
  <Navbar />

  {/* Carousel Container with Netflix-style hero */}
  <div className="relative w-full pt-20">
    <ImageCarousel movies={carouselMovies} />
    {/* Gradient overlay for smooth transition */}
    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
  </div>

  <div className="container mx-auto px-4 pb-16">
    {/* Content Sections */}
    <div className="space-y-12">
      {/* Search Results Notice */}
      {searchState.results && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Search Results for <span className="text-blue-600">"{searchState.query}"</span>
            </h2>
          </div>
          <button
            onClick={handleShowPopular}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 font-semibold whitespace-nowrap"
          >
            Show Popular
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="relative flex items-center gap-2 border-b border-gray-700 overflow-x-auto pb-4">
      {['movies', 'tvShows', 'anime'].map((tab) => {
        const labels = { movies: 'Movies', tvShows: 'TV Shows', anime: 'Anime' };
        return (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`group relative px-6 py-3 font-semibold text-lg whitespace-nowrap transition-colors duration-300 ${
              activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {labels[tab]}
            <span
              className={`absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full transform transition-transform duration-300 ease-in-out ${
                activeTab === tab ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}
            />
          </button>
        );
      })}
    </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-600"></div>
            <p className="text-gray-400 text-sm">Loading content...</p>
          </div>
        </div>
      ) : (
        <div>
          {renderContent()}

          {/* Loading indicator at bottom */}
          {isLoadingMore && (
            <div className="mt-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-700 border-t-blue-600"></div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>
  );
};

export default Landing;