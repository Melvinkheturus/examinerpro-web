import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from '../components/ui/theme-provider';
import { IllustratedIcon } from './IllustratedIcons';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ 
  className = '', 
  onCollapseChange, 
  initialCollapsed = false, 
  isMobile = false,
  onClose
}) => {
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
  // Effect to handle initialCollapsed changes
  useEffect(() => {
    setIsCollapsed(initialCollapsed);
    // Notify parent component about initial collapse state
    if (onCollapseChange) {
      onCollapseChange(initialCollapsed);
    }
  }, [initialCollapsed, onCollapseChange]);
  
  // Navigation items - separated profile to be above dashboard as requested
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' },
  ];
  
  // Archive items - consolidated to remove redundancy
  const historyItems = [
    { path: '/calculation-archive', label: 'Calculation Archives', icon: 'calculator' },
    { path: '/pdf-archive', label: 'PDF Archives', icon: 'document' }
  ];
  
  // Settings is separate at the bottom
  const settingsItem = { path: '/settings', label: 'Settings', icon: 'settings' };
  
  // Toggle sidebar collapse
  const toggleCollapse = () => {
    // On mobile, we don't collapse, we close the sidebar
    if (isMobile) {
      if (onClose) {
        onClose();
      }
      return;
    }
    
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // Notify parent component about collapse state change
    if (onCollapseChange) {
      onCollapseChange(newCollapsedState);
    }
  };

  // Check if path is active - improved to handle nested routes
  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true;
    }
    
    // Special case for calculations path to avoid highlighting history when on calculation detail pages
    if (path === '/calculation-archive' && (
      location.pathname.startsWith('/calculations/new/') || 
      location.pathname.startsWith('/calculations/view/')
    )) {
      return false;
    }
    
    // Also handle /calculations route redirecting to calculation-archive
    if (path === '/calculation-archive' && location.pathname === '/calculations') {
      return true;
    }
    
    // Handle /history route redirecting to pdf-archive
    if (path === '/pdf-archive' && location.pathname === '/history') {
      return true;
    }
    
    return location.pathname.startsWith(path);
  };
  
  // Render icon based on name using our new IllustratedIcon component
  const renderIcon = (name) => {
    return <IllustratedIcon name={name} className="w-4 h-4" weight={isDarkMode ? "light" : "regular"} />;
  };
  
  // Get user's display name and initials for the profile card
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };
  
  // Get avatar URL
  const getAvatarUrl = () => {
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=${isDarkMode ? '0369a1' : '3b82f6'}&color=ffffff`;
  };
  
  const sidebarBgColor = isDarkMode ? 'bg-gray-900' : 'bg-white';
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-700';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const activeClass = isDarkMode ? 'bg-blue-700 text-white font-bold' : 'bg-blue-50 text-blue-700 font-bold';
  const hoverClass = isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100';

  // In mobile mode, sidebar is never collapsed
  const effectiveIsCollapsed = isMobile ? false : isCollapsed;

  return (
    <div className={`${effectiveIsCollapsed ? 'w-16' : 'w-56'} h-full flex-shrink-0 ${sidebarBgColor} border-r ${borderColor} flex flex-col shadow-md transition-all duration-300 ${className}`}>
      {/* Logo and Collapse Button */}
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* ExaminerPro SVG Icon - Size reduced */}
          <div className="flex-shrink-0 mr-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 202 202" 
              className="h-6 w-6"
            >
              <path 
                fill="#FEFFFF" 
                opacity="1.000000" 
                stroke="none" 
                d="M144.000000,203.000000 C96.000000,203.000000 48.500004,203.000000 1.000006,203.000000 C1.000004,135.666672 1.000004,68.333344 1.000002,1.000015 C68.333321,1.000010 135.666641,1.000010 202.999969,1.000005 C202.999985,68.333321 202.999985,135.666641 203.000000,202.999969 C183.500000,203.000000 164.000000,203.000000 144.000000,203.000000 M87.240669,150.320129 C120.300110,162.071442 155.035156,140.200409 157.686630,105.963608 C159.917892,77.153061 137.329376,50.890488 108.997925,49.355553 C79.534790,47.759308 53.879532,70.824112 53.641926,100.279320 C53.452427,123.770920 65.165482,140.313187 87.240669,150.320129 z"
              />
              <path 
                fill="#F7F9FE" 
                opacity="1.000000" 
                stroke="none" 
                d="M81.830208,69.755753 C101.322876,55.734943 126.680420,60.603165 139.279938,80.331718 C141.277634,83.459732 141.087494,85.460793 138.442230,88.053268 C128.454361,97.841835 118.603645,107.773407 108.849846,117.795731 C106.349663,120.364754 104.637146,120.133553 102.301826,117.675369 C97.372185,112.486320 92.365341,107.352928 87.123398,102.483902 C82.941154,98.599174 86.251457,96.587006 88.602753,94.022522 C91.158890,91.234634 93.248993,89.757874 96.729851,93.258156 C105.853813,102.433029 105.990227,102.294968 115.273506,92.994438 C117.273163,90.991066 119.325760,89.038857 121.282280,86.994469 C124.892975,83.221588 124.708923,81.885536 120.289993,78.873405 C106.312645,69.345848 85.185463,76.764946 80.140182,92.972557 C76.174629,105.711609 81.329941,118.948502 92.652405,125.099251 C104.255676,131.402557 118.162834,128.451767 126.852371,118.093277 C128.036041,116.682266 130.675156,114.996071 131.926865,115.441658 C134.759064,116.449852 137.262604,118.575859 139.588074,120.604591 C139.939819,120.911453 138.834000,123.282402 138.038330,124.450645 C129.568741,136.886292 112.569290,144.002869 98.213707,140.670868 C81.686394,136.834808 70.710678,126.778976 67.068222,109.965355 C63.569576,93.815536 69.017906,80.521782 81.830208,69.755753 z"
              />
            </svg>
          </div>
          
          {/* Text Logo - Only show when not collapsed or on mobile */}
          {!effectiveIsCollapsed && (
            <h2 className="text-base font-bold">
              <span className={`font-yeseva ${isDarkMode ? "text-white" : "text-black"}`}>examiner</span>
              <span className="font-yeseva text-blue-600">pro</span>
            </h2>
          )}
        </div>
        
        {/* Close/Collapse Button */}
        <button
          onClick={toggleCollapse}
          className={`rounded-md p-1 ${hoverClass} text-gray-500 focus:outline-none`}
          title={isMobile ? "Close sidebar" : (isCollapsed ? "Expand sidebar" : "Collapse sidebar")}
        >
          {isMobile ? (
            // X icon for mobile close button
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Sidebar collapse icon for desktop
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              className="h-5 w-5" 
              fill="currentColor"
              style={{ transform: isCollapsed ? 'scaleX(-1)' : 'scaleX(1)', transition: 'transform 0.3s ease' }}
            >
              <path fillRule="evenodd" d="M7.22 14.47L9.69 12 7.22 9.53a.75.75 0 111.06-1.06l3 3a.75.75 0 010 1.06l-3 3a.75.75 0 01-1.06-1.06z"/>
              <path fillRule="evenodd" d="M3.75 2A1.75 1.75 0 002 3.75v16.5c0 .966.784 1.75 1.75 1.75h16.5A1.75 1.75 0 0022 20.25V3.75A1.75 1.75 0 0020.25 2H3.75zM3.5 3.75a.25.25 0 01.25-.25H15v17H3.75a.25.25 0 01-.25-.25V3.75zm13 16.75v-17h3.75a.25.25 0 01.25.25v16.5a.25.25 0 01-.25.25H16.5z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className={`border-b ${borderColor} ${effectiveIsCollapsed ? 'mx-1' : 'mx-4'} mb-3`}></div>
      
      {/* Compact Profile Section */}
      <div className={`${effectiveIsCollapsed ? 'px-1' : 'px-4'} mb-3`}>
        <Link to="/profile" className="block">
          {effectiveIsCollapsed ? (
            // Collapsed view - only show avatar
            <div className="flex justify-center">
              <img 
                src={getAvatarUrl()} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
          ) : (
            // Expanded view - show avatar, name and email in a row
            <div className="flex items-center space-x-3">
              <img 
                src={getAvatarUrl()} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="leading-tight overflow-hidden">
                <div className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Mani Kandan
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-none truncate">
                  sankarmanikandan422@gmail.com
                </div>
              </div>
            </div>
          )}
        </Link>
      </div>
      
      {/* Divider After Profile */}
      <div className={`border-b ${borderColor} ${effectiveIsCollapsed ? 'mx-1' : 'mx-4'} mb-3`}></div>
      
      {/* Main Navigation Section - Using flex-grow to push the Settings to bottom */}
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Navigation Links */}
        <nav className={`${effectiveIsCollapsed ? 'px-1' : 'px-4'} space-y-1`}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${effectiveIsCollapsed ? 'justify-center' : 'space-x-2'} px-2 py-1.5 rounded-md transition-colors duration-200 ${
                isActive(item.path)
                  ? activeClass
                  : `${textColor} ${hoverClass}`
              }`}
              title={effectiveIsCollapsed ? item.label : ''}
            >
              {renderIcon(item.icon)}
              {!effectiveIsCollapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
          
          {/* Divider before Master History section */}
          <div className={`border-b ${borderColor} ${effectiveIsCollapsed ? 'mx-1' : 'mx-0'} my-2`}></div>
          
          {/* Master History Title */}
          {!effectiveIsCollapsed && (
            <div className="px-2 py-0.5">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Master History
              </span>
            </div>
          )}
          
          {/* History Navigation Items */}
          {historyItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${effectiveIsCollapsed ? 'justify-center' : 'space-x-2'} px-2 py-1.5 rounded-md transition-colors duration-200 ${
                isActive(item.path)
                  ? activeClass
                  : `${textColor} ${hoverClass}`
              }`}
              title={effectiveIsCollapsed ? item.label : ''}
            >
              {renderIcon(item.icon)}
              {!effectiveIsCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}
        </nav>
        
        {/* Push settings to the bottom with flex-grow */}
        <div className="flex-grow"></div>
        
        {/* Settings (at bottom) */}
        <div className={`${effectiveIsCollapsed ? 'px-1' : 'px-4'} py-2`}>
          {/* Border above settings */}
          <div className={`border-t ${borderColor} mb-2`}></div>
          <Link
            to={settingsItem.path}
            className={`flex items-center ${effectiveIsCollapsed ? 'justify-center' : 'space-x-2'} px-2 py-1.5 rounded-md transition-colors duration-200 ${
              isActive(settingsItem.path)
                ? activeClass
                : `${textColor} ${hoverClass}`
            }`}
            title={effectiveIsCollapsed ? settingsItem.label : ''}
          >
            {renderIcon(settingsItem.icon)}
            {!effectiveIsCollapsed && <span className="text-sm">{settingsItem.label}</span>}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 
