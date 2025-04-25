import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import calculationService from '../services/calculationService';
import Layout from '../pages/Layout';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';

const CalculationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchCalculationDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await calculationService.getCalculationById(id);
        setCalculation(data);
        
        // Check if this calculation is in favorites
        const favorites = JSON.parse(localStorage.getItem('favoriteCalculations') || '[]');
        setIsFavorite(favorites.includes(id));
      } catch (err) {
        console.error('Error fetching calculation details:', err);
        setError('Failed to load calculation details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCalculationDetails();
    }
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this calculation?')) {
      try {
        setLoading(true);
        await calculationService.deleteCalculation(id);
        toast.success('Calculation deleted successfully');
        navigate('/calculations');
      } catch (error) {
        console.error('Error deleting calculation:', error);
        toast.error('Failed to delete calculation: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setLoading(true);
      const fileName = `calculation_report_${id}_${new Date().getTime()}.pdf`;
      
      toast.loading('Generating PDF report...');
      const document = await calculationService.generateCalculationPDF(id, fileName);
      toast.dismiss();
      
      if (document) {
        toast.success('PDF generated successfully');
        
        // Update calculation with PDF URL
        setCalculation({
          ...calculation,
          pdf_url: document.pdf_url,
          blob_url: document.blob_url
        });
        
        // Ask if user wants to download
        if (window.confirm('PDF generated successfully. Would you like to view it now?')) {
          // Open the PDF URL in a new tab
          window.open(document.blob_url, '_blank');
        }
      } else {
        throw new Error('Failed to generate PDF document');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favoriteCalculations') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter(calcId => calcId !== id);
      toast.success('Removed from favorites');
    } else {
      newFavorites = [...favorites, id];
      toast.success('Added to favorites');
    }
    
    localStorage.setItem('favoriteCalculations', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-md my-4">
            <p className="text-red-600 dark:text-red-200">{error}</p>
            <button
              onClick={() => navigate('/calculations')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Calculations
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!calculation) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300 mb-4">Calculation not found.</p>
            <button
              onClick={() => navigate('/calculations')}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Calculations
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 h-full flex flex-col">
        {/* Title & Context */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Salary Calculation Details
              </h1>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center text-gray-600 dark:text-gray-300">
                <div className="flex items-center mr-4 mb-2 sm:mb-0">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span>Examiner: {calculation.examiner_name || 'Unknown'} (ID: {calculation.examiner_id?.substring(0, 8)}...)</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span>Calculated On: {formatDate(calculation.calculation_date || calculation.created_at)}</span>
                </div>
              </div>
              {calculation.notes && (
                <p className="mt-3 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  {calculation.notes}
                </p>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex">
              <button
                onClick={toggleFavorite}
                className={`flex items-center justify-center h-10 w-10 rounded-full focus:outline-none ${
                  isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                }`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <span className="text-xl">{isFavorite ? "⭐" : "☆"}</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary Cards (Grid Format) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <span className="mr-2">🗒️</span> Papers & Staff
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Papers</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-white">
                  {calculation.total_papers || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-white">
                  {calculation.total_staff || calculation.staff_count || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <span className="mr-2">💰</span> Salary Details
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Base Salary</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-white">
                  ₹{calculation.base_salary || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Incentives</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-white">
                  ₹{calculation.incentive || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <span className="mr-2">💵</span> Final Amount
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                ₹{calculation.total_amount?.toFixed(2) || calculation.final_amount?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total Days: {calculation.total_days || 0}
              </p>
            </div>
          </div>
        </div>
        
        {/* Evaluation Days Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <span className="mr-2">📅</span> Evaluation Days
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Staff Names
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Papers Evaluated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {calculation.evaluationDays && calculation.evaluationDays.length > 0 ? (
                  calculation.evaluationDays.map((day) => (
                    <tr key={day.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(day.evaluation_date || day.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {day.staff && day.staff.length > 0 
                          ? day.staff.map(s => s.staff_name).join(', ') 
                          : 'No staff details available'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {day.total_papers || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No evaluation days recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Documents Section */}
        {calculation.documents && calculation.documents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <span className="mr-2">📂</span> Generated Documents
              </h3>
            </div>
            
            <div className="p-4">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {calculation.documents.map((doc) => (
                  <li key={doc.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-sm text-gray-900 dark:text-white">{doc.file_name}</span>
                    </div>
                    <button 
                      onClick={() => calculationService.downloadCalculationDocument(doc.file_path)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/40"
                    >
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => navigate('/calculations')}
            className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to List
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete
          </button>

          {calculation.pdf_url ? (
            <a
              href={calculation.blob_url || calculation.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              View PDF
            </a>
          ) : (
            <button
              onClick={handleGeneratePDF}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Generate PDF
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CalculationDetail; 