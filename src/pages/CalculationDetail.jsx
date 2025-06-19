import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import calculationService from '../services/calculationService';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';

const CalculationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get examiner name from location state if available
  const examinerName = location.state?.examinerName;
  
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
        
        // Pass examiner name to breadcrumbs via location state if not already set
        if (data && data.examiner_name && !examinerName) {
          // Update location state with the examiner name without navigating
          window.history.replaceState(
            { 
              ...location.state, 
              examinerName: data.examiner_name 
            }, 
            ''
          );
        }
        
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
  }, [id, examinerName, location.state]);

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
    const newFavoriteState = !isFavorite;
    
    if (isFavorite) {
      newFavorites = favorites.filter(calcId => calcId !== id);
      toast.success('Removed from favorites');
    } else {
      newFavorites = [...favorites, id];
      toast.success('Added to favorites');
    }
    
    // Update localStorage
    localStorage.setItem('favoriteCalculations', JSON.stringify(newFavorites));
    
    // Update component state
    setIsFavorite(newFavoriteState);
    
    // Update location state with new favorite status for breadcrumb
    window.history.replaceState(
      { 
        ...location.state, 
        isFavorite: newFavoriteState
      }, 
      ''
    );
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
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
    );
  }

  if (!calculation) {
    return (
      <div className="w-full">
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
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Action buttons at top right */}
      <div className="flex justify-end mb-4 space-x-2">
        <button
          onClick={() => navigate('/calculation-archive')}
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Back to Calculations
        </button>

        <button
          onClick={handleDelete}
          className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Delete
        </button>

        {calculation.pdf_url ? (
          <a
            href={calculation.blob_url || calculation.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View PDF
          </a>
        ) : (
          <button
            onClick={handleGeneratePDF}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate PDF
          </button>
        )}
      </div>
      
      {/* Title & Context with new styling */}
      <div className="mb-6 bg-[#D6E8FF] rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1D4ED8] flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {calculation.examiner_name || examinerName ? `${calculation.examiner_name || examinerName}'s Calculation` : 'Examiner Calculation Details'}
            </h1>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center text-[#1D4ED8]">
              <div className="flex items-center mr-4 mb-2 sm:mb-0">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span className="font-medium">Examiner: {calculation.examiner_name || examinerName || 'Unknown'}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span>Calculated On: {formatDate(calculation.calculation_date || calculation.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex">
            <button
              onClick={toggleFavorite}
              className={`flex items-center justify-center h-10 w-10 rounded-full focus:outline-none ${
                isFavorite ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-500'
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <span className="text-xl">{isFavorite ? "⭐" : "☆"}</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Summary Cards (Grid Format) - Keeping these as is */}
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
                ₹{calculation.incentive_amount || calculation.incentive || 0}
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
              Total Days: {calculation.total_days || (calculation.evaluationDays && calculation.evaluationDays.length) || 0}
            </p>
          </div>
        </div>
      </div>
      
      {/* Evaluation Summary - Similar to PDF report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Evaluation Summary
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
                  Staff Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Papers Evaluated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {calculation.evaluationDays && calculation.evaluationDays.length > 0 ? (
                calculation.evaluationDays.map((day, index) => {
                  // Get staff count - make sure we're using the proper value
                  const staffCount = day.staff_count || (day.staff ? day.staff.length : 0);
                  
                  // Get total papers - ensure it's a number
                  const totalPapers = parseInt(day.total_papers || 0, 10);
                  
                  return (
                  <tr key={day.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(day.evaluation_date || day.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {staffCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {totalPapers}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No evaluation days recorded
                  </td>
                </tr>
              )}
              {/* Total row */}
              {calculation.evaluationDays && calculation.evaluationDays.length > 0 && (
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {calculation.evaluationDays.reduce((sum, day) => sum + (day.staff_count || (day.staff ? day.staff.length : 0)), 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {calculation.evaluationDays.reduce((sum, day) => sum + parseInt(day.total_papers || 0, 10), 0)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Staff Evaluation Details - Grouped by day with separate tables */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Staff Evaluation Details
          </h3>
        </div>
        
        {calculation.evaluationDays && calculation.evaluationDays.some(day => day.staff && day.staff.length > 0) ? (
          calculation.evaluationDays.map((day, dayIndex) => 
            day.staff && day.staff.length > 0 ? (
              <div key={dayIndex} className="mb-4 last:mb-0">
                <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-y border-blue-100 dark:border-blue-800">
                  <h4 className="text-md font-medium text-blue-700 dark:text-blue-300">
                    Staff Evaluation Table for {formatDate(day.evaluation_date || day.date)}
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Staff Name
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Papers Evaluated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {day.staff.map((staff, staffIndex) => {
                        // Ensure papers count is a number
                        const papersCount = parseInt(
                          staff.papers_evaluated || 
                          staff.papers || 
                          0, 
                          10
                        );
                        
                        return (
                        <tr key={`${dayIndex}-${staffIndex}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {staff.staff_name || staff.name || `Staff ${staffIndex + 1}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                              {papersCount}
                          </td>
                        </tr>
                        );
                      })}
                      {/* Total row for this day */}
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          Total
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                          {day.total_papers || day.staff.reduce((sum, staff) => 
                            sum + parseInt(
                              staff.papers_evaluated || 
                              staff.papers || 
                              0, 
                              10
                            ), 0
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null
          )
        ) : (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No staff evaluation details available
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculationDetail; 