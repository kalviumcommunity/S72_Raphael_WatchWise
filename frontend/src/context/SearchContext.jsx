import React, { createContext, useState, useContext } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchState, setSearchState] = useState({
    results: null,
    query: '',
    page: 1
  });

  const updateSearchState = (newState) => {
    setSearchState(prev => ({ ...prev, ...newState }));
  };

  const clearSearch = () => {
    setSearchState({
      results: null,
      query: '',
      page: 1
    });
  };

  return (
    <SearchContext.Provider value={{ searchState, updateSearchState, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}; 