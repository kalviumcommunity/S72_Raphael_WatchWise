//eslint-disable-next-line
import React from 'react'
import { useNavigate } from 'react-router-dom'

const MovieCard = ({ movie }) => {
    const navigate = useNavigate();
    
    return (
        <div 
            className="group relative rounded-md overflow-hidden cursor-pointer
                     w-full h-full transition-all duration-300 ease-in-out
                     hover:scale-110 hover:z-10"
            onClick={() => navigate(`/movie/${movie.id}`)}
        >
            {/* Image Container */}
            <div className="w-full pb-[150%] relative bg-gray-900">
                <img 
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9Ijc1MCIgZmlsbD0iIzExMTExMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='} 
                    alt={movie.title}
                    className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                />
                
                {/* Gradient overlay that appears on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Rating badge - top right */}
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-yellow-400 text-xs">⭐</span>
                    <span className="text-xs text-white font-semibold">
                        {movie.vote_average?.toFixed(1) || 'N/A'}
                    </span>
                </div>
            </div>

            {/* Content Container - appears on hover */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/90 to-transparent
                          transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                {/* Title */}
                <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2">
                    {movie.title}
                </h3>

                {/* Info Row */}
                <div className="flex items-center justify-between text-xs text-gray-300">
                    <span className="font-medium">
                        {movie.release_date?.split('-')[0] || 'TBA'}
                    </span>
                    
                    {/* Play button icon */}
                    <button 
                        className="flex items-center gap-1 bg-white text-black px-3 py-1 rounded-full hover:bg-gray-200 transition-colors duration-200 font-semibold"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/movie/${movie.id}`);
                        }}
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span className="text-xs">Info</span>
                    </button>
                </div>
            </div>

            {/* Hover shadow effect */}
            <div className="absolute inset-0 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-md" 
                 style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)' }} />
        </div>
    );
};

export default MovieCard;