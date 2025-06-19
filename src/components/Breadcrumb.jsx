import React, { memo } from 'react';
import { Link } from 'react-router-dom';
// Remove unused import
// import { useTheme } from '../contexts/ThemeContext';

/**
 * Breadcrumb component that shows the navigation path
 * Features:
 * - Current page in blue & bold (rightmost)
 * - Past pages in black/grey
 * - Chevron separator
 * - Accessible & responsive
 * - No container, displays directly in parent
 */
const Breadcrumb = ({ items, className }) => {
  // Remove the unused isDarkMode variable
  // const { isDarkMode } = useTheme();
  
  // Return null if no items or only one item (just home)
  if (!items || items.length <= 1) return null;
  
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={`py-2 mb-4 ${className}`}
    >
      <ol className="flex flex-wrap items-center text-sm space-x-1">
        {items.map((item, index) => {
          // Determine if this is the current (last) item
          const isCurrentPage = index === items.length - 1;
          
          return (
            <li key={`breadcrumb-${index}`} className="flex items-center">
              {/* Add chevron separator before all items except the first */}
              {index > 0 && (
                <span 
                  className="mx-2 text-gray-400 dark:text-gray-500" 
                  aria-hidden="true"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-3 w-3" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </span>
              )}
              
              {/* Link for navigable items, span for current page */}
              {isCurrentPage ? (
                <span 
                  className="font-bold text-blue-600 dark:text-blue-400"
                  aria-current="page"
                >
                  {item.title}
                </span>
              ) : (
                <Link
                  to={item.path}
                  state={item.state || {}}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={(e) => {
                    // Special case for Salary Calculator in staff details breadcrumb
                    if (item.title === 'Salary Calculator' && 
                        item.path.includes('/calculations/new/') && 
                        window.location.pathname.includes('/staff-details/')) {
                      // Simulate the cancel button behavior in staff details
                      e.preventDefault();
                      const examinerId = item.path.split('/').pop();
                      // Keep only the necessary state data
                      const stateToPass = {
                        ...(item.state || {}),
                        evaluationDayId: item.state?.evaluationDayId,
                        evaluationDate: item.state?.evaluationDate,
                        staffCount: item.state?.staffCount,
                        examinerData: item.state?.examinerData,
                        examinerName: item.state?.examinerName,
                        _ts: Date.now()
                      };
                      // Use navigate from window.history directly
                      window.history.pushState({}, '', `/calculations/new/${examinerId}`);
                      window.history.replaceState(stateToPass, '');
                      window.location.reload();
                    }
                  }}
                >
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(Breadcrumb); 