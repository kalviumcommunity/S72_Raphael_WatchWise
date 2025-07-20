import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from "./pages/landing";
import { SearchProvider } from './context/SearchContext'
import './index.css'
import Login from "./pages/login";
import Signup from "./pages/signup";
import Profile from "./pages/profile";
import Home from "./pages/home";
import MovieDetails from './pages/moviedetails';
import TvShowDetails from './pages/tvshowdetails';
import AnimeDetails from './pages/animedetails';
import About from './pages/about';
import Recommendations from './pages/recommendations';

function App(){
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  return(
  <SearchProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/tv/:id" element={<TvShowDetails />} />
          <Route path="/anime/:id" element={<AnimeDetails />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/recommendations" element={<Recommendations />} />
      </Routes>
    </Router>
  </SearchProvider>
  )
}

export default App