import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from '../components/navbar';

const API_KEY = "0ace2af581de1152e9f38a6c477220b8";
const TOP_RATED_MOVIES_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&sort_by=vote_average.desc&vote_count.gte=1000&with_original_language=en`;

const Login = ({ setIsAuthenticated }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [backgroundMovies, setBackgroundMovies] = useState([]);
    const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
    const navigate = useNavigate();

    // Fetch top rated movies for background carousel
    useEffect(() => {
        const fetchBackgroundMovies = async () => {
            try {
                const response = await axios.get(TOP_RATED_MOVIES_URL);
                const moviesWithBackdrops = response.data.results
                    .filter(movie => movie.backdrop_path)
                    .slice(0, 10);
                setBackgroundMovies(moviesWithBackdrops);
            } catch (error) {
                console.error("Error fetching background movies:", error);
            }
        };
        fetchBackgroundMovies();
    }, []);

    // Auto-rotate background images
    useEffect(() => {
        if (backgroundMovies.length === 0) return;
        
        const interval = setInterval(() => {
            setCurrentMovieIndex((prev) => (prev + 1) % backgroundMovies.length);
        }, 5000); // Change every 5 seconds

        return () => clearInterval(interval);
    }, [backgroundMovies.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await axios.post("https://s72-raphael-watchwise.onrender.com/api/auth/login", {
                email,
                password
            });
            
            if (response.data && response.data.token) {
                localStorage.setItem("token", response.data.token);
                setIsAuthenticated(true);
                navigate("/home");
            } else {
                setError("Invalid response from server");
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.response?.status === 401) {
                setError("Invalid email or password");
            } else if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else if (!error.response) {
                setError("Cannot connect to server. Please check if the server is running.");
            } else {
                setError("An error occurred during login. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Background Image Carousel with Overlay */}
            <div className="absolute inset-0">
                {backgroundMovies.map((movie, index) => (
                    <div
                        key={movie.id}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                            index === currentMovieIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                            backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`,
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60" />
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    </div>
                ))}
            </div>

            {/* Carousel Indicators */}
            {backgroundMovies.length > 0 && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                    {backgroundMovies.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentMovieIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentMovieIndex 
                                    ? 'bg-blue-500 w-8' 
                                    : 'bg-gray-500 hover:bg-gray-400'
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* Navbar */}
            <div className="relative z-30">
                <Navbar />
            </div>

            {/* Login Form Container */}
            <div className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-20 pb-12">
                <div className="w-full max-w-md">
                    {/* Card */}
                    <div className="bg-black/75 backdrop-blur-md rounded-lg px-8 sm:px-16 py-12 sm:py-16 shadow-2xl border border-gray-800">
                        {/* Title */}
                        <h1 className="text-white text-3xl font-bold mb-8">
                            Sign In
                        </h1>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-blue-600/90 text-white px-4 py-3 rounded-md mb-6 text-sm border border-blue-500">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Input */}
                            <div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Email address"
                                    className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400
                                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                             disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                />
                            </div>

                            {/* Password Input */}
                            <div>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Password"
                                    className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400
                                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                             disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                />
                            </div>

                            {/* Sign In Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-md
                                         transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black
                                         shadow-lg shadow-blue-500/20"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            {/* Remember Me & Help */}
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center text-gray-400 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="group-hover:text-gray-300 transition-colors">Remember me</span>
                                </label>
                                <button
                                    type="button"
                                    className="text-gray-400 hover:text-blue-400 hover:underline transition-colors"
                                >
                                    Need help?
                                </button>
                            </div>
                        </form>

                        {/* Sign Up Link */}
                        <div className="mt-12 text-gray-400">
                            <span>New to WatchWise? </span>
                            <button
                                onClick={() => navigate('/signup')}
                                disabled={isLoading}
                                className="text-blue-400 hover:text-blue-300 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Sign up now
                            </button>
                        </div>

                        {/* Footer Text */}
                        <div className="mt-4 text-xs text-gray-500">
                            <p>
                                This page is protected by Google reCAPTCHA to ensure you're not a bot.{' '}
                                <button className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
                                    Learn more
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;