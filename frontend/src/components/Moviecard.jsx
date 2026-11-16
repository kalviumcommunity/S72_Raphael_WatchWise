//eslint-disable-next-line
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Info } from 'lucide-react';
import axios from 'axios';

const movieDetailsCache = new Map();

const MovieCard = ({ movie }) => {
    const navigate = useNavigate();
    const [details, setDetails] = useState(movie);

    useEffect(() => {
        setDetails(movie);
    }, [movie]);

    useEffect(() => {
        const id = movie?.id || movie?.movieId;
        if (!id) return;

        // If overview and release_date are already provided (such as on Discover/Search), no extra API call needed!
        if (movie.overview !== undefined && movie.release_date !== undefined) {
            return;
        }

        if (movieDetailsCache.has(id)) {
            const cached = movieDetailsCache.get(id);
            setDetails(prev => ({
                ...prev,
                ...cached,
                poster_path: prev?.poster_path || cached.poster_path,
                title: prev?.title || cached.title
            }));
            return;
        }

        let isMounted = true;
        const fetchDetails = async () => {
            try {
                const apiKey = import.meta.env.VITE_TMDB_API_KEY || "0ace2af581de1152e9f38a6c477220b8";
                const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}`, {
                    timeout: 6000
                });
                if (response.data) {
                    movieDetailsCache.set(id, response.data);
                    if (isMounted) {
                        setDetails(prev => ({
                            ...prev,
                            ...response.data,
                            poster_path: prev?.poster_path || response.data.poster_path,
                            title: prev?.title || response.data.title,
                            vote_average: response.data.vote_average || prev?.vote_average
                        }));
                    }
                }
            } catch (err) {
                // Silently ignore if TMDB cannot fetch
            }
        };

        fetchDetails();
        return () => {
            isMounted = false;
        };
    }, [movie?.id, movie?.movieId, movie?.overview, movie?.release_date, movie?.vote_average]);

    const displayMovie = details || movie;
    const movieId = displayMovie?.id || movie?.id || movie?.movieId;
    const releaseYear = displayMovie?.release_date ? displayMovie.release_date.split('-')[0] : 'TBA';
    const ratingValue = displayMovie?.vote_average && displayMovie.vote_average > 0
        ? displayMovie.vote_average.toFixed(1)
        : (movie?.rating && movie.rating > 0 ? Number(movie.rating).toFixed(1) : 'TBD');

    return (
        <div 
            className="group relative rounded-md overflow-hidden cursor-pointer
                     w-full h-full transition-all duration-300 ease-in-out
                     hover:scale-105 hover:z-20 shadow-lg"
            onClick={() => navigate(`/movie/${movieId}`)}
        >
            {/* Image Container */}
            <div className="w-full pb-[150%] relative bg-gray-900">
                <img 
                    src={displayMovie.poster_path ? `https://image.tmdb.org/t/p/w500${displayMovie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgZmlsbD0iIzExMTExMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='} 
                    alt={displayMovie.title}
                    className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-60"
                />
                
                {/* User Personal Rating Badge */}
                {movie?.rating > 0 && (
                    <div className="absolute top-2 left-2 bg-black/85 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-500/60 shadow-md z-10">
                        <span className="text-[10px] text-amber-400 font-bold">
                            ★ {movie.rating / 2}/5
                        </span>
                    </div>
                )}

                {/* Resting badge - top right IMDb badge instead of star */}
                <div className="absolute top-2 right-2 bg-black/80 px-1.5 py-0.5 rounded flex items-center gap-1 border border-gray-800">
                    <span className="bg-[#f5c518] text-black font-black text-[9px] px-1 py-0.2 rounded font-mono">
                        IMDb
                    </span>
                    <span className="text-[11px] text-white font-bold">
                        {ratingValue}
                    </span>
                </div>

                {/* Amazon Prime Video Style Full Hover Overlay - no blur */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3.5 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                    {/* Movie Title */}
                    <h3 className="font-extrabold text-white text-sm leading-snug mb-1 drop-shadow line-clamp-2">
                        {displayMovie.title}
                    </h3>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-2 text-[11px] text-gray-300 mb-1.5">
                        <span className="text-gray-300 font-medium">
                            {releaseYear}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-400 font-bold">
                            <span className="bg-[#f5c518] text-black font-black text-[9px] px-1 py-0.2 rounded font-mono">
                                IMDb
                            </span>
                            {ratingValue}
                        </span>
                        <span className="border border-gray-600 text-gray-300 text-[9px] px-1 py-0.2 rounded font-medium">
                            16+
                        </span>
                    </div>

                    {/* Full Description - Scrollable so it never gets cut off */}
                    <div className="max-h-24 overflow-y-auto pr-1 text-[11px] text-gray-200 leading-relaxed font-normal scrollbar-thin mb-2">
                        {displayMovie.overview || 'No overview available.'}
                    </div>

                    {/* Action Buttons (NO "start watching" play button) */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            title="Add to Watchlist"
                            className="w-7 h-7 rounded-full border border-gray-500 bg-gray-900/80 hover:bg-gray-800 hover:border-white text-white flex items-center justify-center transition-all duration-200"
                            onClick={() => navigate(`/movie/${movieId}`)}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            title="More Info"
                            className="w-7 h-7 rounded-full border border-gray-500 bg-gray-900/80 hover:bg-gray-800 hover:border-white text-white flex items-center justify-center transition-all duration-200"
                            onClick={() => navigate(`/movie/${movieId}`)}
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Hover shadow effect */}
            <div className="absolute inset-0 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-md" 
                 style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)' }} />
        </div>
    );
};

export default MovieCard;