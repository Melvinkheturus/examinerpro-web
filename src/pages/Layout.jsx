import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import CollegeHeader from './CollegeHeader';
import Sidebar from '../components/Sidebar';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Desktop Sidebar - scrollable */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="w-64 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          <Sidebar className="h-full" />
        </div>
      </div>
      
      {/* Mobile Sidebar Drawer */}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Menu Button */}
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
        
        {/* College Header */}
        <div className="flex-shrink-0">
          <CollegeHeader />
        </div>
        
        {/* Page Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default Layout; 