import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (e.g., check token in localStorage)
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token and set user
      setUser({ /* user data */ });
    }
    setLoading(false);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};