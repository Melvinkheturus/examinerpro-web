import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * PaginationControls component - Controls for pagination
 * 
 * @param {number} currentPage - The current page
 * @param {number} totalPages - The total number of pages
 * @param {Function} onPageChange - Function to call when the page changes
 * @returns {JSX.Element}
 */
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  const { isDarkMode } = useTheme();

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate middle pages
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Add ellipsis if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  // No need to show pagination if there's only 1 page
  if (totalPages <= 1) {
    return null;
  }

  // Button styles
  const baseButtonStyle = `px-3 py-1 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`;
  const activeButtonStyle = isDarkMode 
    ? `${baseButtonStyle} bg-blue-600 text-white`
    : `${baseButtonStyle} bg-blue-500 text-white`;
  const inactiveButtonStyle = isDarkMode
    ? `${baseButtonStyle} bg-gray-700 text-gray-200 hover:bg-gray-600`
    : `${baseButtonStyle} bg-white text-gray-700 hover:bg-gray-50 border border-gray-300`;
  const disabledButtonStyle = isDarkMode
    ? `${baseButtonStyle} bg-gray-800 text-gray-500 cursor-not-allowed`
    : `${baseButtonStyle} bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200`;

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      {/* Previous Button */}
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={currentPage === 1 ? disabledButtonStyle : inactiveButtonStyle}
        aria-label="Previous page"
      >
        &laquo;
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className={`px-3 py-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>...</span>
          ) : (
            <button
              onClick={() => typeof page === 'number' && onPageChange(page)}
              className={currentPage === page ? activeButtonStyle : inactiveButtonStyle}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`Page ${page}`}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      {/* Next Button */}
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={currentPage === totalPages ? disabledButtonStyle : inactiveButtonStyle}
        aria-label="Next page"
      >
        &raquo;
      </button>
    </div>
  );
};

export default PaginationControls; 