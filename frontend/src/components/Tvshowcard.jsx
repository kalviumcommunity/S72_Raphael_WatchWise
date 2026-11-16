import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const tvDetailsCache = new Map();

const TvShowCard = ({ show }) => {
    const navigate = useNavigate();
    const [details, setDetails] = useState(show);

    useEffect(() => {
        setDetails(show);
    }, [show]);

    useEffect(() => {
        const id = show?.id || show?.showId;
        if (!id) return;

        if (show.first_air_date !== undefined) {
            return;
        }

        if (tvDetailsCache.has(id)) {
            const cached = tvDetailsCache.get(id);
            setDetails(prev => ({
                ...prev,
                ...cached,
                poster_path: prev?.poster_path || cached.poster_path,
                name: prev?.name || cached.name
            }));
            return;
        }

        let isMounted = true;
        const fetchDetails = async () => {
            try {
                const apiKey = import.meta.env.VITE_TMDB_API_KEY || "0ace2af581de1152e9f38a6c477220b8";
                const response = await axios.get(`https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}`, {
                    timeout: 6000
                });
                if (response.data) {
                    tvDetailsCache.set(id, response.data);
                    if (isMounted) {
                        setDetails(prev => ({
                            ...prev,
                            ...response.data,
                            poster_path: prev?.poster_path || response.data.poster_path,
                            name: prev?.name || response.data.name,
                            vote_average: response.data.vote_average || prev?.vote_average
                        }));
                    }
                }
            } catch (err) {
                // Silently ignore
            }
        };

        fetchDetails();
        return () => {
            isMounted = false;
        };
    }, [show?.id, show?.showId, show?.first_air_date, show?.vote_average]);

    const displayShow = details || show;
    const showId = displayShow?.id || show?.id || show?.showId;
    const airYear = displayShow?.first_air_date ? displayShow.first_air_date.split('-')[0] : 'TBA';
    const ratingValue = displayShow?.vote_average && displayShow.vote_average > 0
        ? displayShow.vote_average.toFixed(1)
        : (show?.rating && show.rating > 0 ? Number(show.rating).toFixed(1) : 'TBD');

    return (
        <div 
            className="group relative bg-[#2c3444] rounded-xl overflow-hidden cursor-pointer
                     w-full h-full transition-all duration-300
                     hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                     hover:-translate-y-1"
            onClick={() => navigate(`/tv/${showId}`)}
        >
            {/* Image Container */}
            <div className="w-full pb-[150%] relative">
                <img 
                    src={displayShow.poster_path ? `https://image.tmdb.org/t/p/w500${displayShow.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='} 
                    alt={displayShow.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                />
                {/* User Personal Rating Badge */}
                {show?.rating > 0 && (
                    <div className="absolute top-2 left-2 bg-black/85 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-500/60 shadow-md z-10">
                        <span className="text-[10px] text-amber-400 font-bold">
                            ★ {show.rating / 2}/5
                        </span>
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#2c3444] p-3">
                {/* Title */}
                <h3 className="font-semibold text-white text-sm line-clamp-1 mb-1">
                    {displayShow.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="bg-[#f5c518] text-black font-black text-[9px] px-1 py-0.2 rounded font-mono">IMDb</span>
                        <span className="text-sm text-white font-semibold">
                            {ratingValue}
                        </span>
                    </div>
                    <span className="text-xs text-gray-300">
                        {airYear}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TvShowCard; 