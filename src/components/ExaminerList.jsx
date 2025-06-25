import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ExaminerCard = ({ examiner, viewMode, onClick, isHighlighted, onExaminerDeleted }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const [isFavorite, setIsFavorite] = useState(false);
  
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

  // Toggle favorite status
  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // Here you would typically save this to a database or localStorage
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
          {/* Favorite button */}
          <div className="self-end">
            <button
              onClick={handleToggleFavorite}
              className={`text-sm ${isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
            >
              {isFavorite ? '⭐' : '☆'}
            </button>
          </div>
          
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
  
  // List view - now just returns null as we handle list view in the parent component
  return null;
};

const ExaminerList = ({ examiners = [], isLoading = false, viewMode = 'grid', onExaminerClick, highlightedExaminerId, onExaminerDeleted }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const highlightedCardRef = useRef(null);
  const [favorites, setFavorites] = useState({});
  
  // Define isSidebarCollapsed at the component level so it's available throughout
  const isSidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  
  // Define styling variables
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const secondaryText = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const hoverTransition = 'transition-all duration-300 ease-in-out';
  
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

  // Toggle favorite status
  const handleToggleFavorite = (id) => {
    setFavorites(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    // Here you would typically save this to a database or localStorage
  };

  // Navigate to edit page
  const handleEdit = (id) => {
    navigate(`/examiners/edit/${id}`);
  };

  // Delete examiner
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('examiners')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Update UI by calling parent callback
        if (onExaminerDeleted) {
          onExaminerDeleted(id);
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
  
  // Grid view
  if (viewMode === 'grid') {
    // Determine grid layout based on sidebar state
    let gridClasses = 'w-full';
    
    if (isSidebarCollapsed) {
      // Match the grey box layout in collapsed view with more padding
      gridClasses += ' grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 px-3 py-2';
    } else {
      // Keep the original layout for expanded view
      gridClasses += ' grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6';
  }
  
  return (
    <div className={gridClasses}>
      {examiners.map((examiner) => {
        const isHighlighted = highlightedExaminerId === examiner.id;
        return (
          <div 
            key={examiner.id}
            ref={isHighlighted ? highlightedCardRef : null}
              className={isSidebarCollapsed ? 'w-full bg-gray-300/30 rounded-lg p-3' : 'flex justify-center items-center w-full'}
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
  }
  
  // List view with table-like structure
  return (
    <div className="w-full">
      <div className={`${cardBg} rounded-lg shadow overflow-hidden border ${borderColor}`}>
        {/* Table header */}
        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {/* Header row */}
            <div className="bg-gray-50 dark:bg-gray-700">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1 px-4 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fav</span>
                </div>
                <div className="col-span-3 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Examiner
                </div>
                <div className="col-span-2 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ID
                </div>
                <div className="col-span-3 hidden md:block px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </div>
                <div className="col-span-3 px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </div>
              </div>
            </div>

            {/* Table body */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {examiners.map(examiner => {
                const isHighlighted = highlightedExaminerId === examiner.id;
                const highlightStyle = isHighlighted ? 
                  `${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'}` : '';
                
                return (
                  <div 
                    key={examiner.id}
                    ref={isHighlighted ? highlightedCardRef : null}
                    className={`grid grid-cols-12 gap-2 items-center py-2 ${hoverTransition} hover:bg-gray-50 dark:hover:bg-gray-750 ${highlightStyle} cursor-pointer`}
                    onClick={() => onExaminerClick(examiner.id)}
                  >
                    <div className="col-span-1 px-4 flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(examiner.id);
                        }}
                        className={`text-sm ${favorites[examiner.id] ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                      >
                        {favorites[examiner.id] ? '⭐' : '☆'}
                      </button>
                    </div>
                    <div className="col-span-3 px-4 flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 mr-3">
                        <img 
                          src={getProfileImage(examiner)} 
                          alt={`${examiner.name} profile`} 
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      </div>
                      <div className="truncate">
                        <div className={`text-sm font-medium ${textColor}`}>
                          {examiner.name}
                        </div>
                        <div className={`text-xs ${secondaryText} md:hidden`}>
                          {examiner.department}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 px-4">
                      <div className={`text-sm ${textColor}`}>
                        {examiner.examinerId || examiner.id}
                      </div>
                    </div>
                    <div className="col-span-3 hidden md:block px-4">
                      <div className={`text-sm ${textColor}`}>
                        {examiner.department}
                      </div>
                      <div className={`text-xs ${secondaryText}`}>
                        {examiner.position}
                      </div>
                    </div>
                    <div className="col-span-3 px-4 flex items-center justify-center space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onExaminerClick(examiner.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(examiner.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edit Examiner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(examiner.id, examiner.name);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete Examiner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExaminerList; 