import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from "./pages/landing";
import { SearchProvider } from './context/SearchContext'
import './index.css'
import Login from "./pages/login";
import Signup from "./pages/signup";
import Profile from "./pages/profile";

function App(){
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  return(
  <SearchProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  </SearchProvider>
  )
}

export default App