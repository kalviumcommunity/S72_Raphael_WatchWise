import React, { useState, useEffect } from 'react';
import Navbar from './navbar';

const LoadingScreen = ({ message = "Loading" }) => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#151a24] text-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[75vh]">
        {/* Animated Modern Dual-Ring Spinner */}
        <div className="relative w-16 h-16 mb-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-blue-500/15 blur-lg animate-pulse" />
          
          {/* Static Track */}
          <div className="w-full h-full rounded-full border-4 border-gray-700/40" />
          
          {/* Primary Spinning Arc */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin" />
          
          {/* Inner Counter-Rotating Ring */}
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-cyan-400 border-l-cyan-400 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
        </div>

        {/* Dynamic Loading Text with 0-3 cycling dots */}
        <p className="text-gray-300 font-medium text-lg tracking-wide flex items-center select-none">
          <span>{message}</span>
          <span className="inline-block text-left w-6 ml-0.5 text-blue-400 font-bold">
            {'.'.repeat(dotCount)}
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
