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
  
  // Custom styles for input fields
  const inputStyles = {
    border: '2px solid #e2e8f0',
    borderRadius: '0.375rem',  
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    width: '100%',
    height: '38px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    outline: 'none'
  };
  
  const inputFocusStyles = {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)'
  };
  
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
    
    // Skip draft check if we're returning from staff details page with data
    if (location.state?.evaluationDayId || location.state?._ts) {
      return;
    }
    
    const draftKey = `examinerPro_draft_${id}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        
        // Only show prompt if the draft wasn't marked as calculated and has at least one day
        if (!parsedDraft.isCalculated && parsedDraft.evaluationDays && parsedDraft.evaluationDays.length > 0) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Skip unnecessary navigation when examiner name is already in state
      if (!location.state.examinerName) {
        // Pass examiner name to location state for breadcrumbs, but only if not already there
        const currentPath = window.location.pathname;
        navigate(currentPath, { 
          replace: true, 
          state: {
            ...location.state,
            examinerName: location.state.examinerData.full_name
          }
        });
      }
      
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
        
        // Skip unnecessary navigation when examiner name is already in state
        if (!location.state?.examinerName) {
          // Pass examiner name to location state for breadcrumbs
          const currentPath = window.location.pathname;
          navigate(currentPath, { 
            replace: true, 
            state: {
              ...location.state,
              examinerName: data.full_name
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load examiner details');
        console.error('Error fetching examiner:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExaminerDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]); // Intentionally omitting location.state to prevent loops, using eslint-disable-next-line instead
  
  // Check for staff details in location state
  useEffect(() => {
    // Exit early if there's no relevant state data
    if (!location?.state?.evaluationDate) {
      return;
    }
    
    // Immediately hide draft prompt when returning from staff details
    setShowDraftPrompt(false);
    
    // Skip processing if we've already handled this navigation state
    // Use timestamp to determine if this is a new state update
    const stateTimestamp = location?.state?._ts;
    const lastProcessedTimestamp = processedLocationState.current;
    
    if (typeof stateTimestamp === 'number' && stateTimestamp === lastProcessedTimestamp) {
      return;
    }
    
    // Mark that we've processed this state with timestamp
    processedLocationState.current = stateTimestamp || true;
    
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
        // IMPORTANT: Get a fresh copy of the current evaluation days from localStorage or state
        // to ensure we have the latest data
        const draftKey = `examinerPro_draft_${id}`;
        let currentDays = [...evaluationDays]; // Start with current state
        
        // Try to get the latest data from localStorage if available
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const parsedDraft = JSON.parse(savedDraft);
            if (parsedDraft.evaluationDays && parsedDraft.evaluationDays.length > 0) {
              // Use the draft data days if available, as they might be more up-to-date
              currentDays = parsedDraft.evaluationDays.map(day => 
                new EvaluationDay(day.date, day.staffCount, day.totalPapers, day.id)
              );
              console.log("Retrieved current days from localStorage:", currentDays);
            }
          } catch (error) {
            console.error('Error parsing draft data for day update:', error);
            // Continue with current state if there's an error
          }
        }
        
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
            // Only update state if days have actually changed
            if (JSON.stringify(updatedDays) !== JSON.stringify(currentDays)) {
              setEvaluationDays(updatedDays);
            
              // After updating days, we need to clear any draft data popup if it's being shown
              setShowDraftPrompt(false);

              // Update the draft in localStorage with the combined days
              const updatedDraftData = {
                evaluationDays: updatedDays,
                selectedDate: '',
                staffCount: 1,
                lastSavedAt: Date.now(),
                isCalculated: false
              };
              localStorage.setItem(`examinerPro_draft_${id}`, JSON.stringify(updatedDraftData));
              
              // Show success message only once
              toast.success('Evaluation data updated successfully');
            }
          }
        } else if (evaluationDate && totalPapers) {
          // Handle case where we have date and staff count but no ID yet
          const formattedDate = new Date(evaluationDate).toISOString().split('T')[0];
          
          // Check if day with this date already exists
          const existingDayIndex = currentDays.findIndex(day => 
            new Date(day.date).toISOString().split('T')[0] === formattedDate
          );
          
          let updatedDays;
          if (existingDayIndex >= 0) {
            // Update the existing day
            updatedDays = [...currentDays];
            updatedDays[existingDayIndex] = new EvaluationDay(
              evaluationDate,
              returnedStaffCount,
              totalPapers,
              currentDays[existingDayIndex].id
            );
          } else {
            // Add a new day
            updatedDays = [
              ...currentDays,
              new EvaluationDay(evaluationDate, returnedStaffCount, totalPapers)
            ];
          }
          
          // Only update state if days have actually changed
          if (JSON.stringify(updatedDays) !== JSON.stringify(currentDays)) {
            setEvaluationDays(updatedDays);
            
            // After updating days, we need to clear any draft data popup if it's being shown
            setShowDraftPrompt(false);

            // Update the draft in localStorage with the combined days
            const updatedDraftData = {
              evaluationDays: updatedDays,
              selectedDate: '',
              staffCount: 1,
              lastSavedAt: Date.now(),
              isCalculated: false
            };
            localStorage.setItem(`examinerPro_draft_${id}`, JSON.stringify(updatedDraftData));
          }
        }
      } catch (error) {
        console.error('Error processing evaluation days:', error);
      }
    };
    
    fetchEvaluationDay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location?.state?.evaluationDayId, location?.state?.evaluationDate, location?.state?._ts]);
  
  // Handle entering evaluation data (staff details) for a day
  const handleEnterEvaluationData = async (index) => {
    try {
      // If index is -1, we're adding a new day
      if (index === -1) {
      if (!selectedDate) {
          toast.error("Please select a date first");
        return;
      }
      
        // Format date for comparison
      const formattedSelectedDate = new Date(selectedDate).toISOString().split('T')[0];
        
        // Check if this day already exists
      const existingDayIndex = evaluationDays.findIndex(day => 
        new Date(day.date).toISOString().split('T')[0] === formattedSelectedDate
      );
      
      if (existingDayIndex >= 0) {
          // If the day exists, update the index to use the existing day
          index = existingDayIndex;
          toast.success(`Using existing evaluation day for ${formatDate(selectedDate)}`);
        } else {
          // For a new day, don't create it now - just navigate to staff details page
          // and let that page handle creation after user enters staff details
          
          // Navigate to the staff details page with just the date and staff count
          navigate(`/staff-details/${id}`, {
            state: {
              evaluationDate: selectedDate,
              staffCount: staffCount,
              examinerData: examiner,
              examinerName: examiner?.name || '',
              _ts: Date.now() // Add timestamp to ensure useEffect triggers
            }
          });
          return;
          }
        }
      
      if (index < 0 || index >= evaluationDays.length) {
        toast.error("Invalid evaluation day selected");
        return;
      }
      
      const day = evaluationDays[index];
      
      // Navigate to the staff details page with the day data
      navigate(`/staff-details/${id}`, {
        state: {
          evaluationDayId: day.id,
          evaluationDate: day.date,
          staffCount: day.staffCount,
          examinerData: examiner,
          examinerName: examiner?.name || '',
          _ts: Date.now() // Add timestamp to ensure useEffect triggers
        }
      });
    } catch (error) {
      console.error("Error in handleEnterEvaluationData:", error);
      toast.error("Error entering evaluation data: " + (error.message || "Unknown error"));
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
        evaluation_days: daysWithValidIds,
        // If we have an existing calculation ID, include it to update rather than create new
        ...(calculationResults.calculationId ? { calculation_id: calculationResults.calculationId } : {})
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
      
      // If we had an existing calculation ID, prefer that, otherwise use the one from the edge function
      let calculationId = calculationResults.calculationId || calculationResult.calculation_id;
      if (!calculationId) {
        console.warn('No calculation_id returned from edge function. PDF functionality may not work properly.');
      } else {
        console.log('Using calculation ID:', calculationId);
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
      const pdfFileName = `${examiner?.full_name || 'Examiner'}_Calculation_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      try {
        // Call the service to generate PDF using react-pdf/renderer
        const pdfDocument = await calculationService.generateCalculationPDF(
          calculationResults.calculationId,
          pdfFileName
        );
        
        if (!pdfDocument) {
          throw new Error('PDF generation failed: No document returned');
        }
        
        if (!pdfDocument.blob) {
          console.error('PDF document missing blob:', pdfDocument);
          throw new Error('Failed to generate PDF document: No blob returned');
        }
        
        // Create a Blob URL for preview and download - no need to rewrap the blob
        const blobUrl = URL.createObjectURL(pdfDocument.blob);
        
        // Open the PDF preview
        window.open(blobUrl, '_blank');
        
        // Trigger direct download
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = pdfDocument.download_filename || pdfFileName;
        downloadLink.type = 'application/pdf';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Safely remove the download link
        setTimeout(() => {
          if (document.body.contains(downloadLink)) {
            document.body.removeChild(downloadLink);
          }
        }, 100);
        
        // Clean up the Blob URL after some time
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 5000);
        
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
    if (!showDraftPrompt || !draftData || location.state?.evaluationDayId || location.state?._ts) return null;
    
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
              Examiner Calculator
            </h1>
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
              <div id="evaluation-schedule-section" className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center">
                  <span className="border-b-2 border-blue-500 pb-1">EVALUATION SCHEDULE</span>
                </h2>
                
                <div className="flex flex-row gap-4 mb-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                      Evaluation Date
                    </label>
                    <div className="h-[38px]">
                      <CustomDatePicker
                        selectedDate={selectedDate ? new Date(selectedDate) : null}
                        onChange={handleDateChange}
                        placeholder="dd-mm-yyyy"
                        className="block w-full h-full rounded-md border-gray-300 border-2 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        style={{
                          ...inputStyles,
                          '&:focus': inputFocusStyles
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="w-1/2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 pl-1">
                      No. of Examiners
                    </label>
                    <div className="h-[38px]">
                      <input
                        type="number"
                        className="block w-full h-full rounded-md border-gray-300 border-2 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        style={{
                          ...inputStyles,
                          '&:focus': inputFocusStyles
                        }}
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
                  {selectedDate && evaluationDays.some(day => 
                    new Date(day.date).toISOString().split('T')[0] === new Date(selectedDate).toISOString().split('T')[0]
                  ) ? (
                    // Show Update button when selected date already exists
                  <button
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-white text-sm font-medium bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={() => {
                        // Find the day index with matching date
                        const formattedSelectedDate = new Date(selectedDate).toISOString().split('T')[0];
                        const existingDayIndex = evaluationDays.findIndex(day => 
                          new Date(day.date).toISOString().split('T')[0] === formattedSelectedDate
                        );
                        
                        if (existingDayIndex >= 0) {
                          // Navigate to staff details page with existing data
                          handleEnterEvaluationData(existingDayIndex);
                        } else {
                          toast.error("Could not find the evaluation day to edit");
                        }
                      }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                      Update Evaluation Data
                  </button>
                  ) : (
                    // Show Enter button when it's a new date
                  <button
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-white text-sm font-medium bg-indigo-500 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => handleEnterEvaluationData(-1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                      Enter Evaluation Data
                  </button>
                  )}
                </div>
              </div>
              
              {/* 3. Evaluation Summary Section */}
              <div className="mb-8 bg-white dark:bg-gray-800 rounded-md shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white text-center">
                  <span className="border-b-2 border-blue-500 pb-1 uppercase">Evaluation Summary</span>
                </h2>
                
                <div className="overflow-x-auto">
                  {evaluationDays.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="flex justify-center items-center space-x-6 mb-6">
                        <div className="text-blue-500 text-4xl">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="text-blue-400 text-4xl">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="text-blue-500 text-4xl">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                        No evaluation days added yet.<br />
                        <span className="font-medium">Add a day to begin.</span>
                      </p>
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
                            <tr 
                              key={`day-${index}`}
                              id={`evaluation-day-${index}`}
                              className="transition-colors duration-200"
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {formatDate(day.date)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {day.staffCount}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {day.totalPapers || 'Enter Details →'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-right">
                                <div className="flex justify-end space-x-2">
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
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Table
                  </button>
                  
                  <button
                    onClick={handleCalculateSalary}
                    disabled={evaluationDays.length === 0 || calculating}
                    className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 gap-2"
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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