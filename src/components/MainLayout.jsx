import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../components/ui/theme-provider';
import { useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import { getBreadcrumbItems } from '../utils/breadcrumbUtils';

/**
 * MainLayout component that provides consistent padding for all pages
 * This component should be used inside the main Layout component
 */
const MainLayout = ({ children }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const location = useLocation();
  const [breadcrumbItems, setBreadcrumbItems] = useState([]);
  
  // Memoize breadcrumb generation to avoid unnecessary recalculations
  const generateBreadcrumbs = useCallback(() => {
    // Get favorite status from location state or localStorage for the specific page
    let isFavorite = location.state?.isFavorite || false;
    
    // For calculations, check if they are in favorites
    if (location.pathname.includes('/calculations/view/')) {
      const calcId = location.pathname.split('/').pop();
      const favorites = JSON.parse(localStorage.getItem('favoriteCalculations') || '[]');
      isFavorite = favorites.includes(calcId);
    }
    
    // Get breadcrumb items for the current path
    return getBreadcrumbItems(location.pathname, {
      ...location.state,
      isFavorite
    });
  }, [location.pathname, location.state]);
  
  // Generate breadcrumb items only when the location actually changes
  useEffect(() => {
    const items = generateBreadcrumbs();
    setBreadcrumbItems(items);
  }, [generateBreadcrumbs]);
  
  // Simplified breadcrumb visibility logic without animations
  const showBreadcrumbs = breadcrumbItems.length > 0;
  
  return (
    <div className="main-content px-6 pt-4 pb-6 max-w-[1280px] mx-auto text-foreground">
      {/* Show breadcrumbs without animation delay */}
      {showBreadcrumbs && (
        <Breadcrumb items={breadcrumbItems} />
      )}
      
      {children}
    </div>
  );
};

export default MainLayout; 