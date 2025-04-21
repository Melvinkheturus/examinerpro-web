import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, updateSetting } from '../services/settingsService';

// Create the context
const ThemeContext = createContext();

// Custom hook for using the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ThemeProvider component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme setting from Supabase on component mount
  useEffect(() => {
    const loadThemeSetting = async () => {
      try {
        const settings = await getSettings();
        // Check if settings.theme is a string (direct value) or an object
        if (settings && settings.theme) {
          if (typeof settings.theme === 'string') {
            // If theme is a string like 'dark' or 'light'
            setIsDarkMode(settings.theme === 'dark');
          } else if (settings.theme.isDarkMode !== undefined) {
            // If theme is an object with isDarkMode property
            setIsDarkMode(settings.theme.isDarkMode);
          } else {
            // Default to light theme if structure is unexpected
            setIsDarkMode(false);
          }
        } else {
          // Default to light theme if no theme setting
          setIsDarkMode(false);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading theme setting:', error);
        // Default to light theme on error
        setIsDarkMode(false);
        setIsLoading(false);
      }
    };

    loadThemeSetting();
  }, []);

  // Toggle theme function
  const toggleTheme = async () => {
    try {
      const newDarkMode = !isDarkMode;
      setIsDarkMode(newDarkMode);
      
      // Update <html> tag with dark class immediately for better UX
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Try to save to database, but don't block UI if it fails
      try {
        const result = await updateSetting('theme', { isDarkMode: newDarkMode });
        if (!result.success) {
          console.warn('Theme setting could not be saved:', result.message || result.error);
        }
      } catch (dbError) {
        console.error('Error saving theme to database:', dbError);
        // Continue with the theme change even if saving fails
      }
    } catch (error) {
      console.error('Error toggling theme:', error);
      // Revert the theme change if there was an error
      setIsDarkMode(!isDarkMode);
    }
  };

  // Update HTML tag on theme change
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Value to be provided by the context
  const value = {
    isDarkMode,
    toggleTheme,
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext; 