import React from 'react';
import { useNavigate } from 'react-router-dom';

const TvShowCard = ({ show }) => {
    const navigate = useNavigate();
    
    return (
        <div 
            className="group relative bg-white rounded-xl overflow-hidden cursor-pointer
                     w-full h-full transition-all duration-300
                     hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                     hover:-translate-y-1"
            onClick={() => navigate(`/tv/${show.id}`)}
        >
            {/* Image Container */}
            <div className="w-full pb-[150%] relative">
                <img 
                    src={show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='} 
                    alt={show.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                />
            </div>

            {/* Content Container */}
            <div className="absolute bottom-0 left-0 right-0 bg-white p-3">
                {/* Title */}
                <h3 className="font-semibold text-gray-800 text-sm line-clamp-1 mb-1">
                    {show.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm text-gray-600">
                            {show.vote_average?.toFixed(1) || 'N/A'}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500">
                        {show.first_air_date?.split('-')[0] || 'TBA'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TvShowCard; 