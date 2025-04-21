import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const CollegeHeader = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b py-2 px-4`}>
      <div className="flex flex-col md:flex-row items-center justify-center">
        <div className="md:hidden mb-2">
          <div className="h-6">
            <img src="/images/logo-dark.png" alt="ExaminerPro Logo" className="h-8" />
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            <img src="/images/logo_gnc.png" alt="Guru Nanak College Logo" className="h-16 w-16 rounded-full" />
          </div>
          <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} text-center`}>
            <h2 className="text-lg md:text-xl font-bold leading-tight">GURU NANAK COLLEGE (AUTONOMOUS)</h2>
            <p className="text-xs opacity-75 leading-snug">Affiliated to University of Madras | Accredited 'A++' Grade by NAAC</p>
            <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} my-1 mx-auto w-3/4`}></div>
            <p className="text-xs md:text-sm font-medium leading-tight">CONTROLLER OF EXAMINATIONS (COE)</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CollegeHeader; 