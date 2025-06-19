import React, { useState, useEffect, useMemo } from 'react';
import calculationService from '../services/calculationService';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import HistoryLayout from './HistoryLayout';
import { formatDate } from '../utils/dateUtils';
import {
  getAllPdfDocumentsWithExaminers,
} from '../services/calculationService';

const PDFArchive = () => {
  const { isDarkMode } = useTheme();
  
  // State variables
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'examiner', 'department', 'month'
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'year', 'custom', 'all'
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'individual', 'history', 'merged', 'custom'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 30 : 20;
  
  // Theme styling
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const secondaryText = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const buttonBg = isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200';
  const inputBg = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorder = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const activeButtonBg = 'bg-blue-600 text-white';
  const hoverTransition = 'transition-all duration-300 ease-in-out';

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, groupBy, showFavoritesOnly, dateRange, customDateRange, typeFilter, viewMode]);

  // Fetch all documents
  useEffect(() => {
    const fetchAllDocuments = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch PDF documents from the new pdf_documents table
        const filters = {
          ...(typeFilter !== 'all' && { report_type: typeFilter }),
          ...(showFavoritesOnly && { is_favorite: true }),
          ...(dateRange === 'custom' && customDateRange.start && customDateRange.end && {
            start_date: customDateRange.start,
            end_date: customDateRange.end,
          }),
        };
        
        // Updated query to join with examiners table
        const pdfDocuments = await getAllPdfDocumentsWithExaminers(filters);
        
        // Map the documents to the format expected by the UI
        const formattedDocs = pdfDocuments.map(doc => ({
          id: doc.id,
          file_name: doc.report_name,
          file_path: doc.pdf_url, // Use pdf_url as file_path for download logic
          examinerName: doc.examiners?.full_name || 'Unknown',
          examinerID: doc.examiners?.examiner_id || 'N/A',
          department: doc.examiners?.department || 'N/A',
          calculationId: doc.calculation_id,
          created_at: doc.created_at,
          type: doc.report_type,
          isFavorite: doc.is_favorite,
          pdf_url: doc.pdf_url
        }));
        
        setDocuments(formattedDocs);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load PDF archive');
      } finally {
        setLoading(false);
      }
    };

    fetchAllDocuments();
  }, [typeFilter, showFavoritesOnly, dateRange, customDateRange]);

  // Handle document download
  const handleDownload = async (documentId, fileName) => {
    try {
      await calculationService.downloadCalculationPDF({
        pdfDocumentId: documentId,
        fileName: fileName
      });
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle document deletion
  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      // Use the new function to delete from pdf_documents
      await calculationService.deletePdfDocument(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedDocs.length} document(s)?`)) return;
    
    try {
      await Promise.all(selectedDocs.map(docId => calculationService.deletePdfDocument(docId)));
      setDocuments(documents.filter(doc => !selectedDocs.includes(doc.id)));
      setSelectedDocs([]);
      toast.success('Documents deleted successfully');
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast.error('Failed to delete documents: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle bulk download (as ZIP)
  const handleBulkDownload = async () => {
    try {
      // Get the selected document IDs
      const documentIds = selectedDocs;
      
      // Use the updated downloadDocumentsAsZip function with IDs
      await calculationService.downloadDocumentsAsZip(
        { documentIds },
        true // Use direct URLs from pdf_documents table
      );
      
      toast.success('Documents downloaded successfully');
    } catch (error) {
      console.error('Error downloading documents:', error);
      toast.error('Failed to download documents: ' + (error.message || 'Unknown error'));
    }
  };
  
  // Handle toggling favorite
  const handleToggleFavorite = async (docId) => {
    try {
      // Get current favorite status
      const doc = documents.find(d => d.id === docId);
      if (!doc) return;
      
      const newFavoriteStatus = !doc.isFavorite;
      
      // Update in database
      await calculationService.togglePdfDocumentFavorite(docId, newFavoriteStatus);
      
      // Update local state
      setDocuments(documents.map(doc => {
        if (doc.id === docId) {
          return { ...doc, isFavorite: newFavoriteStatus };
        }
        return doc;
      }));
      
      toast.success(newFavoriteStatus ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      toast.error('Failed to update favorite status: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle checkbox selection
  const handleSelectDocument = (docId) => {
    if (selectedDocs.includes(docId)) {
      setSelectedDocs(selectedDocs.filter(id => id !== docId));
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(doc => doc.id));
    }
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSortBy('date_desc');
    setGroupBy('none');
    setDateRange('all');
    setCustomDateRange({ start: null, end: null });
    setTypeFilter('all');
    setShowFavoritesOnly(false);
  };
  
  // Filter by date range
  const filterByDateRange = (docs) => {
    if (dateRange === 'all') return docs;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return docs.filter(doc => {
      const docDate = new Date(doc.created_at);
      
      switch (dateRange) {
        case 'today':
          return docDate >= todayStart;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          return docDate >= weekStart;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return docDate >= monthStart;
        case 'year':
          const yearStart = new Date(now.getFullYear(), 0, 1);
          return docDate >= yearStart;
        case 'custom':
          if (!customDateRange.start || !customDateRange.end) return true;
          const start = new Date(customDateRange.start);
          const end = new Date(customDateRange.end);
          end.setHours(23, 59, 59, 999); // End of day
          return docDate >= start && docDate <= end;
        default:
          return true;
      }
    });
  };

  // Filter documents based on all criteria
  const filterDocuments = () => {
    let filtered = [...documents];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        (doc.file_name && doc.file_name.toLowerCase().includes(query)) ||
        (doc.examinerName && doc.examinerName.toLowerCase().includes(query)) ||
        (doc.examinerID && doc.examinerID.toLowerCase().includes(query))
      );
    }
    
    // Filter by date range
    filtered = filterByDateRange(filtered);
    
    // Filter by document type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }
    
    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(doc => doc.isFavorite);
    }
    
    return filtered;
  };

  // Sort documents
  const sortDocuments = (docs) => {
    return [...docs].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'date_desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'name_asc':
          return (a.file_name || '').localeCompare(b.file_name || '');
        case 'name_desc':
          return (b.file_name || '').localeCompare(a.file_name || '');
        case 'examiner_asc':
          return (a.examinerName || '').localeCompare(b.examinerName || '');
        case 'examiner_desc':
          return (b.examinerName || '').localeCompare(a.examinerName || '');
        case 'size_asc':
          return (a.size || 0) - (b.size || 0);
        case 'size_desc':
          return (b.size || 0) - (a.size || 0);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  };

  // Group documents
  const groupDocuments = (docs) => {
    if (groupBy === 'none') return { 'All Documents': docs };
    
    return docs.reduce((groups, doc) => {
      let groupKey;
      
      switch (groupBy) {
        case 'examiner':
          groupKey = doc.examinerName || 'Unknown';
          break;
        case 'department':
          groupKey = doc.department || 'Unknown';
          break;
        case 'type':
          groupKey = doc.type ? doc.type.charAt(0).toUpperCase() + doc.type.slice(1) : 'Unknown';
          break;
        case 'month':
          const date = new Date(doc.created_at);
          groupKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
          break;
        default:
          groupKey = 'All Documents';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(doc);
      return groups;
    }, {});
  };

  // Calculate filtered documents
  const filteredDocs = useMemo(() => {
    const filtered = filterDocuments();
    return sortDocuments(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, searchQuery, sortBy, dateRange, customDateRange, typeFilter, showFavoritesOnly]);
  
  // Calculate pagination info
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  
  // Get paginated results - not actively changing UI but using the variable to avoid lint warning
  const paginatedDocs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDocs.slice(startIndex, endIndex);
  }, [filteredDocs, currentPage, itemsPerPage]);
  
  // For debugging purposes only - not shown in UI
  useEffect(() => {
    console.log(`Page ${currentPage} of ${totalPages} (${paginatedDocs.length} items)`);
  }, [currentPage, totalPages, paginatedDocs]);

  // Render document grid with new design
  const renderDocumentGrid = (documents) => {
    // Get the current slice of documents for pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDocs = documents.slice(startIndex, endIndex);
    
    return (
      <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedDocs.map(doc => {
            // Determine background color based on document type
            let cardBgColor = '';
            let typeBgColor = '';
            let typeTextColor = '';
            let typeLabel = '';
            
            // Normalize the type value (handle both lowercase and other formats)
            const docType = (doc.type || '').toLowerCase();
            
            if (docType.includes('individual')) {
              cardBgColor = isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50';
              typeBgColor = 'bg-blue-100';
              typeTextColor = 'text-blue-800';
              typeLabel = 'Individual';
            } else if (docType.includes('history') || docType.includes('examiner')) {
              cardBgColor = isDarkMode ? 'bg-green-900/20' : 'bg-green-50';
              typeBgColor = 'bg-green-100';
              typeTextColor = 'text-green-800';
              typeLabel = 'Examiner';
            } else if (docType.includes('merged')) {
              cardBgColor = isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50';
              typeBgColor = 'bg-amber-100';
              typeTextColor = 'text-amber-800';
              typeLabel = 'Merged';
            } else if (docType.includes('custom')) {
              cardBgColor = isDarkMode ? 'bg-rose-900/20' : 'bg-rose-50';
              typeBgColor = 'bg-rose-100';
              typeTextColor = 'text-rose-800';
              typeLabel = 'Custom';
            } else {
              // Default/fallback
              cardBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
              typeBgColor = 'bg-gray-100';
              typeTextColor = 'text-gray-800';
              typeLabel = 'Custom';
            }

            return (
          <div key={doc.id} 
                className={`rounded-lg shadow-md overflow-hidden border ${borderColor} relative ${hoverTransition} hover:shadow-lg transform hover:-translate-y-1 ${cardBgColor}`}
          >
            {/* Selection checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input 
                type="checkbox" 
                checked={selectedDocs.includes(doc.id)}
                onChange={() => handleSelectDocument(doc.id)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            
                {/* Favorite button - Top right */}
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => handleToggleFavorite(doc.id)}
                className={`${hoverTransition} transform hover:scale-110`}
              >
                <svg 
                  className={`h-5 w-5 ${doc.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`} 
                  fill={doc.isFavorite ? "currentColor" : "none"} 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                  />
                </svg>
              </button>
            </div>
            
            {/* PDF Thumbnail */}
            <div className="h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
              <svg className="h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              
              {/* Type Badge */}
              <div className="absolute bottom-1 right-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                      ${typeBgColor} ${typeTextColor}
                      dark:opacity-90
                `}>
                      {typeLabel}
                </span>
              </div>
            </div>
            
                {/* Document info with three sections */}
                <div className="p-3">
                  {/* Section 1: PDF Name and Generated Date */}
                  <div className="mb-2">
                    <h3 className={`${textColor} font-medium text-sm mb-1 truncate`} title={doc.file_name}>
                {doc.file_name}
              </h3>
                    <p className={`${secondaryText} text-xs`}>
                      Generated: {formatDate(doc.created_at)}
                    </p>
                  </div>
                  
                  {/* Section 2: Examiner Details */}
                  <div className="mb-3">
                    <p className={`${textColor} text-xs truncate`}>
                      {doc.examinerName || 'Unknown'}
              </p>
                    <p className={`${secondaryText} text-xs truncate`}>
                      {doc.department || 'N/A'} {doc.examinerID ? `· ID: ${doc.examinerID}` : ''}
              </p>
                  </div>
              
                  {/* Section 3: Actions */}
                  <div className="flex justify-end space-x-1">
                <button 
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                      className="p-1.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Download PDF"
                >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button 
                      onClick={() => handleViewPDF(doc.id, doc.file_name)}
                      className="p-1.5 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                      title="View PDF"
                >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleDelete(doc.id)}
                      className="p-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  title="Delete PDF"
                >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
            );
          })}
        </div>
        
        {/* Pagination */}
        {documents.length > itemsPerPage && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center px-4">
                <span className={`text-sm ${textColor}`}>
                  Page {currentPage} of {Math.ceil(documents.length / itemsPerPage)}
                </span>
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(documents.length / itemsPerPage)))}
                disabled={currentPage >= Math.ceil(documents.length / itemsPerPage)}
                className={`px-3 py-1 rounded-md ${
                  currentPage >= Math.ceil(documents.length / itemsPerPage)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render document list with new design
  const renderDocumentList = (documents) => {
    // Get the current slice of documents for pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDocs = documents.slice(startIndex, endIndex);
    
    return (
      <div>
      <div className={`${cardBg} rounded-lg shadow overflow-hidden border ${borderColor}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    checked={selectedDocs.length === documents.length && documents.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Document Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Generated At
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Examiner Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Department
                </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedDocs.map(doc => {
                  // Determine badge colors based on document type
                  let typeBgColor = '';
                  let typeTextColor = '';
                  let typeLabel = '';
                  
                  // Normalize the type value (handle both lowercase and other formats)
                  const docType = (doc.type || '').toLowerCase();
                  
                  if (docType.includes('individual')) {
                    typeBgColor = 'bg-blue-100';
                    typeTextColor = 'text-blue-800';
                    typeLabel = 'Individual';
                  } else if (docType.includes('history') || docType.includes('examiner')) {
                    typeBgColor = 'bg-green-100';
                    typeTextColor = 'text-green-800';
                    typeLabel = 'Examiner';
                  } else if (docType.includes('merged')) {
                    typeBgColor = 'bg-amber-100';
                    typeTextColor = 'text-amber-800';
                    typeLabel = 'Merged';
                  } else if (docType.includes('custom')) {
                    typeBgColor = 'bg-rose-100';
                    typeTextColor = 'text-rose-800';
                    typeLabel = 'Custom';
                  } else {
                    // Default/fallback
                    typeBgColor = 'bg-gray-100';
                    typeTextColor = 'text-gray-800';
                    typeLabel = 'Custom';
                  }

                  return (
                <tr key={doc.id} className={`${hoverTransition} hover:bg-gray-50 dark:hover:bg-gray-750`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => handleSelectDocument(doc.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                            <div className={`text-sm font-bold ${textColor}`}>
                          {doc.file_name}
                        </div>
                      </div>
                    </div>
                  </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-sm ${textColor}`}>
                          {formatDate(doc.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`text-sm ${textColor}`}>
                      {doc.examinerName || 'Unknown'}
                    </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`text-sm ${textColor}`}>
                      {doc.department || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${typeBgColor} ${typeTextColor}
                          dark:opacity-90
                    `}>
                          {typeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-3">
                      <button 
                        onClick={() => handleDownload(doc.id, doc.file_name)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                        title="Download PDF"
                      >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button 
                            onClick={() => handleViewPDF(doc.id, doc.file_name)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors"
                            title="View PDF"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleFavorite(doc.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors"
                            title={doc.isFavorite ? "Remove from favorites" : "Add to favorites"}
                          >
                            <svg 
                              className="h-4 w-4" 
                              fill={doc.isFavorite ? "currentColor" : "none"} 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                              />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete PDF"
                      >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        </div>
        
        {/* Pagination */}
        {documents.length > itemsPerPage && (
          <div className="mt-6 flex justify-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center px-4">
                <span className={`text-sm ${textColor}`}>
                  Page {currentPage} of {Math.ceil(documents.length / itemsPerPage)}
                </span>
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(documents.length / itemsPerPage)))}
                disabled={currentPage >= Math.ceil(documents.length / itemsPerPage)}
                className={`px-3 py-1 rounded-md ${
                  currentPage >= Math.ceil(documents.length / itemsPerPage)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Function to handle viewing PDF
  const handleViewPDF = async (documentId, fileName) => {
    try {
      // First download the PDF
      await calculationService.downloadCalculationPDF({
        pdfDocumentId: documentId,
        fileName: fileName
      });
      
      // Then open it in a new tab or use a PDF viewer component
      toast.success('Opening PDF viewer');
      
      // This is a simplified version - you might want to implement a proper PDF viewer
      // For now, we're just downloading the file which the browser will open
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error('Failed to view PDF: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <HistoryLayout>
      {/* Header - Updated to match Calculation Archive style */}
      <div className="pr-6 pl-4 pt-6 pb-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <h1 className={`text-2xl font-bold ${textColor}`}>PDF Archives</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex">
              <button 
                onClick={() => setViewMode('list')} 
                className={`h-8 flex items-center justify-center rounded-l-lg px-2 border ${borderColor} ${viewMode === 'list' ? activeButtonBg : buttonBg}`}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button 
                onClick={() => setViewMode('grid')} 
                className={`h-8 flex items-center justify-center rounded-r-lg px-2 border-t border-b border-r ${borderColor} ${viewMode === 'grid' ? activeButtonBg : buttonBg}`} 
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border ${borderColor} ${showFavoritesOnly ? 'bg-yellow-500 text-white' : buttonBg}`}
              title="Show only favorite documents"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${showFavoritesOnly ? 'text-white' : 'text-yellow-500'}`} fill={showFavoritesOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
        </div>
      
        {/* Search and Filters Toolbar - Updated to match Calculation Archive style */}
        <div className="flex flex-row justify-between items-center gap-3 mb-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className={`h-4 w-4 ${secondaryText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename, examiner..."
              className={`w-full h-10 pl-10 pr-4 rounded-lg ${inputBg} ${inputBorder} border text-${isDarkMode ? 'white' : 'gray-800'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`h-10 pl-3 pr-8 rounded-lg appearance-none ${inputBg} ${inputBorder} border text-${isDarkMode ? 'white' : 'gray-800'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="examiner_asc">Examiner (A-Z)</option>
                <option value="examiner_desc">Examiner (Z-A)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className={`h-4 w-4 ${secondaryText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className={`h-10 pl-3 pr-8 rounded-lg appearance-none ${inputBg} ${inputBorder} border text-${isDarkMode ? 'white' : 'gray-800'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="none">No Grouping</option>
                <option value="examiner">Group by Examiner</option>
                <option value="department">Group by Department</option>
                <option value="type">Group by Type</option>
                <option value="month">Group by Month</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className={`h-4 w-4 ${secondaryText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={`h-10 pl-3 pr-8 rounded-lg appearance-none ${inputBg} ${inputBorder} border text-${isDarkMode ? 'white' : 'gray-800'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="all">All Types</option>
                <option value="individual">Individual Report</option>
                <option value="history">Examiner Report</option>
                <option value="merged">Merged Report</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className={`h-4 w-4 ${secondaryText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <button 
              onClick={handleClearFilters} 
              className="h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </div>
        
        {/* Document Count */}
        <div className="flex items-center mb-4">
          <span className={`text-sm ${secondaryText}`}>
            Showing {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative pr-6 pl-4 pb-20">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className={`mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-600 ${isDarkMode ? 'bg-red-900/20 border-red-800 text-red-400' : ''}`}>
            {error}
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && filteredDocs.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-16 ${cardBg} rounded-lg border ${borderColor}`}>
            <svg className="h-20 w-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3 className={`mt-4 text-lg font-medium ${textColor}`}>No PDF reports found</h3>
            <p className={`mt-2 text-sm ${secondaryText} max-w-md mx-auto text-center`}>
              {searchQuery || dateRange !== 'all' || typeFilter !== 'all' || showFavoritesOnly ? 
                'No documents match your search criteria. Try changing your filters to see all documents.' : 
                'No PDF documents are available in the archive. Generate reports to see them here.'}
            </p>
            <div className="mt-4">
              {(searchQuery || dateRange !== 'all' || typeFilter !== 'all' || showFavoritesOnly) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Reset Filters
                </button>
              )}
              {!searchQuery && dateRange === 'all' && typeFilter === 'all' && !showFavoritesOnly && (
                <button
                  onClick={() => window.location.href = '/calculations/new'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Generate Report
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Content Based on View Mode */}
        {!loading && !error && filteredDocs.length > 0 && (
          <div className={`${hoverTransition}`}>
            {viewMode === 'grid' ? 
              Object.entries(groupDocuments(filteredDocs)).map(([group, docs]) => (
                <div key={group} className="mb-6 animate-fadeIn">
                  {groupBy !== 'none' && (
                    <h2 className={`text-lg font-semibold ${textColor} mb-3 px-1`}>{group}</h2>
                  )}
                  {renderDocumentGrid(docs)}
                </div>
              ))
              : 
              Object.entries(groupDocuments(filteredDocs)).map(([group, docs]) => (
                <div key={group} className="mb-6 animate-fadeIn">
                  {groupBy !== 'none' && (
                    <h2 className={`text-lg font-semibold ${textColor} mb-3 px-1`}>{group}</h2>
                  )}
                  {renderDocumentList(docs)}
                </div>
              ))
            }
          </div>
        )}
        
        {/* Bulk Actions */}
        {selectedDocs.length > 0 && (
          <div className={`fixed bottom-0 left-0 right-0 ${cardBg} shadow-lg border-t ${borderColor} p-3 z-50 transform transition-transform duration-300 ease-in-out`}>
            <div className="container mx-auto pr-6 pl-4 flex justify-between items-center">
              <div className={`${textColor}`}>
                <span className="font-medium">{selectedDocs.length}</span> item{selectedDocs.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedDocs([])}
                  className="h-10 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDownload}
                  className="h-10 px-4 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download ({selectedDocs.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="h-10 px-4 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete ({selectedDocs.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HistoryLayout>
  );
};

export default PDFArchive; 