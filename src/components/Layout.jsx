import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../components/ui/theme-provider';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MainLayout from './MainLayout';

/**
 * Application layout with fixed sidebar, fixed topbar, and dynamic main content area
 * Merged implementation from both layout components for a unified experience
 */
const Layout = ({ children }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Function to handle sidebar collapse state changes
  const handleSidebarCollapseChange = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };
  
  // Check if screen is mobile size on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      // Always collapse sidebar on mobile by default
      if (isMobileView) {
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
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Mobile sidebar - fixed position and overlays content when open */}
      {isMobile && (
        <div 
          className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out transform ${
            isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
          }`}
          style={{ width: '80%', maxWidth: '280px' }} 
        >
          <Sidebar 
            className="h-full"
            initialCollapsed={false}
            isMobile={true}
            onCollapseChange={() => {}} // We don't collapse on mobile, we close it
            onClose={() => setIsSidebarCollapsed(true)}
          />
        </div>
      )}
      
      {/* Desktop sidebar - fixed on the left with full height */}
      {!isMobile && (
        <div 
          className="h-screen flex-shrink-0 transition-all duration-300"
          style={{ width: sidebarWidth }}
        >
          <Sidebar 
            className="h-full" 
            initialCollapsed={isSidebarCollapsed}
            onCollapseChange={handleSidebarCollapseChange}
            isMobile={false}
          />
        </div>
      )}
      
      {/* Mobile sidebar overlay backdrop - only shown when sidebar is expanded on mobile */}
      {isMobile && !isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        ></div>
      )}
      
      {/* Main Content Area with full width and height */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Static TopBar - Fixed position with z-index to stay on top */}
        <header className="w-full shadow-sm z-20 bg-card">
          <TopBar 
            className="w-full"
            isMobileView={isMobile}
            isMobileMenuOpen={!isSidebarCollapsed && isMobile}
            onMobileMenuToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </header>
        
        {/* Main Content with proper spacing and scrolling */}
        <main 
          className="flex-1 overflow-y-auto scrollbar-thick bg-background"
        >
          <MainLayout>
            {children || <Outlet />}
          </MainLayout>
        </main>
      </div>
    </div>
  );
};

export default Layout;