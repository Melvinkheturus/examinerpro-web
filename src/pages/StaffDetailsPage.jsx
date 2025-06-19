import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import staffService from '../services/staffService';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateUtils';

const StaffDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get examiner name and evaluation date from location state
  const examinerName = location.state?.examinerName || '';
  const evaluationDate = location.state?.evaluationDate || '';
  const totalStaffCount = location.state?.staffCount || 0;
  
  const [isLoading, setIsLoading] = useState(false);
  const [staffDetails, setStaffDetails] = useState([]);
  // Store the evaluationDayId from location state or null if not provided
  // Using it as a regular const since we don't update it after initialization
  const evaluationDayId = location.state?.evaluationDayId || null;
  
  // CSS to disable scroll wheel on number inputs
  const noScrollStyle = `
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `;
  
  // Fetch existing staff details when in edit mode (when evaluationDayId is provided)
  useEffect(() => {
    const fetchStaffDetails = async () => {
      if (evaluationDayId) {
        try {
          setIsLoading(true);
          console.log(`Fetching staff details for evaluation day ID: ${evaluationDayId}`);
          
          // Get staff evaluations for this evaluation day
          const evaluations = await staffService.getStaffEvaluations(evaluationDayId);
          
          if (evaluations && evaluations.length > 0) {
            console.log('Found existing staff evaluations:', evaluations);
            
            // Map the evaluations to our staffDetails format
            const existingStaffDetails = evaluations.map((evaluation, index) => ({
              id: index + 1,
              name: evaluation.staff_name || '',
              papersEvaluated: evaluation.papers_evaluated || 0,
              evaluationId: evaluation.id || null // Ensure this is null if no ID exists
            }));
            
            setStaffDetails(existingStaffDetails);
          } else {
            console.log('No existing staff evaluations found, creating empty form');
            // If no evaluations found, initialize with empty values
            initializeEmptyStaffDetails();
          }
        } catch (error) {
          console.error('Error fetching staff evaluations:', error);
          toast.error('Failed to load existing staff data');
          // Initialize with empty values on error
          initializeEmptyStaffDetails();
        } finally {
          setIsLoading(false);
        }
      } else {
        // When no evaluationDayId (new entry), initialize with empty values
        initializeEmptyStaffDetails();
      }
    };
    
    // Helper function to initialize empty staff details
    const initializeEmptyStaffDetails = () => {
      if (totalStaffCount > 0) {
        const initialStaffDetails = Array.from({ length: totalStaffCount }, (_, index) => ({
          id: index + 1,
          name: '',
          papersEvaluated: 0
        }));
        setStaffDetails(initialStaffDetails);
      }
    };
    
    fetchStaffDetails();
  }, [evaluationDayId, totalStaffCount]);
  
  // Handle input change for staff details
  const handleInputChange = (index, field, value) => {
    const updatedStaffDetails = [...staffDetails];
    
    if (field === 'papersEvaluated') {
      // If the input is empty, set to 0
      if (value === '') {
        updatedStaffDetails[index][field] = 0;
      } else {
        // Remove any leading zeros and convert to number
        const cleanedValue = value.replace(/^0+/, '');
        updatedStaffDetails[index][field] = cleanedValue === '' ? 0 : parseInt(cleanedValue);
      }
    } else {
      // For text fields, use the value directly
      updatedStaffDetails[index][field] = value;
    }
    
    setStaffDetails(updatedStaffDetails);
  };
  
  // Validate staff details
  const validateStaffDetails = () => {
    const errors = [];
    
    staffDetails.forEach((staff, index) => {
      if (!staff.name.trim()) {
        errors.push(`Staff #${index + 1} name is required`);
      }
      
      if (staff.papersEvaluated < 0) {
        errors.push(`Staff #${index + 1} should have a non-negative number of papers`);
      }
    });
    
    return errors;
  };
  
  // Handle save and return
  const handleSaveAndReturn = async () => {
    const errors = validateStaffDetails();
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Calculate total papers
      const totalPapers = staffDetails.reduce((sum, staff) => sum + staff.papersEvaluated, 0);
      
      console.log('Starting save process with:', {
        examinerId: id,
        evaluationDate,
        staffCount: staffDetails.length,
        totalPapers,
        isEditMode: !!evaluationDayId
      });
      
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Authentication error:', userError);
        throw userError;
      }
      
      console.log('Current authenticated user:', user.id);
      
      // Format date if needed
      let formattedDate = evaluationDate;
      if (typeof evaluationDate === 'string' && evaluationDate.includes('/')) {
        // Convert MM/DD/YYYY to YYYY-MM-DD if needed
        const [month, day, year] = evaluationDate.split('/');
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log('Reformatted date:', formattedDate);
      }
      
      console.log('Creating evaluation day with:', { id, formattedDate });
      
      // Create evaluation day record
      let evaluationDay;
      let dayId = evaluationDayId;
      
      if (!evaluationDayId) {
        // Create a new evaluation day
        try {
          evaluationDay = await staffService.createEvaluationDay(
            id,
            formattedDate
          );
          
          console.log('Created evaluation day:', evaluationDay);
          
          if (!evaluationDay || !evaluationDay.id) {
            throw new Error('Failed to create evaluation day record');
          }
          
          dayId = evaluationDay.id;
        } catch (evalDayError) {
          console.error('Error creating evaluation day:', evalDayError);
          throw new Error(`Failed to create evaluation day: ${evalDayError.message}`);
        }
      } else {
        console.log('Using existing evaluation day ID:', evaluationDayId);
      }
      
      // Prepare staff data for saving, preserving evaluation IDs if they exist
      const staffDataForSaving = staffDetails.map(staff => {
        const staffData = {
          name: staff.name,
          papersEvaluated: staff.papersEvaluated
        };
        
        // Only include id if evaluationId exists and is a valid value
        if (staff.evaluationId && typeof staff.evaluationId === 'string' && staff.evaluationId.trim() !== '') {
          staffData.id = staff.evaluationId;
        }
        
        return staffData;
      });
      
      // Save staff evaluations
      try {
        const result = await staffService.saveStaffEvaluations(
          dayId,
          staffDataForSaving
        );
        console.log('Saved staff evaluations:', result);
      } catch (staffError) {
        console.error('Error saving staff evaluations:', staffError);
        throw new Error(`Failed to save staff evaluations: ${staffError.message}`);
      }
      
      toast.success('Staff details saved successfully');
      
      // Add a small delay to ensure everything is saved before navigation
      setTimeout(() => {
        // Use a single navigation with comprehensive state instead of multiple updates
        navigate(`/calculations/new/${id}`, {
          state: {
            evaluationDayId: dayId,
            evaluationDate: formattedDate,
            totalPapers,
            staffCount: staffDetails.length,
            examinerName,
            // Add a timestamp to ensure state is recognized as new
            _ts: Date.now()
          },
          replace: true // Use replace to avoid adding to history stack
        });
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error('Error saving staff details:', error);
      toast.error('Failed to save staff details: ' + (error.message || 'Unknown error'));
      setIsLoading(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    navigate(`/calculations/new/${id}`, {
      state: { examinerName } // Pass examiner name for breadcrumbs
    });
  };

  // Add a new staff row
  const handleAddStaff = () => {
    setStaffDetails([
      ...staffDetails,
      {
        id: staffDetails.length + 1,
        name: '',
        papersEvaluated: 0
      }
    ]);
  };

  // Remove a staff row
  const handleRemoveStaff = (index) => {
    if (staffDetails.length <= 1) {
      toast.error('At least one staff member is required');
      return;
    }
    
    const updatedStaff = staffDetails.filter((_, i) => i !== index);
    // Renumber the IDs
    const renumberedStaff = updatedStaff.map((staff, i) => ({
      ...staff,
      id: i + 1
    }));
    
    setStaffDetails(renumberedStaff);
  };

  // Format the evaluation date for display
  const formattedDisplayDate = evaluationDate ? formatDate(evaluationDate) : '';

  useEffect(() => {
    // Pass all state parameters to the window location state for breadcrumb
    if (window.history.replaceState && location.state) {
      window.history.replaceState({
        ...location.state,
        evaluationDayId,
        evaluationDate,
        staffCount: totalStaffCount,
        examinerData: location.state.examinerData,
        examinerName
      }, '');
    }
  }, [evaluationDayId, evaluationDate, totalStaffCount, examinerName, location.state]);

  return (
    <>
      <style>{noScrollStyle}</style>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Header with date and Add Staff button */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {evaluationDayId ? 'Edit Staff Details' : 'Enter Staff Details'}
          </h1>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Evaluation Date:</span>
            <span className="text-base font-medium text-blue-700 dark:text-blue-400">{formattedDisplayDate}</span>
          </div>
        </div>
        
        <button
          onClick={handleAddStaff}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Staff
        </button>
      </div>
      
      {/* Staff Details Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        {/* Desktop view: Table */}
        <div className="hidden md:block overflow-x-auto mb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">
                  S.No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-7/12">
                  Staff Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-3/12">
                  Papers Evaluated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/12">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {staffDetails.map((staff, index) => (
                <tr key={staff.id}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={staff.name}
                      onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                      placeholder="Enter name"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <input
                      type="number"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      value={staff.papersEvaluated}
                      onChange={(e) => handleInputChange(index, 'papersEvaluated', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      min="0"
                    />
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleRemoveStaff(index)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Mobile view: Cards */}
        <div className="md:hidden space-y-4">
          {staffDetails.map((staff, index) => (
            <div 
              key={staff.id} 
              className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-800 dark:text-white">
                  <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                    #{index + 1}
                  </span>
                  Staff #{index + 1}
                </h3>
                <button
                  onClick={() => handleRemoveStaff(index)}
                  className="text-red-600 dark:text-red-400 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Staff Name
                  </label>
                  <input
                    type="text"
                    value={staff.name}
                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                    placeholder="Enter name"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Papers Evaluated
                  </label>
                  <input
                    type="number"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    value={staff.papersEvaluated}
                    onChange={(e) => handleInputChange(index, 'papersEvaluated', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    min="0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary and Stats */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Staff: <span className="font-medium text-gray-700 dark:text-gray-300">{staffDetails.length}</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Papers: <span className="font-medium text-gray-700 dark:text-gray-300">
                  {staffDetails.reduce((sum, staff) => sum + staff.papersEvaluated, 0)}
                </span>
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleSaveAndReturn}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save & Return'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffDetailsPage; 