import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  // Enterprise portal defaults to light theme (clean light-gray workspace)
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      return savedTheme;
    }
    // Default to clean enterprise light theme
    return "light";
  });

  // Apply theme to document and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    localStorage.setItem("theme", "light");
  }, [theme]);

  const toggleTheme = () => {
    setTheme("light");
  };

  const setLightMode = () => setTheme("light");
  const setDarkMode = () => setTheme("light");

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setLightMode,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook with error checking
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
