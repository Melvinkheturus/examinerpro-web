import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ExaminerList from '../components/ExaminerList';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getExaminers } from '../services/examinerService';
import components from '../components/UIComponents';

// Import our new illustrated icons
import { 
  PlusIcon, 
  SearchIcon, 
  ProfileIcon
} from '../components/IllustratedIcons';

// Add new SVG icons for grid and list view
const GridViewIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M7 1H1V7H7V1ZM7 9H1V15H7V9ZM9 1H15V7H9V1ZM15 9H9V15H15V9Z" />
  </svg>
);

const ListViewIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 6L21 6.00078M8 12L21 12.0008M8 18L21 18.0007M3 6.5H4V5.5H3V6.5ZM3 12.5H4V11.5H3V12.5ZM3 18.5H4V17.5H3V18.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [examiners, setExaminers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');
  // eslint-disable-next-line no-unused-vars
  const [filterDepartment, setFilterDepartment] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [filterPosition, setFilterPosition] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  
  // New state for combined sort and filter
  const [sortFilterOption, setSortFilterOption] = useState('sort-full_name-asc');
  
  // Add new state for sort dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Check for the highlight parameter in the URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlightId = searchParams.get('highlight');
    
    if (highlightId) {
      setShowNotification(true);
      
      // Remove the parameter from URL without page refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Clear the highlight after 5 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);
  
  // Handle sort and filter changes with dropdown
  const handleSortFilterChange = (option) => {
    setSortFilterOption(option);
    setIsDropdownOpen(false);
    
    if (option === 'clear-filters') {
      // Reset filters and set default sort
      setFilterDepartment('');
      setFilterPosition('');
      setSortBy('full_name');
      setSortOrder('asc');
      setSortFilterOption('sort-full_name-asc');
      return;
    }
    
    const [type, field, value] = option.split('-');
    
    if (type === 'sort') {
      setSortBy(field);
      setSortOrder(value);
      setFilterDepartment('');
      setFilterPosition('');
    } else if (type === 'filter') {
      if (field === 'department') {
        setFilterDepartment(value);
        setFilterPosition('');
      } else if (field === 'position') {
        setFilterPosition(value);
        setFilterDepartment('');
      }
    }
  };
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Memoize fetchExaminers to prevent recreating it on each render
  const fetchExaminers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getExaminers(
        debouncedSearchTerm, 
        sortBy, 
        sortOrder, 
        filterDepartment, 
        1, // Always start with page 1
        100
      );
      
      // Transform the data to match the structure expected by ExaminerList
      const transformedData = data ? data.map(examiner => ({
        id: examiner.id,
        examinerId: examiner.examiner_id,
        name: examiner.full_name,
        department: examiner.department || 'Not assigned',
        position: examiner.position || 'Not assigned',
        examsCount: examiner.exams_count || 0,
        profileUrl: examiner.profile_url || null
      })) : [];
      
      setExaminers(transformedData);
    } catch (error) {
      console.error('Error fetching examiners:', error);
      setExaminers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, sortBy, sortOrder, filterDepartment]);
  
  useEffect(() => {
    fetchExaminers();
  }, [fetchExaminers]);
  
  const handleExaminerClick = (examinerId) => {
    navigate(`/examiners/${examinerId}`);
  };
  
  // Handle examiner deletion
  const handleExaminerDeleted = (examinerId) => {
    // Update the local state by removing the deleted examiner
    setExaminers(examiners.filter(examiner => examiner.id !== examinerId));
    // Show a notification
    components.Toast.show({
      message: 'Examiner was deleted successfully',
      type: 'success'
    });
  };
  
  // eslint-disable-next-line no-unused-vars
  const departments = [...new Set(examiners.map(e => e.department).filter(Boolean))];
  // eslint-disable-next-line no-unused-vars
  const positions = [...new Set(examiners.map(e => e.position).filter(Boolean))];
  
  const mainBgColor = isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800';
  const cardBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  
  // Get sort label for display
  const getSortLabel = () => {
    if (sortFilterOption.startsWith('sort')) {
      const sortLabels = {
        'sort-full_name-asc': 'Name (A-Z)',
        'sort-full_name-desc': 'Name (Z-A)',
        'sort-examiner_id-asc': 'ID (Ascending)',
        'sort-examiner_id-desc': 'ID (Descending)',
        'sort-department-asc': 'Department (A-Z)',
        'sort-department-desc': 'Department (Z-A)',
        'sort-created_at-desc': 'Latest',
      };
      return sortLabels[sortFilterOption] || 'Latest';
    }
    
    if (sortFilterOption.startsWith('filter-department')) {
      return sortFilterOption.split('-')[2];
    }
    
    if (sortFilterOption.startsWith('filter-position')) {
      return sortFilterOption.split('-')[2];
    }
    
    return 'Latest';
  };
  
  // Get user's display name
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return "Chief Examiner"; // Default fallback
  };
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with College Branding */}
        <TopBar collegeDetails={{
          name: 'GURU NANAK COLLEGE (AUTONOMOUS)',
          tagline: 'Affiliated to University of Madras | Accredited \'A++\' Grade by NAAC',
          department: 'CONTROLLER OF EXAMINATIONS (COE)'
        }} />
        
        {/* Main Content Area */}
        <main className={`flex-1 overflow-auto ${mainBgColor}`}>
          <div className="max-w-7xl mx-auto px-4 py-6">
            
            {/* Welcome Message */}
            <div className="mb-6">
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Welcome back, <span className="text-blue-600 dark:text-blue-400">{getUserDisplayName()}</span>
              </h1>
            </div>
            
            {/* Redesigned Search, Sort & View Controls */}
            <div className={`mb-6 ${cardBgColor} p-4 rounded-lg shadow-sm border ${borderColor}`}>
              <div className="flex items-center gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" weight={isDarkMode ? "light" : "regular"} />
                  </div>
                  <input
                    type="text"
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Search examiners..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Sort Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    className={`flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className="mr-1">Sort by:</span>
                    <span className="font-medium">{getSortLabel()}</span>
                    <svg className="ml-1 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className={`absolute z-10 mt-1 w-64 rounded-md shadow-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } ring-1 ring-black ring-opacity-5`}>
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <div className={`px-3 py-2 text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Sort Options
                        </div>
                        <button
                          onClick={() => handleSortFilterChange('sort-full_name-asc')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            isDarkMode 
                              ? 'text-gray-300 hover:bg-gray-700' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                          Name (A-Z)
                        </button>
                        <button
                          onClick={() => handleSortFilterChange('sort-full_name-desc')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            isDarkMode 
                              ? 'text-gray-300 hover:bg-gray-700' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                          Name (Z-A)
                        </button>
                        <button
                          onClick={() => handleSortFilterChange('sort-created_at-desc')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            isDarkMode 
                              ? 'text-gray-300 hover:bg-gray-700' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                          Latest
                        </button>
                        <button
                          onClick={() => handleSortFilterChange('sort-examiner_id-asc')}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            isDarkMode 
                              ? 'text-gray-300 hover:bg-gray-700' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                          ID (Ascending)
                        </button>
                        
                        {departments.length > 0 && (
                          <>
                            <div className={`px-3 py-2 text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Filter by Department
                            </div>
                            {departments.map(dept => (
                              <button
                                key={`dept-${dept}`}
                                onClick={() => handleSortFilterChange(`filter-department-${dept}`)}
                                className={`block w-full text-left px-4 py-2 text-sm ${
                                  isDarkMode 
                                    ? 'text-gray-300 hover:bg-gray-700' 
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                role="menuitem"
                              >
                                {dept}
                              </button>
                            ))}
                          </>
                        )}
                        
                        {positions.length > 0 && (
                          <>
                            <div className={`px-3 py-2 text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Filter by Position
                            </div>
                            {positions.map(pos => (
                              <button
                                key={`pos-${pos}`}
                                onClick={() => handleSortFilterChange(`filter-position-${pos}`)}
                                className={`block w-full text-left px-4 py-2 text-sm ${
                                  isDarkMode 
                                    ? 'text-gray-300 hover:bg-gray-700' 
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                role="menuitem"
                              >
                                {pos}
                              </button>
                            ))}
                          </>
                        )}
                        
                        {(filterDepartment || filterPosition) && (
                          <>
                            <div className={`px-3 py-2 text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Reset
                            </div>
                            <button
                              onClick={() => handleSortFilterChange('clear-filters')}
                              className={`block w-full text-left px-4 py-2 text-sm ${
                                isDarkMode 
                                  ? 'text-gray-300 hover:bg-gray-700' 
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                              role="menuitem"
                            >
                              Clear Filters
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* View Toggle - New Icons */}
                <div className="flex items-center">
                  <button
                    className={`p-2 rounded-md ${viewMode === 'grid' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' 
                      : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                    }`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                  >
                    <GridViewIcon className="h-5 w-5" />
                  </button>
                  
                  <button
                    className={`p-2 rounded-md ml-2 ${viewMode === 'list' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200' 
                      : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'
                    }`}
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                  >
                    <ListViewIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Summary Info and Add Examiner Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ProfileIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" weight="duotone" />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Total Examiners: {examiners.length}
                </span>
              </div>
              
              {/* Add Examiner Button - Moved here */}
              <a
                href="/add-examiner.html"
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" weight="bold" />
                Add Examiner
              </a>
            </div>
            
            {/* Notification for new examiner */}
            {showNotification && (
              <div className="mb-4">
                <components.Notification 
                  message="Examiner profile was created successfully!" 
                  type="success"
                  onClose={() => setShowNotification(false)}
                />
              </div>
            )}
            
            {/* Examiners List/Grid View */}
            <div className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">  
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading examiners...</p>
                  </div>
                </div>
              ) : examiners.length > 0 ? (
                <>
                  <ExaminerList 
                    examiners={examiners} 
                    viewMode={viewMode} 
                    onExaminerClick={handleExaminerClick}
                    onExaminerDeleted={handleExaminerDeleted}
                    isLoading={loading}
                  />
                </>
              ) : (
                <div className={`${cardBgColor} p-8 rounded-lg shadow text-center`}>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className={`mt-2 text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No examiners found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm 
                      ? `No examiners match "${searchTerm}"`
                      : 'Get started by adding your first examiner'
                    }
                  </p>
                  <div className="mt-6">
                    <a
                      href="/add-examiner.html"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" weight="bold" />
                      Add Examiner
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            {/* Floating Add Button for Mobile */}
            <div className="fixed right-6 bottom-6 md:hidden">
              <a
                href="/add-examiner.html"
                className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                aria-label="Add Examiner"
              >
                <PlusIcon className="h-6 w-6" weight="bold" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;