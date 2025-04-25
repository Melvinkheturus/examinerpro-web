/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getExaminerById } from '../services/examinerService';
import toast from 'react-hot-toast';
import calculationService from '../services/calculationService';
import staffService from '../services/staffService';
import { useTheme } from '../contexts/ThemeContext';
import CustomDatePicker from '../components/CustomDatePicker';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateUtils';
import { generatePDFBlobURL } from '../components/pdf/PDFRenderer';
/* eslint-enable no-unused-vars */

// Evaluation Day class to manage evaluation data
class EvaluationDay {
  constructor(date, staffCount = 0, totalPapers = 0, id = null) {
    this.date = date;
    // Ensure proper numeric conversions with safe fallback to 0
    this.staffCount = parseInt(staffCount) || 0;
    this.totalPapers = parseInt(totalPapers) || 0;
    this.id = id;
    
    // Add debug log to trace any potential type issues
    console.log('Created EvaluationDay:', {
      date: this.date,
      staffCount: this.staffCount,
      totalPapers: this.totalPapers,
      id: this.id,
      // Show the original parameter types for debugging
      originalTypes: {
        staffCount: typeof staffCount,
        totalPapers: typeof totalPapers,
        staffCountValue: staffCount,
        totalPapersValue: totalPapers
      }
    });
  }
}

const CalculationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  
  // Add this ref to track if we've already processed the location state
  const processedLocationState = useRef(false);
  
  // State variables
  const [examiner, setExaminer] = useState(null);
  const [evaluationDays, setEvaluationDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [staffCount, setStaffCount] = useState(1);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftData, setDraftData] = useState(null);
  
  // Calculation results
  const [calculationResults, setCalculationResults] = useState({
    totalPapers: 0,
    baseSalary: 0,
    incentiveAmount: 0,
    totalSalary: 0,
    calculated: false,
    calculationId: null
  });
  
  // Initialize loading to false if we have examiner data in location state
  const [loading, setLoading] = useState(!location.state?.examinerData);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);
  
  // Calculate total papers from evaluation days (defined at component level)
  const totalPapersEvaluated = evaluationDays.reduce(
    (sum, day) => sum + (parseInt(day.totalPapers) || 0), 0
  );
  
  // Check for draft on page load
  useEffect(() => {
    if (!id) return;
    
    const draftKey = `examinerPro_draft_${id}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        
        // Only show prompt if the draft wasn't marked as calculated
        if (!parsedDraft.isCalculated) {
          // Convert plain objects back to EvaluationDay instances
          const restoredDays = parsedDraft.evaluationDays.map(day => 
            new EvaluationDay(day.date, day.staffCount, day.totalPapers, day.id)
          );
          
          setDraftData({
            ...parsedDraft,
            evaluationDays: restoredDays
          });
          setShowDraftPrompt(true);
        } else {
          // If it was calculated, just remove the draft
          localStorage.removeItem(draftKey);
        }
      } catch (error) {
        console.error('Error parsing draft data:', error);
        localStorage.removeItem(draftKey);
      }
    }
  }, [id]);
  
  // Auto-save draft whenever evaluation days change
  useEffect(() => {
    if (!id || calculationResults.calculated) return;
    
    // Only save draft if user has entered some data
    if (evaluationDays.length > 0) {
      const draftData = {
        evaluationDays,
        selectedDate,
        staffCount,
        lastSavedAt: Date.now(),
        isCalculated: false
      };
      
      localStorage.setItem(`examinerPro_draft_${id}`, JSON.stringify(draftData));
      console.log('Auto-saved draft data:', draftData);
    }
  }, [evaluationDays, selectedDate, staffCount, id, calculationResults.calculated]);

  // Handle restoring draft data
  const handleRestoreDraft = () => {
    if (!draftData) return;
    
    setEvaluationDays(draftData.evaluationDays);
    setSelectedDate(draftData.selectedDate || '');
    setStaffCount(draftData.staffCount || 1);
    setShowDraftPrompt(false);
    
    toast.success('Draft restored successfully');
  };

  // Handle starting fresh
  const handleStartFresh = () => {
    localStorage.removeItem(`examinerPro_draft_${id}`);
    setShowDraftPrompt(false);
    setEvaluationDays([]);
    setSelectedDate('');
    setStaffCount(1);
  };
  
  // Fetch examiner details on component mount
  useEffect(() => {
    // If we have examiner data in location state, use it instead of fetching
    if (location.state?.examinerData) {
      console.log("Using examiner data from location state:", location.state.examinerData);
      setExaminer(location.state.examinerData);
      return;
    }
    
    const fetchExaminerDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getExaminerById(id);
        
        if (!data) {
          setError(`No examiner found with ID: ${id}`);
          return;
        }
        
        console.log("Fetched examiner data:", data);
        setExaminer(data);
      } catch (err) {
        setError(err.message || 'Failed to load examiner details');
        console.error('Error fetching examiner:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExaminerDetails();
  }, [id, location.state]);
  
  // Check for staff details in location state
  useEffect(() => {
    // Exit early if there's no relevant state data
    if (!location?.state?.evaluationDate) {
      return;
    }
    
    // Skip processing if we've already handled this navigation state
    if (processedLocationState.current) {
      return;
    }
    
    // Mark that we've processed this state
    processedLocationState.current = true;
    
    const evaluationDayId = location?.state?.evaluationDayId;
    const evaluationDate = location?.state?.evaluationDate;
    const totalPapers = location?.state?.totalPapers;
    const returnedStaffCount = location?.state?.staffCount;
    
    console.log("Processing location state data:", { 
      evaluationDayId, evaluationDate, totalPapers, returnedStaffCount,
      currentDays: evaluationDays 
    });
    
    // Fetch evaluation day with staff details if needed
    const fetchEvaluationDay = async () => {
      try {
        // If we have an ID, fetch the data from the server
        if (evaluationDayId) {
          const evaluationDay = await staffService.getEvaluationDayWithStaff(evaluationDayId);
          
          if (evaluationDay) {
            // Create a new evaluation day object
            const newDay = new EvaluationDay(
              evaluationDate, 
              evaluationDay.staff_count || returnedStaffCount,
              evaluationDay.total_papers || totalPapers,
              evaluationDay.id
            );
            
            // Format date for comparison
            const formattedDate = new Date(evaluationDate).toISOString().split('T')[0];
            
            // Get current days into a local variable to ensure we're working with the latest state
            const currentDays = [...evaluationDays];
            console.log("Current evaluation days before update:", currentDays);
            
            // Find any days with the same date or ID
            const existingDayIndex = currentDays.findIndex(day => 
              day.id === evaluationDay.id || 
              new Date(day.date).toISOString().split('T')[0] === formattedDate
            );
            
            let updatedDays;
            if (existingDayIndex >= 0) {
              // Replace existing day
              updatedDays = [...currentDays];
              updatedDays[existingDayIndex] = newDay;
              console.log("Replaced existing day:", { old: currentDays[existingDayIndex], new: newDay });
            } else {
              // Add as new day
              updatedDays = [...currentDays, newDay];
              console.log("Added new day:", newDay);
            }
            
            // Update state with deduplicated days
            console.log("Final evaluation days after update:", updatedDays);
            setEvaluationDays(updatedDays);
            
            // Show success message only once
            toast.success('Evaluation data updated successfully');
          }
        } else {
          // Handle case where we have date and staff count but no ID yet
          const formattedDate = new Date(evaluationDate).toISOString().split('T')[0];
          
          // Make a local copy of current days
          const currentDays = [...evaluationDays];
          
          // Check if day with this date already exists
          const existingDayIndex = currentDays.findIndex(day => 
            new Date(day.date).toISOString().split('T')[0] === formattedDate
          );
          
          if (existingDayIndex >= 0) {
            // Update the existing day
            const updatedDays = [...currentDays];
            updatedDays[existingDayIndex] = new EvaluationDay(
              evaluationDate,
              returnedStaffCount,
              totalPapers,
              currentDays[existingDayIndex].id
            );
            setEvaluationDays(updatedDays);
          } else {
            // Add a new day
            setEvaluationDays([
              ...currentDays,
              new EvaluationDay(evaluationDate, returnedStaffCount, totalPapers)
            ]);
          }
          
          // Show success message only once
          toast.success('Evaluation day added to calculation');
        }
        
        // Clean up location state to prevent reprocessing
        navigate(location.pathname, { replace: true });
      } catch (error) {
        console.error("Error updating evaluation day:", error);
        toast.error("Error updating evaluation day: " + (error.message || "Unknown error"));
      }
    };
    
    fetchEvaluationDay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, evaluationDays, navigate]);
  
  // Add a new evaluation day
  const handleAddDay = async () => {
    try {
      console.log("handleAddDay called with:", { selectedDate, staffCount });
      
      if (!selectedDate) {
        toast.error('Please select a date');
        return;
      }
      
      if (staffCount < 1) {
        toast.error('Staff count must be at least 1');
        return;
      }
      
      // Check if a day with the same date already exists
      const formattedSelectedDate = new Date(selectedDate).toISOString().split('T')[0];
      const existingDayIndex = evaluationDays.findIndex(day => 
        new Date(day.date).toISOString().split('T')[0] === formattedSelectedDate
      );
      
      if (existingDayIndex >= 0) {
        toast.error('An evaluation day with this date already exists');
        return;
      }

      // Create the evaluation day in the database first to get an ID
      let newDayData;
      try {
        newDayData = await staffService.createEvaluationDay(examiner.id, selectedDate);
        console.log("Created evaluation day in database:", newDayData);
      } catch (error) {
        console.error("Error creating evaluation day in database:", error);
        toast.error("Failed to create evaluation day in database");
        return;
      }
      
      // Create a new day with the ID from the database
      const newDay = new EvaluationDay(
        selectedDate, 
        staffCount, 
        0, // No papers yet
        newDayData?.id // Use the ID from the database
      );
      
      console.log("Created new evaluation day:", newDay);
      console.log("Current evaluation days before adding:", evaluationDays);
      
      // Create a new array with all existing days plus the new one
      const updatedDays = [...evaluationDays, newDay];
      console.log("Updated evaluation days after adding:", updatedDays);
      
      // Update state
      setEvaluationDays(updatedDays);
      
      // Reset form fields
      setSelectedDate('');
      setStaffCount(1);
      
      // Reset calculation when days change
      setCalculationResults({
        totalPapers: 0,
        baseSalary: 0,
        incentiveAmount: 0,
        totalSalary: 0,
        calculated: false,
        calculationId: null
      });
      
      toast.success('Evaluation day added successfully');
    } catch (error) {
      console.error("Error in handleAddDay:", error);
      toast.error("Error adding evaluation day: " + (error.message || "Unknown error"));
    }
  };
  
  // Remove an evaluation day
  const handleRemoveDay = (index) => {
    try {
      console.log("handleRemoveDay called with index:", index);
      console.log("Current evaluation days before removal:", evaluationDays);
      
      // Create a new array without the day at the specified index
      const updatedDays = evaluationDays.filter((_, i) => i !== index);
      
      console.log("Updated evaluation days after removal:", updatedDays);
      
      // Update state with the filtered array
      setEvaluationDays(updatedDays);
      
      // Reset calculation when days change
      setCalculationResults({
        totalPapers: 0,
        baseSalary: 0,
        incentiveAmount: 0,
        totalSalary: 0,
        calculated: false,
        calculationId: null
      });
      
      toast.success('Evaluation day removed successfully');
    } catch (error) {
      console.error("Error in handleRemoveDay:", error);
      toast.error("Error removing evaluation day: " + (error.message || "Unknown error"));
    }
  };
  
  // Navigate to Staff Details page
  const handleEnterEvaluationData = (index) => {
    try {
      const day = index >= 0 ? evaluationDays[index] : null;
      
      if (day) {
        // If day already has an ID, we can directly navigate to edit existing data
        if (day.id) {
          navigate(`/staff-details/${id}`, {
            state: {
              evaluationDayId: day.id,
              evaluationDate: day.date,
              staffCount: day.staffCount
            }
          });
        } else {
          // If it's a new day with no ID yet, we need to create the evaluation day first
          navigate(`/staff-details/${id}`, {
            state: {
              evaluationDate: day.date,
              staffCount: day.staffCount
            }
          });
        }
      } else {
        // For new entries
        if (!selectedDate) {
          toast.error('Please select a date first');
          return;
        }
        
        navigate(`/staff-details/${id}`, {
          state: {
            evaluationDate: selectedDate,
            staffCount: staffCount
          }
        });
      }
    } catch (error) {
      console.error("Error navigating to staff details:", error);
      toast.error("Error opening staff details: " + (error.message || "Unknown error"));
    }
  };
  
  // Calculate salary
  const handleCalculateSalary = async () => {
    try {
      // Check if we're already calculating to prevent duplicate submissions
      if (calculating) {
        console.log('Calculation already in progress, skipping duplicate request');
        return;
      }
      
      setCalculating(true);
      
      if (evaluationDays.length === 0) {
        toast.error('Please add at least one evaluation day');
        setCalculating(false);
        return;
      }
      
      // Create synthetic staff data based on totalPapers for each day
      const enrichedDays = evaluationDays.map(day => {
        const syntheticStaff = [];
        
        if (day.totalPapers && day.staffCount) {
          // Distribute papers evenly among staff members
          const papersPerStaff = Math.floor(day.totalPapers / day.staffCount);
          const remainder = day.totalPapers % day.staffCount;
          
          for (let i = 0; i < day.staffCount; i++) {
            // Add extra papers to the first staff member if there's a remainder
            const extraPapers = i === 0 ? remainder : 0;
            syntheticStaff.push({
              name: `Staff ${i + 1}`,
              papers: papersPerStaff + extraPapers
            });
          }
        }
        
        // If the day doesn't have an ID, first try to create one in the database
        return {
          evaluation_day_id: day.id,
          date: day.date,
          // Use the synthetic staff array we just created
          staff: syntheticStaff
        };
      });
      
      // Filter out days that don't have IDs to prevent database constraint violations
      const validDays = await Promise.all(
        enrichedDays.map(async (day) => {
          // If day already has an ID, we can use it directly
          if (day.evaluation_day_id) {
            return day;
          }
          
          try {
            // If no ID exists, create an evaluation day in the database first
            const newDay = await staffService.createEvaluationDay(
              examiner.id, 
              day.date
            );
            
            if (newDay && newDay.id) {
              // Return the day with the newly created ID
              return {
                ...day,
                evaluation_day_id: newDay.id
              };
            }
            return null; // Day couldn't be created
          } catch (error) {
            console.error('Error creating evaluation day:', error);
            return null; // Skip this day if there's an error
          }
        })
      );
      
      // Filter out any null values (days that couldn't be created)
      const daysWithValidIds = validDays.filter(day => day !== null);
      
      if (daysWithValidIds.length === 0) {
        toast.error('Failed to prepare evaluation days. Please try again.');
        setCalculating(false);
        return;
      }
      
      console.log('Enriched evaluation days with valid IDs:', daysWithValidIds);
      
      // Prepare data for the edge function calculation with the correct format
      const calculationData = {
        examiner_id: examiner.id,
        evaluation_days: daysWithValidIds
      };
      
      console.log('Sending calculation data to edge function:', calculationData);
      
      // Use the edge function to calculate - the edge function already inserts into calculation_documents
      const calculationResult = await calculationService.calculateSalaryWithEdgeFunction(calculationData);
      
      console.log('Edge function calculation result:', calculationResult);
      
      if (!calculationResult) {
        console.error('Failed to calculate salary');
        setCalculating(false);
        return;
      }
      
      // Extract the calculation_id from the edge function response - don't insert again
      let calculationId = calculationResult.calculation_id;
      if (!calculationId) {
        console.warn('No calculation_id returned from edge function. PDF functionality may not work properly.');
      } else {
        console.log('Retrieved calculation ID from edge function:', calculationId);
      }
      
      // Update state with calculated values for display, including the calculation ID from edge function
      setCalculationResults({
        totalPapers: calculationResult.totalPapers,
        baseSalary: calculationResult.baseSalary,
        incentiveAmount: calculationResult.incentiveAmount,
        totalSalary: calculationResult.totalSalary,
        calculated: true,
        calculationId: calculationId // Store the calculation ID from the edge function
      });
      
      // Mark the draft as calculated or remove it
      localStorage.removeItem(`examinerPro_draft_${id}`);
      
      // Show success message
      toast.success('Calculation completed and saved!');
      setCalculating(false);
    } catch (error) {
      console.error('Error in handleCalculateSalary:', error);
      toast.error('Error: ' + (error.message || 'Unknown error'));
      setCalculating(false);
    }
  };
  
  // Download calculation as PDF
  const handleDownloadPDF = async () => {
    try {
      console.log("handleDownloadPDF called");
      
      // Validation
      if (evaluationDays.length === 0) {
        toast.error('Please add at least one evaluation day');
        return;
      }
      
      if (!calculationResults.calculated) {
        toast.error('Please calculate the salary first');
        return;
      }
      
      // Check if we have a calculationId before proceeding
      if (!calculationResults.calculationId) {
        toast.error('Unable to attach PDF: Calculation was not saved properly.');
        console.error('No calculationId found. PDF should only be added to an existing calculation.');
        setDownloading(false);
        return;
      }
      
      setDownloading(true);
      toast.loading('Generating PDF report...');
      
      // Generate a unique PDF filename
      const timestamp = new Date().getTime();
      const pdfFileName = `calculation_${examiner.id}_${timestamp}.pdf`;
      
      try {
        // Call the service to generate PDF using react-pdf/renderer
        const document = await calculationService.generateCalculationPDF(
          calculationResults.calculationId,
          pdfFileName
        );
        
        if (!document || !document.blob_url) {
          throw new Error('Failed to generate PDF document: No blob URL returned');
        }
        
        // Open the PDF in a new tab
        window.open(document.blob_url, '_blank');
          
          toast.dismiss();
        toast.success('PDF generated successfully');
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.dismiss();
        toast.error(`Failed to generate PDF: ${error.message}`);
      }
    } catch (error) {
      console.error("Error in handleDownloadPDF:", error);
      toast.dismiss();
      toast.error("Failed to download PDF: " + (error.message || "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    localStorage.removeItem(`evaluationDays_${id}`);
    setEvaluationDays([]);
    setSelectedDate('');
    setStaffCount(1);
    setCalculationResults({
      totalPapers: 0,
      baseSalary: 0,
      incentiveAmount: 0,
      totalSalary: 0,
      calculated: false,
      calculationId: null
    });
    toast.success('Form has been reset');
  };
  
  // Handle change date from the custom date picker
  const handleDateChange = (date) => {
    if (date) {
      // Format date to yyyy-MM-dd for the input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    } else {
      setSelectedDate('');
    }
  };
  
  // If loading, show loading spinner
  if (loading && !location.state?.examinerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If error, show error message
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <a
            href="/dashboard"
            className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md inline-block"
            onClick={(e) => {
              console.log("Return to Dashboard link clicked");
              try {
                navigate('/dashboard');
              } catch (error) {
                console.error("Navigation error:", error);
                // Let the browser handle it via the href
              }
            }}
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }
  
  // Draft restore modal component
  const DraftPromptModal = () => {
    if (!showDraftPrompt) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all animate-scaleIn ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <div className="flex items-center mb-4">
            <div className="mr-3 bg-blue-100 p-2 rounded-full dark:bg-blue-900">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium">Unsaved Calculation Found</h3>
          </div>
          
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            You have an unfinished calculation for this examiner. Would you like to restore it?
          </p>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-3 justify-end">
            <button
              onClick={handleStartFresh}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
            >
              Start New
            </button>
            <button
              onClick={handleRestoreDraft}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Restore Draft
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Draft Prompt Modal */}
      {showDraftPrompt && <DraftPromptModal />}
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className={`text-2xl font-bold mb-2 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Calculation
            </h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage evaluation data and calculate payment for {examiner?.full_name || 'the examiner'}
            </p>
          </div>
          
          <div className="flex mt-4 md:mt-0 space-x-2">
            <button
              onClick={() => navigate(-1)}
              className={`px-4 py-2 border rounded-md flex items-center ${
                isDarkMode 
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            
            <button
              onClick={handleRefresh}
              className={`px-4 py-2 border rounded-md flex items-center ${
                isDarkMode 
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {examiner && (
          <>
            <div className="mt-4">
              {/* 2. Evaluation Schedule Section */}
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center">
                  <span className="border-b-2 border-blue-500 pb-1">EVALUATION SCHEDULE</span>
                </h2>
                
                <div className="flex flex-row gap-4 mb-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Evaluation Date
                    </label>
                    <div className="h-[38px]">
                      <CustomDatePicker
                        selectedDate={selectedDate ? new Date(selectedDate) : null}
                        onChange={handleDateChange}
                        placeholder="dd-mm-yyyy"
                      />
                    </div>
                  </div>
                  
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      No. of Examiners
                    </label>
                    <div className="h-[38px]">
                      <input
                        type="number"
                        className="block w-full h-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={staffCount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            // If empty, set to minimum valid value (1)
                            setStaffCount(1);
                          } else {
                            const parsedValue = parseInt(value, 10);
                            if (!isNaN(parsedValue)) {
                              setStaffCount(Math.max(1, parsedValue));
                            }
                          }
                        }}
                        min="1"
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row gap-3 mt-4">
                  <button
                    className="inline-flex items-center justify-center w-full px-4 py-2 text-white text-sm font-medium bg-indigo-500 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => handleEnterEvaluationData(-1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Enter Evaluation Data
                  </button>
                  
                  <button
                    className="inline-flex items-center justify-center w-full px-4 py-2 text-white text-sm font-medium bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => handleAddDay()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Another Day
                  </button>
                </div>
              </div>
              
              {/* 3. Evaluation Summary Section */}
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-md shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center">
                  <span className="border-b-2 border-blue-500 pb-1">EVALUATION SUMMARY</span>
                </h2>
                
                <div className="overflow-x-auto">
                  {evaluationDays.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No evaluation days added yet. Add a day to begin.
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Staffs Count
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Papers Evaluated
                          </th>
                          <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {console.log("Rendering evaluation days in table:", evaluationDays)}
                        {evaluationDays.map((day, index) => {
                          console.log(`Rendering day ${index}:`, day);
                          return (
                            <tr key={`day-${index}-${day.date}`} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(day.date)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {day.staffCount}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                {day.totalPapers || 'Enter Details →'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleEnterEvaluationData(index)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                    title="Edit"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleRemoveDay(index)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                    title="Remove"
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
                        {evaluationDays.length > 0 && (
                          <tr className="bg-gray-100 dark:bg-gray-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              Total
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {evaluationDays.reduce((sum, day) => sum + day.staffCount, 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {totalPapersEvaluated}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleRefresh}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Table
                  </button>
                  
                  <button
                    onClick={handleCalculateSalary}
                    disabled={evaluationDays.length === 0 || calculating}
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {calculating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Calculating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Calculate Salary
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* 4. Calculation Result Section */}
              {calculationResults.calculated && (
                <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-6 mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center">
                    <span className="border-b-2 border-blue-500 pb-1">CALCULATION RESULTS</span>
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-lg text-gray-700 dark:text-gray-300 flex items-center">
                        <span className="mr-2">🧾</span> Total Papers Evaluated
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {Number(calculationResults.totalPapers || 0).toString()}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-lg text-gray-700 dark:text-gray-300 flex items-center">
                        <span className="mr-2">💵</span> Base Salary
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Rs.{Number(calculationResults.baseSalary || 0).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-lg text-gray-700 dark:text-gray-300 flex items-center">
                        <span className="mr-2">🎯</span> Incentive Amount
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Rs.{Number(calculationResults.incentiveAmount || 0).toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex justify-between items-center">
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300 flex items-center">
                          <span className="mr-2">💰</span> Net Amount
                        </p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                          Rs.{Number(calculationResults.totalSalary || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Final Action Buttons */}
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={handleDownloadPDF}
                      disabled={downloading}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <span className="mr-2">⬇️</span>
                      {downloading ? 'Downloading...' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CalculationPage; 