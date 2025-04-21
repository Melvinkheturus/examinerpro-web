import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const HistoryLayout = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with College Branding */}
        <TopBar 
          collegeDetails={{
            name: 'GURU NANAK COLLEGE (AUTONOMOUS)',
            tagline: 'Affiliated to University of Madras | Accredited \'A++\' Grade by NAAC',
            department: 'CONTROLLER OF EXAMINATIONS (COE)'
          }} 
        />
        
        {/* Mobile Sidebar Drawer - Only shown when mobileSidebarOpen is true */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
              onClick={toggleMobileSidebar}
            ></div>
            
            {/* Mobile Sidebar Container */}
            <div className="fixed inset-y-0 left-0 flex flex-col w-64 max-w-xs bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 z-50">
              {/* Mobile Sidebar Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">
                  <span className="font-yeseva dark:text-white text-black">examiner</span>
                  <span className="font-yeseva text-blue-600">pro</span>
                </h2>
                <button 
                  onClick={toggleMobileSidebar}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Mobile Sidebar Content - we render the same Sidebar component here */}
              <div className="flex-1 overflow-y-auto">
                <Sidebar className="h-full border-0" />
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
          {/* Mobile Menu Button - Only shown on mobile */}
          <div className="md:hidden p-4 flex items-center border-b border-gray-200 dark:border-gray-700">
            <button 
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={toggleMobileSidebar}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold ml-4">
              <span className="font-yeseva dark:text-white text-black">examiner</span>
              <span className="font-yeseva text-blue-600">pro</span>
            </h1>
          </div>
          
          {/* Page Content */}
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default HistoryLayout; 