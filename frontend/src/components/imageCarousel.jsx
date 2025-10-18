import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 opacity-0 translate-y-6 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                    <h3 className="text-2xl font-bold mb-2 text-white">{movie.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-300 mb-2">
                      <span>⭐ {movie.vote_average?.toFixed(1)}</span>
                      <span>📅 {movie.release_date?.slice(0, 4)}</span>
                    </div>
                    <p className="text-sm text-gray-200 line-clamp-2">
                      {movie.overview}
                    </p>
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