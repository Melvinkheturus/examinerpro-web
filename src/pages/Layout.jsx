import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Page Content */}
        <div className="flex-1">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default Layout; 