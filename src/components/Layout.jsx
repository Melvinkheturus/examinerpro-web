import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/**
 * Application layout with fixed sidebar, fixed topbar, and dynamic main content area
 */
const Layout = () => {
  const { isDarkMode } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Function to handle sidebar collapse state changes
  const handleSidebarCollapseChange = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };
  
  // Check if screen is mobile size on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    
    // Check immediately
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Calculate sidebar width based on collapsed state
  const sidebarWidth = isSidebarCollapsed ? '4rem' : '14rem'; // Using rem for better scaling
  
  // CSS to style the scrollbar
  const scrollbarStyles = isDarkMode ? {
    // Dark mode scrollbar styles
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.3)',
    '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.4)',
    '--scrollbar-track': 'rgba(0, 0, 0, 0.2)'
  } : {
    // Light mode scrollbar styles
    '--scrollbar-thumb': 'rgba(0, 0, 0, 0.3)',
    '--scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.4)',
    '--scrollbar-track': 'rgba(0, 0, 0, 0.05)'
  };
  
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Static Sidebar - Fixed on the left with full height */}
      <div 
        className="h-screen flex-shrink-0 transition-all duration-300"
        style={{ width: sidebarWidth }}
      >
        <Sidebar 
          className="h-full" 
          initialCollapsed={isSidebarCollapsed}
          onCollapseChange={handleSidebarCollapseChange}
        />
      </div>
      
      {/* Mobile sidebar overlay - only shown when sidebar is expanded on mobile */}
      {isMobile && !isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarCollapsed(true)}
        ></div>
      )}
      
      {/* Main Content Area with full width and height */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Static TopBar - Full width at the top of content area */}
        <header className="w-full shadow-sm z-20">
          <TopBar 
            className="w-full"
            isMobileView={isMobile}
            isMobileMenuOpen={!isSidebarCollapsed && isMobile}
            onMobileMenuToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </header>
        
        {/* Main Content with proper spacing and scrolling */}
        <main 
          className={`flex-1 overflow-y-auto scrollbar-thick ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
          style={{
            ...scrollbarStyles,
            scrollbarWidth: 'auto',
            scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
            paddingLeft: '1.5rem',
            paddingRight: '0'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;