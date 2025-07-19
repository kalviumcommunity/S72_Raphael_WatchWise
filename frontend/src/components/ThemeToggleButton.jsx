import React from "react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full shadow-lg p-3 flex items-center justify-center transition-colors duration-300"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <span role="img" aria-label="dark mode" className="text-xl">🌙</span>
      ) : (
        <span role="img" aria-label="light mode" className="text-xl">☀️</span>
      )}
    </button>
  );
};

export default ThemeToggleButton;