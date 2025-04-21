import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PlusIcon } from './IllustratedIcons';

const FloatingAddButton = ({ onClick }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
        isDarkMode 
          ? 'bg-blue-600 hover:bg-blue-700' 
          : 'bg-blue-500 hover:bg-blue-600'
      } text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
      aria-label="Add new examiner"
    >
      <PlusIcon 
        className="w-6 h-6"
        weight="bold"
      />
    </button>
  );
};

export default FloatingAddButton; 