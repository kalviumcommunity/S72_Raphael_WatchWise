import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MovieCard from '../components/Moviecard';
import TvShowCard from '../components/Tvshowcard';
import AnimeCard from '../components/Animecard';
import Navbar from '../components/navbar';
import { useSearch } from '../context/SearchContext';
import ImageCarousel from '../components/imageCarousel';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || "0ace2af581de1152e9f38a6c477220b8";

const today = new Date().toISOString().split('T')[0];
const currentYear = new Date().getFullYear();
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// Regular discover page: dynamic discover (popular movies released in the last 90 days up to today)
const POPULAR_MOVIES_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&primary_release_date.gte=${ninetyDaysAgo}&primary_release_date.lte=${today}&sort_by=popularity.desc&include_adult=false&with_original_language=en`;
const POPULAR_TV_URL = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&include_adult=false&with_original_language=en`;
const POPULAR_ANIME_URL = "https://api.jikan.moe/v4/top/anime";
const SEARCH_MOVIES_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=`;
const SEARCH_TV_URL = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=`;
const SEARCH_ANIME_URL = "https://api.jikan.moe/v4/anime";

// Image carousel: most popular movies of this year (released between Jan 1 and today)
const CAROUSEL_MOVIES_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&primary_release_date.gte=${currentYear}-01-01&primary_release_date.lte=${today}&sort_by=popularity.desc&include_adult=false&with_original_language=en`;

/**
 * Strips duplicate media items by canonical ID (supports both TMDB id and Jikan mal_id).
 */
const deduplicateMedia = (items = []) => {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (!item) continue;
    const id = String(item.mal_id || item.id);
    if (!id || id === 'undefined' || id === 'null') continue;
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(item);
    }
  }
  return unique;
};

// Module-level in-memory cache for instant Discover page loads and zero-latency back-navigation
const popularCache = {
  movies: null,
  tvShows: null,
  anime: null,
  carousel: null,
  moviePage: 1,
  tvPage: 1,
  animePage: 1,
  movieHasMore: true,
  tvHasMore: true,
  animeHasMore: true,
  timestamp: 0
};

const Landing = () => {
  const navigate = useNavigate();
  const { searchState, updateSearchState, clearSearch } = useSearch();
  const [movies, setMovies] = useState(() => deduplicateMedia(popularCache.movies || []));
  const [tvShows, setTvShows] = useState(() => deduplicateMedia(popularCache.tvShows || []));
  const [anime, setAnime] = useState(() => deduplicateMedia(popularCache.anime || []));
  const [carouselMovies, setCarouselMovies] = useState(() => deduplicateMedia(popularCache.carousel || []));
  const [loading, setLoading] = useState(!popularCache.movies);
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'movies';
  });
  
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  
  const [moviePage, setMoviePage] = useState(popularCache.moviePage || 1);
  const [tvPage, setTvPage] = useState(popularCache.tvPage || 1);
  const [animePage, setAnimePage] = useState(popularCache.animePage || 1);
  const [movieHasMore, setMovieHasMore] = useState(popularCache.movieHasMore);
  const [tvHasMore, setTvHasMore] = useState(popularCache.tvHasMore);
  const [animeHasMore, setAnimeHasMore] = useState(popularCache.animeHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const fetchingPagesRef = useRef({
    movies: new Set(),
    tvShows: new Set(),
    anime: new Set()
  });
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
    if (popularCache.carousel && popularCache.carousel.length > 0) {
      setCarouselMovies(popularCache.carousel);
    }
    const fetchCarouselMovies = async () => {
      try {
        const response = await axios.get(CAROUSEL_MOVIES_URL, { timeout: 6000 });
        const validMovies = response.data.results.filter(movie => movie.backdrop_path);
        const topMovies = deduplicateMedia(validMovies).slice(0, 8);
        setCarouselMovies(topMovies);
        popularCache.carousel = topMovies;
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
        setMovies(deduplicateMedia(searchState.results.movies || []));
        setTvShows(deduplicateMedia(searchState.results.tvShows || []));
        setAnime(deduplicateMedia(searchState.results.anime || []));
        setLoading(false);
      } else {
        if (popularCache.movies && popularCache.movies.length > 0) {
          setMovies(deduplicateMedia(popularCache.movies));
          if (popularCache.tvShows) setTvShows(deduplicateMedia(popularCache.tvShows));
          if (popularCache.anime) setAnime(deduplicateMedia(popularCache.anime));
          setMoviePage(popularCache.moviePage || 1);
          setTvPage(popularCache.tvPage || 1);
          setAnimePage(popularCache.animePage || 1);
          setMovieHasMore(popularCache.movieHasMore);
          setTvHasMore(popularCache.tvHasMore);
          setAnimeHasMore(popularCache.animeHasMore);
          setLoading(false);
          // If cache is older than 5 minutes, refresh in background without showing loading screen
          if (Date.now() - popularCache.timestamp > 5 * 60 * 1000) {
            fetchPopularContent(1, false);
          }
        } else {
          await fetchPopularContent(1, true);
        }
      }
    };

    loadInitialContent();
  }, [searchState.results]);

  const fetchPopularContent = async (pageNum, isInitial = false) => {
    if (isInitial && (!popularCache.movies || popularCache.movies.length === 0)) {
      setLoading(true);
    } else if (!isInitial) {
      setIsLoadingMore(true);
    }

    // 1. Fetch Popular Movies (TMDB) - fastest (~350ms) and primary view
    const moviePromise = axios.get(`${POPULAR_MOVIES_URL}&page=${pageNum}`, { timeout: 6000 })
      .then(res => {
        const movieData = res.data;
        const newMovies = deduplicateMedia(movieData.results || []);
        if (isInitial || pageNum === 1) {
          setMovies(prev => {
            const remaining = prev.filter(m => !newMovies.some(nm => String(nm.id) === String(m.id)));
            const updated = deduplicateMedia([...newMovies, ...remaining]);
            popularCache.movies = updated;
            return updated;
          });
          setMoviePage(1);
          popularCache.moviePage = 1;
          popularCache.timestamp = Date.now();
        } else {
          setMovies(prev => {
            const updated = deduplicateMedia([...prev, ...newMovies]);
            popularCache.movies = updated;
            return updated;
          });
          setMoviePage(pageNum);
          popularCache.moviePage = pageNum;
        }
        const hasMore = movieData.page < movieData.total_pages;
        setMovieHasMore(hasMore);
        popularCache.movieHasMore = hasMore;
        // As soon as movies arrive, if the active tab is movies, unblock loading immediately!
        if (isInitial && activeTabRef.current === 'movies') {
          setLoading(false);
        }
      })
      .catch(err => {
        console.warn("Failed to fetch popular movies:", err?.message);
        if (isInitial && activeTabRef.current === 'movies') {
          setLoading(false);
        }
      });

    // 2. Fetch Popular TV Shows (TMDB) in parallel
    const tvPromise = axios.get(`${POPULAR_TV_URL}&page=${pageNum}`, { timeout: 6000 })
      .then(res => {
        const tvData = res.data;
        const newTv = deduplicateMedia(tvData.results || []);
        if (isInitial || pageNum === 1) {
          setTvShows(prev => {
            const remaining = prev.filter(s => !newTv.some(nt => String(nt.id) === String(s.id)));
            const updated = deduplicateMedia([...newTv, ...remaining]);
            popularCache.tvShows = updated;
            return updated;
          });
          setTvPage(1);
          popularCache.tvPage = 1;
        } else {
          setTvShows(prev => {
            const updated = deduplicateMedia([...prev, ...newTv]);
            popularCache.tvShows = updated;
            return updated;
          });
          setTvPage(pageNum);
          popularCache.tvPage = pageNum;
        }
        const hasMore = tvData.page < tvData.total_pages;
        setTvHasMore(hasMore);
        popularCache.tvHasMore = hasMore;
        if (isInitial && activeTabRef.current === 'tvShows') {
          setLoading(false);
        }
      })
      .catch(err => {
        console.warn("Failed to fetch popular TV shows:", err?.message);
        if (isInitial && activeTabRef.current === 'tvShows') {
          setLoading(false);
        }
      });

    // 3. Fetch Anime (Jikan) in background with 3.5s timeout (never blocks Movies/TV)
    const animePromise = axios.get(`${POPULAR_ANIME_URL}?page=${pageNum}`, { timeout: 3500 })
      .then(res => {
        const animeData = res.data;
        const newAnime = deduplicateMedia(animeData.data || []);
        if (isInitial || pageNum === 1) {
          setAnime(prev => {
            const remaining = prev.filter(a => !newAnime.some(na => String(na.mal_id) === String(a.mal_id)));
            const updated = deduplicateMedia([...newAnime, ...remaining]);
            popularCache.anime = updated;
            return updated;
          });
          setAnimePage(1);
          popularCache.animePage = 1;
        } else {
          setAnime(prev => {
            const updated = deduplicateMedia([...prev, ...newAnime]);
            popularCache.anime = updated;
            return updated;
          });
          setAnimePage(pageNum);
          popularCache.animePage = pageNum;
        }
        const hasMore = animeData.pagination?.has_next_page || false;
        setAnimeHasMore(hasMore);
        popularCache.animeHasMore = hasMore;
        if (isInitial && activeTabRef.current === 'anime') {
          setLoading(false);
        }
      })
      .catch(err => {
        console.warn("Anime API timed out or unavailable:", err?.message);
        if (isInitial && activeTabRef.current === 'anime') {
          setLoading(false);
        }
      });

    // Await only the active tab's specific fetch so Discover renders in ~350ms!
    try {
      if (activeTabRef.current === 'movies') {
        await moviePromise;
      } else if (activeTabRef.current === 'tvShows') {
        await tvPromise;
      } else {
        await animePromise;
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const fetchMoreSearchResults = async (pageNum) => {
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const encoded = encodeURIComponent(searchState.query || "");
      const [movieResult, tvResult, animeResult] = await Promise.allSettled([
        axios.get(`${SEARCH_MOVIES_URL}${encoded}&page=${pageNum}`, { timeout: 10000 }),
        axios.get(`${SEARCH_TV_URL}${encoded}&page=${pageNum}`, { timeout: 10000 }),
        axios.get(SEARCH_ANIME_URL, {
          params: {
            q: searchState.query,
            page: pageNum,
            sfw: true
          },
          timeout: 8000
        })
      ]);

      const moviesList = movieResult.status === 'fulfilled' ? (movieResult.value.data.results || []) : [];
      const tvShowsList = tvResult.status === 'fulfilled' ? (tvResult.value.data.results || []) : [];
      const animeList = animeResult.status === 'fulfilled' ? (animeResult.value.data.data || []) : [];

      const newResults = {
        movies: deduplicateMedia([...(searchState.results?.movies || []), ...moviesList]),
        tvShows: deduplicateMedia([...(searchState.results?.tvShows || []), ...tvShowsList]),
        anime: deduplicateMedia([...(searchState.results?.anime || []), ...animeList])
      };

      updateSearchState({
        results: newResults,
        page: pageNum,
        query: searchState.query
      });

      setMovies(newResults.movies);
      setTvShows(newResults.tvShows);
      setAnime(newResults.anime);
      
    } catch (error) {
      console.error("Error loading more search results:", error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  const fetchMoreForTab = async (tab, pageNum) => {
    if (isLoadingMoreRef.current) return;
    if (fetchingPagesRef.current[tab]?.has(pageNum)) return;

    isLoadingMoreRef.current = true;
    fetchingPagesRef.current[tab]?.add(pageNum);
    setIsLoadingMore(true);
    
    try {
      let response;
      
      switch (tab) {
        case 'movies': {
          response = await axios.get(`${POPULAR_MOVIES_URL}&page=${pageNum}`);
          const incoming = response.data?.results || [];
          setMovies(prev => {
            const updated = deduplicateMedia([...prev, ...incoming]);
            popularCache.movies = updated;
            return updated;
          });
          setMoviePage(pageNum);
          popularCache.moviePage = pageNum;
          const hasMore = response.data.page < response.data.total_pages;
          setMovieHasMore(hasMore);
          popularCache.movieHasMore = hasMore;
          break;
        }
        case 'tvShows': {
          response = await axios.get(`${POPULAR_TV_URL}&page=${pageNum}`);
          const incoming = response.data?.results || [];
          setTvShows(prev => {
            const updated = deduplicateMedia([...prev, ...incoming]);
            popularCache.tvShows = updated;
            return updated;
          });
          setTvPage(pageNum);
          popularCache.tvPage = pageNum;
          const hasMore = response.data.page < response.data.total_pages;
          setTvHasMore(hasMore);
          popularCache.tvHasMore = hasMore;
          break;
        }
        case 'anime': {
          response = await axios.get(`${POPULAR_ANIME_URL}?page=${pageNum}`, { timeout: 4000 });
          const incoming = response.data?.data || [];
          setAnime(prev => {
            const updated = deduplicateMedia([...prev, ...incoming]);
            popularCache.anime = updated;
            return updated;
          });
          setAnimePage(pageNum);
          popularCache.animePage = pageNum;
          const hasMore = response.data.pagination?.has_next_page || false;
          setAnimeHasMore(hasMore);
          popularCache.animeHasMore = hasMore;
          break;
        }
      }
    } catch (error) {
      console.error(`Error fetching more ${tab}:`, error);
    } finally {
      isLoadingMoreRef.current = false;
      fetchingPagesRef.current[tab]?.delete(pageNum);
      setIsLoadingMore(false);
    }
  };

  const loadMoreForActiveTab = useCallback(() => {
    if (isLoadingMoreRef.current || isLoadingMore) return;
    
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
    popularCache.movies = null;
    popularCache.tvShows = null;
    popularCache.anime = null;
    popularCache.moviePage = 1;
    popularCache.tvPage = 1;
    popularCache.animePage = 1;
    
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

    // If switching to a tab that hasn't loaded yet, load page 1 for that tab
    if (tab === 'tvShows' && tvShows.length === 0) {
      fetchMoreForTab('tvShows', 1);
    } else if (tab === 'anime' && anime.length === 0) {
      fetchMoreForTab('anime', 1);
    }
  };

  const renderContent = () => {
    let items = [];
    let currentData = [];
    
    if (searchState.results) {
      switch (activeTab) {
        case 'movies':
          currentData = deduplicateMedia(searchState.results.movies || []);
          items = currentData.map((movie) => (
            <MovieCard key={`search-movie-${movie.id}`} movie={movie} />
          ));
          break;
        case 'tvShows':
          currentData = deduplicateMedia(searchState.results.tvShows || []);
          items = currentData.map((show) => (
            <TvShowCard key={`search-tv-${show.id}`} show={show} />
          ));
          break;
        case 'anime':
          currentData = deduplicateMedia(searchState.results.anime || []);
          items = currentData.map((animeItem) => (
            <AnimeCard key={`search-anime-${animeItem.mal_id}`} anime={animeItem} />
          ));
          break;
      }
    } else {
      switch (activeTab) {
        case 'movies':
          currentData = deduplicateMedia(movies);
          items = currentData.map((movie) => (
            <MovieCard key={`popular-movie-${movie.id}`} movie={movie} />
          ));
          break;
        case 'tvShows':
          currentData = deduplicateMedia(tvShows);
          items = currentData.map((show) => (
            <TvShowCard key={`popular-tv-${show.id}`} show={show} />
          ));
          break;
        case 'anime':
          currentData = deduplicateMedia(anime);
          items = currentData.map((animeItem) => (
            <AnimeCard key={`popular-anime-${animeItem.mal_id}`} anime={animeItem} />
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