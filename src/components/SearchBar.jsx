import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { SearchIcon, CloseIcon } from './IllustratedIcons';

const SearchBar = ({ value, onChange }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className="w-full max-w-md">
      <div className={`relative rounded-md shadow-sm ${
        isDarkMode ? 'bg-gray-700' : 'bg-white'
      }`}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon 
            className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
            weight={isDarkMode ? "light" : "regular"}
          />
        </div>
        <input
          type="text"
          name="search"
          id="search"
          className={`block w-full pl-10 pr-3 py-2 border ${
            isDarkMode 
              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
          } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Search examiners by name or ID..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => onChange('')}
          >
            <CloseIcon
              className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              weight={isDarkMode ? "light" : "regular"}
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar; 