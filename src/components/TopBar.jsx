import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../components/ui/theme-provider';
import { ThemeSwitcher } from '../components/ui/theme-switcher';
import { Menu } from 'lucide-react';

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
  const { theme } = useTheme();
  
  // Default college details if none provided
  const {
    name = 'GURU NANAK COLLEGE (AUTONOMOUS)',
    tagline = 'Affiliated to University of Madras | Accredited \'A++\' Grade by NAAC',
    department = 'CONTROLLER OF EXAMINATIONS (COE)'
  } = collegeDetails;
  
  // Use consistent logo size now that we don't show the page title
  const logoSize = 'h-12 w-12';
  
  return (
    <div className={`${className} w-full border-b border-border px-4 py-2 relative z-20`} style={style}>
      {/* Mobile menu button - only on mobile */}
      {isMobileView && (
        <button 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-md text-foreground z-30"
          onClick={onMobileMenuToggle}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {!isMobileMenuOpen && (
            <Menu className="h-6 w-6" />
          )}
        </button>
      )}
      
      {/* Single Centered Card with College Info */}
      <div className={`flex flex-col items-center justify-center w-full py-2 ${isMobileView ? 'pl-8' : ''}`}>
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
          <div className="text-center">
            <h2 className="text-lg md:text-xl font-bold leading-tight">{name}</h2>
            <p className="text-xs text-muted-foreground leading-snug">{tagline}</p>
          </div>
        </div>
        
        {/* Divider line and department section */}
        <div className="w-full text-center border-t border-border pt-2 mt-1">
          <p className="text-xs md:text-sm font-medium leading-tight">{department}</p>
        </div>
      </div>

      {/* Theme Toggle Button - Position at the top right */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        <ThemeSwitcher />
      </div>
    </div>
  );
};

export default TopBar; 