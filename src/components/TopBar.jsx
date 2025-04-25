import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo } from './UIComponents';

const TopBar = ({ 
  collegeDetails = {}, 
  pageTitle = "", 
  className = "", 
  style = {},
  isMobileView = false,
  isMobileMenuOpen = false,
  onMobileMenuToggle = () => {}
}) => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  // Default college details if none provided
  const {
    name = 'GURU NANAK COLLEGE (AUTONOMOUS)',
    tagline = 'Affiliated to University of Madras | Accredited \'A++\' Grade by NAAC',
    department = 'CONTROLLER OF EXAMINATIONS (COE)'
  } = collegeDetails;
  
  const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';

  // Use consistent logo size now that we don't show the page title
  const logoSize = 'h-12 w-12';
  
  return (
    <div className={`${bgColor} ${className} w-full border-b ${borderColor} px-4`} style={style}>
      {/* Mobile menu button - only on mobile */}
      {isMobileView && (
        <button 
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-md ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
          onClick={onMobileMenuToggle}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      )}
      
      {/* Single Centered Card with College Info */}
      <div className="flex flex-col items-center justify-center w-full py-2">
        {/* Top section with logo and college name */}
        <div className="flex items-center justify-center mb-2">
          {/* College Logo */}
          <div className="flex-shrink-0 mr-4">
            <img 
              src="/images/logo_gnc.png" 
              alt="Guru Nanak College Logo" 
              className={`${logoSize} rounded-full`}
            />
          </div>
          
          {/* College Name and Tagline */}
          <div className={`${textColor} text-center`}>
            <h2 className="text-lg md:text-xl font-bold leading-tight">{name}</h2>
            <p className="text-xs opacity-75 leading-snug">{tagline}</p>
          </div>
        </div>
        
        {/* Divider line and department section */}
        <div className={`w-full text-center border-t ${borderColor} pt-2 mt-1`}>
          <p className={`text-xs md:text-sm font-medium leading-tight ${textColor}`}>{department}</p>
        </div>
      </div>
      
      {/* Mobile ExaminerPro Logo - Only on small screens */}
      <div className="md:hidden absolute left-4">
        <Logo variant="topbar" className="h-6" />
      </div>
    </div>
  );
};

export default TopBar; 