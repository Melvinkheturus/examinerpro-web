import React, { useState, useEffect, useMemo } from 'react';
import calculationService from '../services/calculationService';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import HistoryLayout from './HistoryLayout';
import { formatDate } from '../utils/dateUtils';

const PDFArchive = () => {
  const { isDarkMode } = useTheme();
  
  // State variables
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'examiner', 'department', 'month'
  
  // Theme styling
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const secondaryText = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const buttonBg = isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200';

  // Fetch all documents
  useEffect(() => {
    const fetchAllDocuments = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch all calculations first
        const calculations = await calculationService.getAllCalculations();
        
        // Extract all documents
        const allDocs = [];
        await Promise.all(calculations.map(async (calc) => {
          const detailedCalc = await calculationService.getCalculationById(calc.id);
          if (detailedCalc && detailedCalc.documents) {
            detailedCalc.documents.forEach(doc => {
              allDocs.push({
                ...doc,
                calculationId: detailedCalc.id,
                calculationName: detailedCalc.calculation_name,
                calculationDate: detailedCalc.calculation_date,
                examinerName: detailedCalc.examiner_name,
                examinerID: detailedCalc.examiner_id,
                department: detailedCalc.department,
                totalAmount: detailedCalc.total_amount
              });
            });
          }
        }));
        
        setDocuments(allDocs);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load PDF archive');
      } finally {
        setLoading(false);
      }
    };

    fetchAllDocuments();
  }, []);

  // Handle document download
  const handleDownload = async (documentPath) => {
    try {
      await calculationService.downloadCalculationDocument(documentPath);
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
      await calculationService.deleteDocument(docId);
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
      await Promise.all(selectedDocs.map(docId => calculationService.deleteDocument(docId)));
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
      const selectedDocPaths = documents
        .filter(doc => selectedDocs.includes(doc.id))
        .map(doc => doc.file_path);
        
      await calculationService.downloadDocumentsAsZip(selectedDocPaths);
      toast.success('Documents downloaded as ZIP');
    } catch (error) {
      console.error('Error downloading documents:', error);
      toast.error('Failed to download documents: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle document rename
  const handleRename = async (docId, newName) => {
    try {
      await calculationService.renameDocument(docId, newName);
      setDocuments(documents.map(doc => 
        doc.id === docId ? { ...doc, file_name: newName } : doc
      ));
      toast.success('Document renamed successfully');
    } catch (error) {
      console.error('Error renaming document:', error);
      toast.error('Failed to rename document: ' + (error.message || 'Unknown error'));
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
    if (selectedDocs.length === filteredDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocs.map(doc => doc.id));
    }
  };

  // Filter documents based on search query
  const filterDocuments = () => {
    if (!searchQuery) return documents;
    
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      (doc.file_name && doc.file_name.toLowerCase().includes(query)) ||
      (doc.calculationName && doc.calculationName.toLowerCase().includes(query)) ||
      (doc.examinerName && doc.examinerName.toLowerCase().includes(query)) ||
      (doc.examinerID && doc.examinerID.toLowerCase().includes(query))
    );
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
  }, []);
  
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

  // Render document grid
  const renderDocumentGrid = (documents) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map(doc => (
          <div key={doc.id} className={`${cardBg} rounded-lg shadow-md overflow-hidden border ${borderColor} relative`}>
            {/* Selection checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input 
                type="checkbox" 
                checked={selectedDocs.includes(doc.id)}
                onChange={() => handleSelectDocument(doc.id)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            
            {/* Preview image */}
            <div className="h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            {/* Document info */}
            <div className="p-4">
              <h3 className={`${textColor} font-semibold mb-1 truncate`} title={doc.file_name}>
                {doc.file_name}
              </h3>
              <p className={`${secondaryText} text-sm mb-1`}>
                {doc.examinerName || 'Unknown examiner'}
              </p>
              <p className={`${secondaryText} text-sm mb-2`}>
                {formatDate(doc.created_at)}
              </p>
              
              {/* Actions */}
              <div className="flex space-x-2 mt-2">
                <button 
                  onClick={() => handleDownload(doc.file_path)}
                  className="px-2 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                >
                  Download
                </button>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="px-2 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                >
                  Delete
                </button>
                <button 
                  onClick={() => {
                    const newName = prompt('Enter new name:', doc.file_name);
                    if (newName && newName !== doc.file_name) {
                      handleRename(doc.id, newName);
                    }
                  }}
                  className="px-2 py-1 bg-gray-600 text-white rounded-md text-xs hover:bg-gray-700"
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render document list
  const renderDocumentList = (documents) => {
    return (
      <div className={`${cardBg} rounded-lg shadow overflow-hidden border ${borderColor}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input 
                    type="checkbox" 
                    checked={selectedDocs.length === documents.length && documents.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Document Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Examiner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => handleSelectDocument(doc.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${textColor}`}>{doc.file_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${textColor}`}>{doc.examinerName || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${textColor}`}>
                      {formatDate(doc.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDownload(doc.file_path)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => {
                        const newName = prompt('Enter new name:', doc.file_name);
                        if (newName && newName !== doc.file_name) {
                          handleRename(doc.id, newName);
                        }
                      }}
                      className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 mr-2"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <HistoryLayout>
      {/* Header with Bulk Actions */}
      <div className="mb-6 px-6 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF Archives
            </h1>
            <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Access and manage your generated salary reports
            </p>
          </div>
          <div className="flex space-x-2">
            {selectedDocs.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={handleBulkDownload}
                  className={`flex items-center px-3 py-2 rounded-md text-sm ${
                    isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download ({selectedDocs.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center px-3 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete ({selectedDocs.length})
                </button>
              </div>
            )}
          </div>
        </div>
      
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

        {/* Content area */}
        <div className="px-6 pb-6">
          {/* Filters */}
          <div className={`${cardBg} shadow rounded-lg mb-4 p-4`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search */}
              <div className="col-span-1">
                <label className={`block text-sm font-medium ${secondaryText} mb-1`}>Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by filename, examiner..."
                    className={`w-full p-2 pr-8 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md`}
                  />
                  <svg className={`absolute right-2 top-2.5 h-4 w-4 ${secondaryText}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Sort By */}
              <div className="col-span-1">
                <label className={`block text-sm font-medium ${secondaryText} mb-1`}>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full p-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md`}
                >
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="name_asc">Filename (A-Z)</option>
                  <option value="name_desc">Filename (Z-A)</option>
                  <option value="examiner_asc">Examiner (A-Z)</option>
                  <option value="examiner_desc">Examiner (Z-A)</option>
                </select>
              </div>
              
              {/* View Mode */}
              <div className="col-span-1">
                <label className={`block text-sm font-medium ${secondaryText} mb-1`}>View Mode</label>
                <div className="flex border rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 py-2 flex justify-center items-center ${viewMode === 'grid' ? 'bg-blue-600 text-white' : buttonBg}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span className="ml-2">Grid</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 py-2 flex justify-center items-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : buttonBg}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span className="ml-2">List</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Group By */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <label className={`block text-sm font-medium ${secondaryText} mr-2`}>Group By:</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className={`p-2 border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md`}
                >
                  <option value="none">None</option>
                  <option value="examiner">Examiner</option>
                  <option value="department">Department</option>
                  <option value="month">Month</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <span className={`text-sm ${secondaryText} mr-2`}>
                  Total: {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          
          {/* Empty State */}
          {!loading && !error && filteredDocs.length === 0 && (
            <div className={`${cardBg} rounded-lg shadow-md p-8 text-center`}>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 className={`mt-2 text-sm font-medium ${textColor}`}>No documents found</h3>
              <p className={`mt-1 text-sm ${secondaryText}`}>
                {searchQuery 
                  ? 'No documents match your search criteria.' 
                  : 'No PDF documents are available in the archive.'}
              </p>
            </div>
          )}
          
          {/* Content Based on View Mode */}
          {!loading && !error && filteredDocs.length > 0 && (
            <>
              {viewMode === 'grid' ? 
                Object.entries(groupDocuments(filteredDocs)).map(([group, docs]) => (
                  <div key={group} className="mb-6">
                    {groupBy !== 'none' && (
                      <h2 className={`text-lg font-semibold ${textColor} mb-3 px-1`}>{group}</h2>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {renderDocumentGrid(docs)}
                    </div>
                  </div>
                ))
                : 
                Object.entries(groupDocuments(filteredDocs)).map(([group, docs]) => (
                  <div key={group} className="mb-6">
                    {groupBy !== 'none' && (
                      <h2 className={`text-lg font-semibold ${textColor} mb-3 px-1`}>{group}</h2>
                    )}
                    {renderDocumentList(docs)}
                  </div>
                ))
              }
            </>
          )}
        </div>
      </div>
    </HistoryLayout>
  );
};

export default PDFArchive; 