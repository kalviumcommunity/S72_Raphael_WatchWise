import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * MovieCoverCarousel
 *
 * Interactive movie artwork showcase for the movie details page:
 * - The main display image covers the entire rectangular frame edge-to-edge (no empty black borders)
 * - A smaller, smooth-scrolling image carousel sits directly beneath the main display
 * - Clicking any thumbnail in the smaller carousel changes the active main display image
 * - Auto-advances every 5s and smoothly centers the active thumbnail (pauses on hover)
 * - Directional chevrons on both the main frame and thumbnail carousel
 * - Clean flat look (100% emoji-free, no fullscreen button, no badge text like "main cover")
 * - Fits within the details column (w-80 sm:w-[340px])
 */
const MovieCoverCarousel = ({ images = [], title = 'Movie' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayRef = useRef(null);
  const thumbnailContainerRef = useRef(null);
  const activeThumbRef = useRef(null);
  const touchStartXRef = useRef(null);

  const numImages = images.length;

  // Auto-advance every 5 seconds when not hovered
  useEffect(() => {
    if (numImages <= 1 || isHovered) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % numImages);
    }, 5000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [numImages, isHovered]);

  // Keep active thumbnail smoothly scrolled into view inside the smaller carousel
  useEffect(() => {
    if (activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numImages]);

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (numImages <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? numImages - 1 : prev - 1));
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (numImages <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % numImages);
  };

  const scrollThumbnails = (direction) => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = direction === 'left' ? -120 : 120;
      thumbnailContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 35) {
      handleNext();
    } else if (diff < -35) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  if (!images || images.length === 0) {
    return (
      <div className="w-80 sm:w-[340px] max-w-full aspect-[2/3] rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center text-gray-500 shadow-xl">
        <span className="text-sm">No artwork available</span>
      </div>
    );
  }

  // Single image fallback
  if (images.length === 1) {
    const single = images[0];
    return (
      <div className="w-80 sm:w-[340px] max-w-full aspect-[2/3] rounded-2xl overflow-hidden bg-black/60 shadow-2xl border border-white/15 select-none">
        <img
          src={`https://image.tmdb.org/t/p/w780${single.file_path}`}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const currentImage = images[currentIndex] || images[0];

  return (
    <div
      className="w-80 sm:w-[340px] max-w-full flex flex-col select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Display Image Frame - Covers the Entire Rectangle */}
      <div
        className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/15 group"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Full-bleed active cover image */}
        <img
          key={currentImage.file_path}
          src={`https://image.tmdb.org/t/p/w780${currentImage.file_path}`}
          alt={`${title} - artwork ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300 ease-in-out select-none"
          draggable={false}
        />

        {/* Ambient Top & Bottom Gradients for clean contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

        {/* Artwork Counter Pill */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-black/75 text-gray-300 border border-white/20 backdrop-blur-md">
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        {/* Navigation Chevrons on Main Image */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all duration-150 opacity-80 hover:opacity-100 transform hover:scale-110 shadow-lg"
          title="Previous artwork"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md transition-all duration-150 opacity-80 hover:opacity-100 transform hover:scale-110 shadow-lg"
          title="Next artwork"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Smaller Image Carousel Beneath Main Display */}
      <div className="mt-3 relative w-full flex items-center">
        {/* Left Scroll Button for thumbnails (when more than 4 images) */}
        {numImages > 4 && (
          <button
            type="button"
            onClick={() => scrollThumbnails('left')}
            className="flex-shrink-0 mr-1 p-1 rounded-full bg-black/70 hover:bg-black text-gray-300 hover:text-white border border-white/20 backdrop-blur-md transition-colors"
            title="Scroll thumbnails left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Horizontal Scrollable Thumbnail Strip */}
        <div
          ref={thumbnailContainerRef}
          className="flex-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-1 px-0.5"
        >
          {images.map((img, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={`${img.file_path}-${idx}`}
                ref={isActive ? activeThumbRef : null}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/25 opacity-100 ring-1 ring-amber-400/50'
                    : 'border-white/10 opacity-55 hover:opacity-100 hover:border-white/30 hover:scale-[1.02]'
                }`}
                title={`Select artwork ${idx + 1}`}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w185${img.file_path}`}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button for thumbnails (when more than 4 images) */}
        {numImages > 4 && (
          <button
            type="button"
            onClick={() => scrollThumbnails('right')}
            className="flex-shrink-0 ml-1 p-1 rounded-full bg-black/70 hover:bg-black text-gray-300 hover:text-white border border-white/20 backdrop-blur-md transition-colors"
            title="Scroll thumbnails right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCoverCarousel;
