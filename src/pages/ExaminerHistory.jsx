import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExaminerById } from '../services/examinerService';
import calculationService from '../services/calculationService';
import { formatDate } from '../utils/dateUtils';
import SearchBar from '../components/SearchBar';
import PaginationControls from '../components/PaginationControls';
import { useTheme } from '../contexts/ThemeContext';
import { generateHistoryReport } from '../services/reportService';
import { FiDownload, FiCalendar, FiUsers, FiFileText, FiClock, FiDollarSign, FiGrid, FiList, FiStar, FiTrash2, FiEye } from 'react-icons/fi';

/**
 * Helper function to get evaluation days count with improved fallback logic
 * @param {Object} calculation - Calculation data
 * @returns {number} - The number of evaluation days
 */
const getEvaluationDaysCount = (calculation) => {
  // Check direct total_days property first
  if (calculation.total_days && typeof calculation.total_days === 'number') {
    return calculation.total_days;
  }
  
  // Check calculation_days array length
  if (calculation.calculation_days && Array.isArray(calculation.calculation_days)) {
    return calculation.calculation_days.length;
  }
  
  // Check evaluationDays array length 
  if (calculation.evaluationDays && Array.isArray(calculation.evaluationDays)) {
    return calculation.evaluationDays.length;
  }
  
  // Check days property as fallback
  if (calculation.days && typeof calculation.days === 'number') {
    return calculation.days;
  }
  
  // If we've exhausted options, use staff as last resort or return 0
  return calculation.total_staff || 0;
};

const ExaminerHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // State for examiner info
  const [examiner, setExaminer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // State for history data
  const [calculations, setCalculations] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [activeTab, setActiveTab] = useState('calculation'); // 'calculation' or 'pdf'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [selectedItems, setSelectedItems] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month', 'year', 'custom'
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  // Fetch examiner data
  useEffect(() => {
    const fetchExaminer = async () => {
      try {
        setLoading(true);
        const data = await getExaminerById(id);
        setExaminer(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching examiner:', err);
        setError('Failed to load examiner data');
        setLoading(false);
      }
    };

    fetchExaminer();
  }, [id]);

  // Fetch calculations and PDFs
  useEffect(() => {
    if (!examiner) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        // Fetch calculations with PDF URLs included
        const calculationsData = await calculationService.getCalculationsByExaminer(id);
        setCalculations(calculationsData);
        
        // Extract PDFs from calculations that have PDF URLs
        const pdfData = calculationsData.filter(calc => calc.pdf_url);
        setPdfs(pdfData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching history data:', err);
        setError('Failed to load history data');
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id, examiner]);

  // Filter and sort data based on search query, time filter, and favorites
  const getFilteredData = () => {
    let filtered = activeTab === 'calculation' ? calculations : pdfs;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.calculation_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDate(item.created_at).includes(searchQuery)
      );
    }
    
    // Filter by time
    if (timeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (timeFilter === 'today') {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= today;
        });
      } else if (timeFilter === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= weekStart;
        });
      } else if (timeFilter === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= monthStart;
        });
      } else if (timeFilter === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.created_at);
          return itemDate >= yearStart;
        });
      } else if (timeFilter === 'custom') {
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.created_at);
          let isInRange = true;
          
          if (fromDate) {
            const fromDateObj = new Date(fromDate);
            isInRange = isInRange && itemDate >= fromDateObj;
          }
          
          if (toDate) {
            const toDateObj = new Date(toDate);
            // Add one day to include the end date
            toDateObj.setDate(toDateObj.getDate() + 1);
            isInRange = isInRange && itemDate < toDateObj;
          }
          
          return isInRange;
        });
      }
    }
    
    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(item => item.is_favorite);
    }
    
    return filtered;
  };

  const filteredData = getFilteredData();

  // Sort data based on selected option
  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'papers':
        return (b.total_papers || 0) - (a.total_papers || 0);
      case 'amount':
        return (b.final_amount || 0) - (a.final_amount || 0);
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  // Paginate data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle sort option change
  const handleSortChange = (option) => {
    setSortOption(option);
    setCurrentPage(1); // Reset to first page on new sort
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page on tab change
    setSelectedItems([]); // Clear selected items on tab change
  };

  // Handle view mode toggle
  const handleViewModeToggle = (mode) => {
    setViewMode(mode);
  };

  // Handle bulk selection
  const handleItemSelection = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Download all functionality
  const handleDownloadAll = async () => {
    if (!examiner || !examiner.id) {
      setError('Examiner information not available. Please try again.');
      return;
    }
    
    try {
      setIsDownloading(true);
      if (activeTab === 'calculation') {
        // Use reportService to generate and download a full history PDF report
        await generateHistoryReport(examiner.id, {
          download: true,
          fileName: `${examiner.full_name || 'Examiner'}_full_history_report.pdf`
        });
      } else {
        // Download all PDFs (this would typically be handled differently in a real application)
        // For demonstration, we'll just open the first PDF
        if (sortedData.length > 0 && sortedData[0].pdf_url) {
          window.open(sortedData[0].pdf_url, '_blank');
        } else {
          setError('No PDF files available to download.');
        }
      }
    } catch (err) {
      console.error('Error downloading data:', err);
      setError(`Failed to download report: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle toggling favorite status
  const handleToggleFavorite = async (id, isFavorite) => {
    try {
      // Since the toggleFavorite function doesn't exist, we'll just update the local state
      // In a real app, you would make an API call to persist this change
      
      if (activeTab === 'calculation') {
        setCalculations(calculations.map(calc => 
          calc.id === id ? { ...calc, is_favorite: !isFavorite } : calc
        ));
      } else {
        setPdfs(pdfs.map(pdf => 
          pdf.id === id ? { ...pdf, is_favorite: !isFavorite } : pdf
        ));
      }
      
      // Mock API call success message
      console.log(`Toggled favorite status for item ${id} to ${!isFavorite}`);
    } catch (err) {
      console.error('Error toggling favorite status:', err);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  // Render error state
  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </button>
      </main>
    );
  }

  // Render the calculation item in grid view
  const renderCalculationItemGrid = (calculation, index) => {
    return (
      <div 
        key={calculation.id} 
        className={`border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg relative`}
      >
        {/* Checkbox for bulk selection */}
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selectedItems.includes(calculation.id)}
            onChange={() => handleItemSelection(calculation.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        {/* Favorite star */}
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => handleToggleFavorite(calculation.id, calculation.is_favorite)}
            className="text-yellow-400 hover:text-yellow-500"
          >
            {calculation.is_favorite ? (
              <FiStar className="h-6 w-6 fill-current" />
            ) : (
              <FiStar className="h-6 w-6" />
            )}
          </button>
        </div>

        <div className="p-4 pt-8">
          {/* Date centered and bold */}
          <div className="text-center font-bold mb-4">
            <FiCalendar className="inline-block mr-1" />
            {formatDate(calculation.created_at)}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FiFileText className="inline-block mr-1" /> Papers: {calculation.total_papers || 0}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FiClock className="inline-block mr-1" /> Days: {getEvaluationDaysCount(calculation)}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FiUsers className="inline-block mr-1" /> Staff: {calculation.total_staff || 0}
            </div>
            <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              <FiDollarSign className="inline-block mr-1" /> ${calculation.final_amount?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-4">
            <button
              onClick={() => navigate(`/calculations/view/${calculation.id}`)}
              className="flex-1 min-w-0 px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition flex items-center justify-center"
            >
              <FiEye className="mr-1" /> View
            </button>
            <button
              onClick={() => window.open(calculation.pdf_url, '_blank')}
              className="flex-1 min-w-0 px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition flex items-center justify-center"
            >
              <FiDownload className="mr-1" /> Download
            </button>
            <button
              onClick={() => console.log('Delete calculation:', calculation.id)}
              className="flex-1 min-w-0 px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition flex items-center justify-center"
            >
              <FiTrash2 className="mr-1" /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render the calculation item in list view
  const renderCalculationItemList = (calculation, index) => {
    return (
      <div 
        key={calculation.id}
        className={`border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-md p-3 flex items-center transition-all duration-300 hover:shadow-lg overflow-x-auto`}
      >
        <div className="flex-shrink-0 w-8 text-center">
          {index + 1 + indexOfFirstItem}.
        </div>
        
        {/* Checkbox for bulk selection */}
        <div className="flex-shrink-0 mr-3">
          <input
            type="checkbox"
            checked={selectedItems.includes(calculation.id)}
            onChange={() => handleItemSelection(calculation.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        {/* Favorite star */}
        <div className="flex-shrink-0 mr-4">
          <button
            onClick={() => handleToggleFavorite(calculation.id, calculation.is_favorite)}
            className="text-yellow-400 hover:text-yellow-500"
          >
            {calculation.is_favorite ? (
              <FiStar className="h-5 w-5 fill-current" />
            ) : (
              <FiStar className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {/* Main content */}
        <div className="flex-grow min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium whitespace-nowrap">
              <FiCalendar className="inline-block mr-1" />
              {formatDate(calculation.created_at)}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap`}>
              Papers: {calculation.total_papers || 0}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap`}>
              Staff: {calculation.total_staff || 0}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap`}>
              Days: {getEvaluationDaysCount(calculation)}
            </span>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'} whitespace-nowrap`}>
              <FiDollarSign className="inline-block mr-1" /> ${calculation.final_amount?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex-shrink-0 flex items-center space-x-2 ml-2">
          <button
            onClick={() => navigate(`/calculations/view/${calculation.id}`)}
            className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition flex items-center"
          >
            <FiEye className="mr-1" /> View
          </button>
          <button
            onClick={() => window.open(calculation.pdf_url, '_blank')}
            className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition flex items-center"
          >
            <FiDownload className="mr-1" /> Download
          </button>
          <button
            onClick={() => console.log('Delete calculation:', calculation.id)}
            className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition flex items-center"
          >
            <FiTrash2 className="mr-1" /> Delete
          </button>
        </div>
      </div>
    );
  };

  // Render the PDF item in grid view
  const renderPDFItemGrid = (pdf, index) => {
    return (
      <div 
        key={pdf.id} 
        className={`border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg relative`}
        style={{ borderLeft: '4px solid #10B981' }} // Green border for PDF type indication
      >
        {/* Checkbox for bulk selection */}
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selectedItems.includes(pdf.id)}
            onChange={() => handleItemSelection(pdf.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        {/* Favorite star */}
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => handleToggleFavorite(pdf.id, pdf.is_favorite)}
            className="text-yellow-400 hover:text-yellow-500"
          >
            {pdf.is_favorite ? (
              <FiStar className="h-6 w-6 fill-current" />
            ) : (
              <FiStar className="h-6 w-6" />
            )}
          </button>
        </div>

        <div className="p-4 pt-8">
          {/* Date centered and bold */}
          <div className="text-center font-bold mb-4">
            <FiCalendar className="inline-block mr-1" />
            {formatDate(pdf.created_at)}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FiFileText className="inline-block mr-1" /> Papers: {pdf.total_papers || 0}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FiClock className="inline-block mr-1" /> Days: {getEvaluationDaysCount(pdf)}
            </div>
            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FiUsers className="inline-block mr-1" /> Staff: {pdf.total_staff || 0}
            </div>
            <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              <FiDollarSign className="inline-block mr-1" /> ${pdf.final_amount?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-4">
            <button
              onClick={() => window.open(pdf.pdf_url, '_blank')}
              className="flex-1 min-w-0 px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition flex items-center justify-center"
            >
              <FiDownload className="mr-1" /> Download
            </button>
            <button
              onClick={() => console.log('Delete PDF:', pdf.id)}
              className="flex-1 min-w-0 px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition flex items-center justify-center"
            >
              <FiTrash2 className="mr-1" /> Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render the PDF item in list view
  const renderPDFItemList = (pdf, index) => {
    return (
      <div 
        key={pdf.id}
        className={`border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg shadow-md p-3 flex items-center transition-all duration-300 hover:shadow-lg overflow-x-auto`}
        style={{ borderLeft: '4px solid #10B981' }} // Green border for PDF type indication
      >
        <div className="flex-shrink-0 w-8 text-center">
          {index + 1 + indexOfFirstItem}.
        </div>
        
        {/* Checkbox for bulk selection */}
        <div className="flex-shrink-0 mr-3">
          <input
            type="checkbox"
            checked={selectedItems.includes(pdf.id)}
            onChange={() => handleItemSelection(pdf.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        
        {/* Favorite star */}
        <div className="flex-shrink-0 mr-4">
          <button
            onClick={() => handleToggleFavorite(pdf.id, pdf.is_favorite)}
            className="text-yellow-400 hover:text-yellow-500"
          >
            {pdf.is_favorite ? (
              <FiStar className="h-5 w-5 fill-current" />
            ) : (
              <FiStar className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {/* Main content */}
        <div className="flex-grow min-w-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={`font-medium truncate max-w-[180px] ${isDarkMode ? 'text-white' : 'text-gray-800'}`} title={pdf.calculation_name || 'Unnamed PDF'}>
              {pdf.calculation_name || 'Unnamed PDF'}
            </span>
            <span className="font-medium whitespace-nowrap">
              <FiCalendar className="inline-block mr-1" />
              {formatDate(pdf.created_at)}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap`}>
              Papers: {pdf.total_papers || 0}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap`}>
              Staff: {pdf.total_staff || 0}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-nowrap`}>
              Days: {getEvaluationDaysCount(pdf)}
            </span>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'} whitespace-nowrap`}>
              <FiDollarSign className="inline-block mr-1" /> ${pdf.final_amount?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex-shrink-0 flex items-center space-x-2 ml-2">
          <button
            onClick={() => window.open(pdf.pdf_url, '_blank')}
            className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition flex items-center"
          >
            <FiDownload className="mr-1" /> Download
          </button>
          <button
            onClick={() => console.log('Delete PDF:', pdf.id)}
            className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition flex items-center"
          >
            <FiTrash2 className="mr-1" /> Delete
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <main className={`w-full min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'text-gray-900'}`}>
      {/* Header Section */}
      <div className="py-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h1 className="text-2xl font-bold">
              {examiner?.full_name || 'Examiner'}'s History
            </h1>
            <button 
              onClick={handleDownloadAll}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded hover:bg-blue-700 transition ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''}`}
              disabled={isDownloading || loading}
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FiDownload />
              )}
              <span>{isDownloading ? 'Generating...' : 'Download Full Report'}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-6 space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('calculation')}
            className={`px-4 py-2 text-sm font-medium rounded ${
              activeTab === 'calculation'
                ? isDarkMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-500 text-white'
                : isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Calculation History
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pdf')}
            className={`px-4 py-2 text-sm font-medium rounded ${
              activeTab === 'pdf'
                ? isDarkMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-500 text-white'
                : isDarkMode 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            PDF History
          </button>
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search Bar */}
          <div className="w-full sm:w-auto flex-grow md:max-w-md">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by title or date..."
              className="w-full"
            />
          </div>
          
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => document.getElementById('sort-dropdown').classList.toggle('hidden')}
            >
              <span>Sort by</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              id="sort-dropdown"
              className={`absolute z-10 mt-1 w-48 rounded-md shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ring-1 ring-black ring-opacity-5 hidden`}
            >
              <div className="py-1" role="menu" aria-orientation="vertical">
                {[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'papers', label: 'Total Papers' },
                  { value: 'amount', label: 'Final Amount' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      handleSortChange(option.value);
                      document.getElementById('sort-dropdown').classList.add('hidden');
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      sortOption === option.value
                        ? isDarkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-blue-50 text-blue-700'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Time Filter */}
          <div className="relative">
            <button
              className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => document.getElementById('time-dropdown').classList.toggle('hidden')}
            >
              <FiCalendar className="inline-block" />
              <span>{timeFilter === 'all' ? 'All Time' : 
                    timeFilter === 'today' ? 'Today' :
                    timeFilter === 'week' ? 'This Week' :
                    timeFilter === 'month' ? 'This Month' :
                    timeFilter === 'year' ? 'This Year' :
                    'Custom Range'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              id="time-dropdown"
              className={`absolute z-10 mt-1 w-48 rounded-md shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ring-1 ring-black ring-opacity-5 hidden`}
            >
              <div className="py-1" role="menu" aria-orientation="vertical">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'year', label: 'This Year' },
                  { value: 'custom', label: 'Custom Range' }
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => {
                      setTimeFilter(period.value);
                      document.getElementById('time-dropdown').classList.add('hidden');
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      timeFilter === period.value
                        ? isDarkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-blue-50 text-blue-700'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Custom Date Range */}
          {timeFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={fromDate || ''}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="From date"
                />
              </div>
              <span className="text-sm">to</span>
              <div className="relative">
                <input
                  type="date"
                  value={toDate || ''}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`px-3 py-2 text-sm rounded border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="To date"
                />
              </div>
              <button
                onClick={() => {
                  setFromDate(null);
                  setToDate(null);
                }}
                className={`px-2 py-1 text-xs rounded ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Clear
              </button>
            </div>
          )}
          
          {/* View Toggle */}
          <div className="flex">
            <button
              type="button"
              onClick={() => handleViewModeToggle('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-l ${
                viewMode === 'grid'
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FiGrid className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeToggle('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r ${
                viewMode === 'list'
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } border-l ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
            >
              <FiList className="h-5 w-5" />
            </button>
          </div>
          
          {/* Favorites Filter */}
          <button 
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-2 text-sm font-medium rounded inline-flex items-center ${
              showFavoritesOnly
                ? isDarkMode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-500 text-white'
                : isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <FiStar className={`mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} /> 
            Favorites
          </button>
        </div>
        
        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className={`p-3 rounded flex flex-wrap justify-between items-center border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="mb-2 sm:mb-0">
              <span className="font-medium">{selectedItems.length} item(s) selected</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition flex items-center">
                <FiDownload className="mr-1" /> Download Selected
              </button>
              <button className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition flex items-center">
                <FiTrash2 className="mr-1" /> Delete Selected
              </button>
            </div>
          </div>
        )}
        
        {/* Items Grid/List */}
        {currentItems.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` 
            : `flex flex-col space-y-3`
          }>
            {currentItems.map((item, index) => {
              if (activeTab === 'calculation') {
                return viewMode === 'grid'
                  ? renderCalculationItemGrid(item, index)
                  : renderCalculationItemList(item, index);
              } else {
                return viewMode === 'grid'
                  ? renderPDFItemGrid(item, index)
                  : renderPDFItemList(item, index);
              }
            })}
          </div>
        ) : (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} rounded-lg`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium mb-1">No {activeTab === 'calculation' ? 'calculations' : 'PDFs'} found</p>
            <p>Try changing your search criteria or create new calculations</p>
          </div>
        )}
        
        {/* Pagination */}
        {sortedData.length > 0 && (
          <div className="mt-8">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </main>
  );
};

export default ExaminerHistory; 