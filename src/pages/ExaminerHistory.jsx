import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExaminerById } from '../services/examinerService';
import calculationService from '../services/calculationService';
import { formatDate } from '../utils/dateUtils';
import SearchBar from '../components/SearchBar';
import SortDropdown from '../components/SortDropdown';
import PaginationControls from '../components/PaginationControls';
import { useTheme } from '../contexts/ThemeContext';
import reportService from '../services/reportService';
import { FiDownload } from 'react-icons/fi';

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

  // Filter and sort data based on search query and sort option
  const filteredData = activeTab === 'calculation' 
    ? calculations.filter(calc => 
        calc.calculation_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDate(calc.created_at).includes(searchQuery)
      )
    : pdfs.filter(pdf => 
        pdf.calculation_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDate(pdf.created_at).includes(searchQuery)
      );

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
      case 'favorites':
        return (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0);
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
  };

  // Handle view mode toggle
  const handleViewModeToggle = (mode) => {
    setViewMode(mode);
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
        await reportService.generateHistoryReport(examiner.id, {
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
      await calculationService.toggleFavorite(id, !isFavorite);
      
      // Update the local state
      if (activeTab === 'calculation') {
        setCalculations(calculations.map(calc => 
          calc.id === id ? { ...calc, is_favorite: !isFavorite } : calc
        ));
      } else {
        setPdfs(pdfs.map(pdf => 
          pdf.id === id ? { ...pdf, is_favorite: !isFavorite } : pdf
        ));
      }
    } catch (err) {
      console.error('Error toggling favorite status:', err);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => navigate('/')}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Render the calculation item
  const renderCalculationItem = (calculation) => {
    return (
      <div 
        key={calculation.id} 
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${
          viewMode === 'grid' ? 'w-full' : 'flex w-full'
        }`}
      >
        <div className={`p-4 ${viewMode === 'list' ? 'flex flex-1 justify-between items-center' : ''}`}>
          <div className={viewMode === 'list' ? 'flex-1' : ''}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {calculation.calculation_name || 'Unnamed Calculation'}
              </h3>
              <button
                onClick={() => handleToggleFavorite(calculation.id, calculation.is_favorite)}
                className="text-yellow-400 hover:text-yellow-500"
              >
                {calculation.is_favorite ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.181.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.18-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                )}
              </button>
            </div>

            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              {formatDate(calculation.created_at)}
            </div>
            
            {viewMode === 'grid' && (
              <div className="mt-2">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">Papers:</span> {calculation.total_papers || 0}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">Staff:</span> {calculation.total_staff || 0}
                </div>
                <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`}>
                  Final Amount: ${calculation.final_amount?.toFixed(2) || '0.00'}
                </div>
              </div>
            )}
          </div>
          
          {viewMode === 'list' && (
            <div className="flex items-center space-x-4">
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">Papers:</span> {calculation.total_papers || 0}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className="font-medium">Staff:</span> {calculation.total_staff || 0}
              </div>
              <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                ${calculation.final_amount?.toFixed(2) || '0.00'}
              </div>
            </div>
          )}
          
          <div className={`mt-4 flex ${viewMode === 'list' ? 'ml-4' : ''}`}>
            <button
              onClick={() => navigate(`/calculations/view/${calculation.id}`)}
              className="flex-1 mr-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
            >
              View Details
            </button>
            {calculation.pdf_url && (
              <button
                onClick={() => window.open(calculation.pdf_url, '_blank')}
                className="flex-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
              >
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render the PDF item
  const renderPDFItem = (pdf) => {
    return (
      <div 
        key={pdf.id} 
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${
          viewMode === 'grid' ? 'w-full' : 'flex w-full'
        }`}
      >
        <div className={`p-4 ${viewMode === 'list' ? 'flex flex-1 justify-between items-center' : ''}`}>
          <div className={viewMode === 'list' ? 'flex-1' : ''}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {pdf.calculation_name || 'Unnamed PDF'}
              </h3>
              <button
                onClick={() => handleToggleFavorite(pdf.id, pdf.is_favorite)}
                className="text-yellow-400 hover:text-yellow-500"
              >
                {pdf.is_favorite ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.181.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.18-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                )}
              </button>
            </div>

            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
              {formatDate(pdf.created_at)}
            </div>
          </div>
          
          <div className={`mt-4 flex ${viewMode === 'list' ? 'ml-4' : ''}`}>
            <button
              onClick={() => window.open(pdf.pdf_url, '_blank')}
              className="flex-1 mr-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
            >
              View PDF
            </button>
            <button
              onClick={() => window.open(pdf.pdf_url, '_blank')}
              className="flex-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className={`w-full h-full ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header Section */}
      <div className={`w-full px-6 py-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {examiner?.full_name || 'Examiner'}'s History
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                View all historical calculations and PDFs
              </p>
              {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleDownloadAll}
                className={`flex items-center gap-1 px-4 py-2 ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded hover:bg-blue-600 transition ${isDownloading ? 'opacity-75 cursor-not-allowed' : ''}`}
                disabled={isDownloading || loading}
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <FiDownload size={16} />
                )}
                <span>{isDownloading ? 'Generating...' : 'Download Full Report'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Filters & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          {/* Tabs */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => handleTabChange('calculation')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                activeTab === 'calculation'
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
              } border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
            >
              Calculation History
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('pdf')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                activeTab === 'pdf'
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
              } border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
            >
              PDF History
            </button>
          </div>
          
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => handleViewModeToggle('grid')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                viewMode === 'grid'
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
              } border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeToggle('list')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                viewMode === 'list'
                  ? isDarkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
              } border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          {/* Search Bar */}
          <div className="w-full md:w-1/2">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by title or date..."
              className="w-full"
            />
          </div>
          
          {/* Sort Dropdown */}
          <SortDropdown
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'papers', label: 'Total Papers' },
              { value: 'amount', label: 'Final Amount' },
              { value: 'favorites', label: 'Favorites' }
            ]}
            value={sortOption}
            onChange={handleSortChange}
          />
        </div>
        
        {/* Items Grid/List */}
        <div className={`mt-6 mb-8 grid ${
          viewMode === 'grid' 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
            : 'grid-cols-1 gap-3'
        }`}>
          {currentItems.length > 0 ? (
            currentItems.map(item => 
              activeTab === 'calculation' 
                ? renderCalculationItem(item) 
                : renderPDFItem(item)
            )
          ) : (
            <div className={`col-span-full text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium mb-1">No {activeTab === 'calculation' ? 'calculations' : 'PDFs'} found</p>
              <p>Try changing your search criteria or create new calculations</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {sortedData.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mb-8"
          />
        )}
      </div>
    </div>
  );
};

export default ExaminerHistory; 