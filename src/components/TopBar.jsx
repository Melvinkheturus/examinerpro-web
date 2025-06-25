import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../components/ui/theme-provider';
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
  
  // Make logo more prominent
  const logoSize = isMobileView ? 'h-10 w-10' : 'h-12 w-12';
  
  return (
    <div className={`${className} w-full border-b border-border px-2 sm:px-4 py-1.5 relative z-20`} style={style}>
      {/* Mobile menu button - only on mobile */}
      {isMobileView && (
        <button 
          className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md text-foreground z-30"
          onClick={onMobileMenuToggle}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {!isMobileMenuOpen && (
            <Menu className="h-5 w-5" />
          )}
        </button>
      )}
      
      {/* Single row with all information */}
      <div className={`flex items-center w-full ${isMobileView ? 'pl-6 sm:pl-8' : ''}`}>
        {/* College Logo - More prominent */}
        <div className="flex-shrink-0 mr-3">
            <img 
              src="/images/logo_gnc.png" 
              alt="Guru Nanak College Logo" 
              className={`${logoSize} rounded-full`}
            />
          </div>
          
        {/* College Info in a single line */}
        <div className="flex flex-1 flex-wrap items-center justify-center text-center">
          <h2 className="text-xs sm:text-sm font-bold">{name}</h2>
          <span className="mx-1 text-[0.6rem] sm:text-xs text-muted-foreground">|</span>
          <p className="text-[0.6rem] sm:text-xs text-muted-foreground">{tagline}</p>
          <span className="mx-1 text-[0.6rem] sm:text-xs text-muted-foreground">|</span>
          <p className="text-[0.6rem] sm:text-xs font-medium">{department}</p>
        </div>
      </div>
    </div>
  );
};

export default TopBar; 