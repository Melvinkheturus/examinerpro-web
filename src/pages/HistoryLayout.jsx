import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const HistoryLayout = ({ children }) => {
  const { isDarkMode } = useTheme();
  
  // CSS to style the scrollbar to match the parent layout
  const scrollbarStyles = isDarkMode ? {
    // Dark mode scrollbar styles
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.2)',
    '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.3)',
    '--scrollbar-track': 'rgba(0, 0, 0, 0.2)'
  } : {
    // Light mode scrollbar styles
    '--scrollbar-thumb': 'rgba(0, 0, 0, 0.2)',
    '--scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.3)', 
    '--scrollbar-track': 'rgba(0, 0, 0, 0.05)'
  };
  
  return (
    <div 
      className={`w-full h-full ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} overflow-auto`}
      style={{
        ...scrollbarStyles,
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)'
      }}
    >
      <style jsx="true">{`
        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        div::-webkit-scrollbar-thumb {
          background-color: var(--scrollbar-thumb);
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background-color: var(--scrollbar-thumb-hover);
        }
        div::-webkit-scrollbar-track {
          background-color: var(--scrollbar-track);
        }
      `}</style>
      {/* Page Content */}
      {children || <Outlet />}
    </div>
  );
};

export default HistoryLayout; 