import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ExaminerCard = ({ examiner, viewMode, onClick, isHighlighted, onExaminerDeleted }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  
  // Add highlight styles when isHighlighted is true
  const highlightStyle = isHighlighted ? 
    `ring-2 ring-blue-500 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}` : '';
  
  const handleClick = () => {
    if (onClick) onClick(examiner.id);
  };

  // Navigate to edit page
  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/examiners/edit/${examiner.id}`);
  };

  // Delete examiner from database and update UI
  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (window.confirm(`Are you sure you want to delete ${examiner.name}?`)) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('examiners')
          .delete()
          .eq('id', examiner.id);
          
        if (error) throw error;
        
        // Update UI by calling parent callback
        if (onExaminerDeleted) {
          onExaminerDeleted(examiner.id);
        }
      } catch (error) {
        console.error('Error deleting examiner:', error);
        alert('Failed to delete examiner. Please try again.');
      }
    }
  };

  // Generate a placeholder profile image if none exists
  const getProfileImage = (examiner) => {
    if (examiner.profileUrl) {
      return examiner.profileUrl;
    }
    
    // Generate placeholder with initials using ui-avatars.com
    const name = examiner.name || 'Unknown';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3f51b5&color=fff&size=150`;
  };
  
  if (viewMode === 'grid') {
    return (
      <div 
        className={`w-full h-[250px] ${cardBg} rounded-lg shadow-sm border ${borderColor} overflow-hidden hover:shadow-md transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 cursor-pointer ${highlightStyle}`}
        onClick={handleClick}
      >
        <div className="p-3 h-full flex flex-col items-center text-center">
          {/* Centered Profile Picture */}
          <div className="mb-2">
            <img 
              src={getProfileImage(examiner)} 
              alt={`${examiner.name} profile`} 
              className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 mx-auto"
            />
          </div>
          
          <div className="flex-1 flex flex-col justify-center mb-2 w-full">
            <h3 className={`font-semibold text-sm leading-snug ${textColor}`}>{examiner.name}</h3>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ID: {examiner.examinerId || examiner.id}
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {examiner.department}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} italic`}>
              {examiner.position}
            </p>
          </div>
          
          <div className="mt-auto pt-2 border-t border-gray-200 w-full">
            {/* Edit and Delete buttons - always visible */}
            <div className="flex justify-center space-x-3">
              <button 
                onClick={handleEdit}
                className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                title="Edit examiner"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              
              <button 
                onClick={handleDelete}
                className="p-1.5 rounded-full bg-gray-200 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-900/30 transition-colors"
                title="Delete examiner"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // List view
  return (
    <div 
      className={`w-full ${cardBg} rounded-lg shadow-sm border ${borderColor} p-4 transform transition-all duration-300 hover:shadow-md hover:scale-[1.01] hover:-translate-y-0.5 cursor-pointer ${highlightStyle}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          {/* Profile Picture - Smaller in list view */}
          <div className="mr-4">
            <img 
              src={getProfileImage(examiner)} 
              alt={`${examiner.name} profile`} 
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
          </div>
          
          <div>
            <div className="flex items-center">
              <h3 className={`font-semibold ${textColor}`}>{examiner.name}</h3>
              <p className={`ml-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                ID: {examiner.examinerId || examiner.id}
              </p>
            </div>
            <div className="flex space-x-6 text-sm">
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{examiner.department}</p>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{examiner.position}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Action buttons */}
          <button 
            onClick={handleEdit}
            className="p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            title="Edit examiner"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded-full bg-gray-200 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-900/30 transition-colors"
            title="Delete examiner"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const ExaminerList = ({ examiners = [], isLoading = false, viewMode = 'grid', onExaminerClick, highlightedExaminerId, onExaminerDeleted }) => {
  const { isDarkMode } = useTheme();
  const highlightedCardRef = useRef(null);
  
  // Define isSidebarCollapsed at the component level so it's available throughout
  const isSidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  
  // Scroll to highlighted examiner when the ID changes
  useEffect(() => {
    if (highlightedExaminerId && highlightedCardRef.current) {
      highlightedCardRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [highlightedExaminerId]);
  
  // Handle examiner deletion
  const handleExaminerDeleted = (id) => {
    if (onExaminerDeleted) {
      onExaminerDeleted(id);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Empty state
  if (examiners.length === 0) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium">No examiners found</h3>
        <p className="mt-1 text-sm">Get started by creating your first examiner.</p>
      </div>
    );
  }
  
  // Determine grid layout based on sidebar state and view mode
  let gridClasses = 'w-full';
  
  if (viewMode === 'grid') {
    if (isSidebarCollapsed) {
      // Match the grey box layout in collapsed view with more padding
      gridClasses += ' grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 px-3 py-2';
    } else {
      // Keep the original layout for expanded view
      gridClasses += ' grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6';
    }
  } else {
    gridClasses += ' space-y-3';
  }
  
  // Render the grid/list
  return (
    <div className={gridClasses}>
      {examiners.map((examiner) => {
        const isHighlighted = highlightedExaminerId === examiner.id;
        return (
          <div 
            key={examiner.id}
            ref={isHighlighted ? highlightedCardRef : null}
            className={viewMode === 'grid' ? (isSidebarCollapsed ? 'w-full bg-gray-300/30 rounded-lg p-3' : 'flex justify-center items-center w-full') : 'w-full'}
          >
            <ExaminerCard 
              examiner={examiner} 
              viewMode={viewMode}
              onClick={onExaminerClick}
              isHighlighted={isHighlighted}
              onExaminerDeleted={handleExaminerDeleted}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ExaminerList; 