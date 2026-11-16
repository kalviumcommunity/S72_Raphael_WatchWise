import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Info } from 'lucide-react';

const ImageCarousel = ({ movies }) => {
  const navigate = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselIntervalRef = useRef(null);

  // Auto-rotate carousel
  useEffect(() => {
    if (movies.length > 0) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % movies.length);
      }, 5000);
    }
    
    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [movies.length]);

  const handleCarouselPrev = () => {
    setCarouselIndex(prev => 
      prev === 0 ? movies.length - 1 : prev - 1
    );
    // Reset auto-rotate timer
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
    }
    carouselIntervalRef.current = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % movies.length);
    }, 5000);
  };

  const handleCarouselNext = () => {
    setCarouselIndex(prev => (prev + 1) % movies.length);
    // Reset auto-rotate timer
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
    }
    carouselIntervalRef.current = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % movies.length);
    }, 5000);
  };

  if (movies.length === 0) {
    return null;
  }

  return (
    <div className="mb-12 w-full">
      <div className="flex justify-center px-4 md:px-8">
        <div className="relative w-full max-w-6xl">
          <div className="flex items-center justify-center gap-6">
            {/* Previous Image - Clickable */}
            <div
              className="hidden md:block flex-shrink-0 w-64 h-36 rounded-lg overflow-hidden opacity-60 hover:opacity-100 transition cursor-pointer"
              onClick={handleCarouselPrev}
            >
              <img
                src={`https://image.tmdb.org/t/p/w500${movies[(carouselIndex - 1 + movies.length) % movies.length].backdrop_path}`}
                alt="Previous"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Main Image */}
            <div
              onClick={() => navigate(`/movie/${movies[carouselIndex].id}`)}
              className="relative w-full md:w-[56.25%] aspect-video rounded-lg overflow-hidden group flex-shrink-0 cursor-pointer"
            >
              {movies.map((movie, index) => (
                <div
                  key={movie.id}
                  className={`absolute w-full h-full transition-all duration-700 ${
                    index === carouselIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle ambient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Amazon Prime Video Style Hover Overlay - no blur, sharp background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-6 md:p-8 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out">
                    {/* Movie Title */}
                    <h3 className="text-xl md:text-3xl font-extrabold text-white tracking-tight mb-2 drop-shadow">
                      {movie.title}
                    </h3>

                    {/* Prime Video Metadata Row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-300 mb-3">
                      {/* IMDb Badge replacing Star */}
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#f5c518] text-black font-black text-xs px-1.5 py-0.5 rounded font-mono tracking-tighter">
                          IMDb
                        </span>
                        <span className="text-white font-bold">
                          {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </span>
                      </div>

                      {/* Release Year */}
                      <span className="text-gray-300 font-medium">
                        {movie.release_date?.slice(0, 4) || 'TBA'}
                      </span>

                      {/* Age Badge */}
                      <span className="border border-gray-600 text-gray-300 text-[10px] md:text-xs px-1.5 py-0.5 rounded font-medium">
                        16+
                      </span>

                      {/* Prime Video Action Buttons (NO "start watching" play button) */}
                      <div className="flex items-center gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Add to Watchlist"
                          className="w-8 h-8 rounded-full border border-gray-500 bg-gray-900/70 hover:bg-gray-800 hover:border-white text-white flex items-center justify-center transition-all duration-200"
                          onClick={() => navigate(`/movie/${movie.id}`)}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="More Info"
                          className="w-8 h-8 rounded-full border border-gray-500 bg-gray-900/70 hover:bg-gray-800 hover:border-white text-white flex items-center justify-center transition-all duration-200"
                          onClick={() => navigate(`/movie/${movie.id}`)}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Movie Full Description - Never Cut Off */}
                    <div className="max-h-24 sm:max-h-32 md:max-h-40 overflow-y-auto pr-2 text-xs md:text-sm text-gray-200 leading-relaxed font-normal scrollbar-thin">
                      {movie.overview || 'No overview available.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Image - Clickable */}
            <div
              className="hidden md:block flex-shrink-0 w-64 h-36 rounded-lg overflow-hidden opacity-60 hover:opacity-100 transition cursor-pointer"
              onClick={handleCarouselNext}
            >
              <img
                src={`https://image.tmdb.org/t/p/w500${movies[(carouselIndex + 1) % movies.length].backdrop_path}`}
                alt="Next"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {movies.map((_, index) => (
              <button
                key={index}
                onClick={() => setCarouselIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === carouselIndex ? 'bg-red-500' : 'bg-white/50 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;