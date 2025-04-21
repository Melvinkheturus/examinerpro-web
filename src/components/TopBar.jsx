import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo } from './UIComponents';

const TopBar = ({ collegeDetails = {}, pageTitle = "" }) => {
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
  const logoSize = 'h-16 w-16';
  
  return (
    <header className={`${bgColor} border-b ${borderColor} py-2 px-4`}>
      <div className="flex flex-col md:flex-row items-center justify-center">
        {/* Mobile ExaminerPro Logo - Only on small screens */}
        <div className="md:hidden mb-2">
          <Logo variant="topbar" className="h-6" />
        </div>
        
        {/* College Info - Centered with logo first */}
        <div className="flex items-center">
          {/* College Logo */}
          <div className="flex-shrink-0 mr-3">
            <img 
              src="/images/logo_gnc.png" 
              alt="Guru Nanak College Logo" 
              className={`${logoSize} rounded-full`}
            />
          </div>
          
          {/* College Details */}
          <div className={`${textColor} text-center`}>
            <h2 className="text-lg md:text-xl font-bold leading-tight">{name}</h2>
            <p className="text-xs opacity-75 leading-snug">{tagline}</p>
            {/* Divider above department */}
            <div className={`border-t ${borderColor} my-1 mx-auto w-3/4`}></div>
            <p className="text-xs md:text-sm font-medium leading-tight">{department}</p>
            
            {/* Page Title section removed */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar; 