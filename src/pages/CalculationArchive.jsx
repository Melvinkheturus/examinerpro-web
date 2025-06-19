import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import calculationService from '../services/calculationService';
import { formatDate } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import HistoryLayout from './HistoryLayout';
import { generateAllExaminersReport } from '../services/reportService';
import { pdf } from '@react-pdf/renderer';

const CalculationArchive = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // Refs for handling outside clicks
  const datePickerRef = useRef(null);
  const exportDropdownRef = useRef(null);
  
  // State management
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  // eslint-disable-next-line no-unused-vars
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [selectedCalculations, setSelectedCalculations] = useState([]);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'examiner', 'department', 'month'
  const [expandedItems, setExpandedItems] = useState({});
  const [dateRangeOption, setDateRangeOption] = useState('all');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showSmartToolbar, setShowSmartToolbar] = useState(false);
  const [showMoreFiltersPopup, setShowMoreFiltersPopup] = useState(false);
  const [selectedExaminer, setSelectedExaminer] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [favoriteCalculations, setFavoriteCalculations] = useState([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // Define the necessary state variables
  // eslint-disable-next-line no-unused-vars
  const [selectedExaminerId, setSelectedExaminerId] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [typeFilter, setTypeFilter] = useState('all');
  // eslint-disable-next-line no-unused-vars
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  
  // Export option states for the smart toolbar
  const [exportOptions, setExportOptions] = useState({
    includeExaminerDetails: true,
    includeCalculationSummary: true,
    includeEvaluationBreakdown: true,
    includeStaffEvaluationTable: true,
    onlyFinalAmount: false
  });
  
  // Theme-based styling
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const secondaryText = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const buttonBg = isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200';
  const smartToolbarBg = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';

  // Define fetchCalculations function outside of useEffect
  const fetchCalculations = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all calculations across all examiners
      const data = await calculationService.getAllCalculations();
      
      // For each calculation, add detailed information
      const detailedCalculations = await Promise.all(
        data.map(async (calc) => {
          try {
            const detailedCalc = await calculationService.getCalculationById(calc.id);
            return detailedCalc;
          } catch (err) {
            console.error(`Error fetching details for calculation ${calc.id}:`, err);
            // Return the basic calculation with a flag indicating details couldn't be fetched
            return { 
              ...calc, 
              detailsFetchFailed: true,
              evaluationDays: [],
              documents: []
            }; 
          }
        })
      );
      
      setCalculations(detailedCalculations || []);
    } catch (err) {
      console.error('Error fetching calculations:', err);
      setError('Failed to load calculation archive');
    } finally {
      setLoading(false);
    }
  };

  // Call fetchCalculations on initial load
  useEffect(() => {
    fetchCalculations();
  }, []);

  // Toggle expanded state for a calculation
  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle calculation deletion
  // eslint-disable-next-line no-unused-vars
  const handleDelete = async (calculationId) => {
    if (!window.confirm('Are you sure you want to delete this calculation?')) {
      return;
    }

    try {
      await calculationService.deleteCalculation(calculationId);
      setCalculations(calculations.filter(c => c.id !== calculationId));
      toast.success('Calculation deleted successfully');
    } catch (error) {
      console.error('Error deleting calculation:', error);
      toast.error('Failed to delete calculation: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedCalculations.length} calculation(s)?`)) {
      return;
    }

    try {
      await Promise.all(selectedCalculations.map(id => calculationService.deleteCalculation(id)));
      setCalculations(calculations.filter(c => !selectedCalculations.includes(c.id)));
      setSelectedCalculations([]);
      toast.success('Calculations deleted successfully');
    } catch (error) {
      console.error('Error deleting calculations:', error);
      toast.error('Failed to delete calculations: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle bulk export with custom options
  const handleBulkExport = async () => {
    try {
      // Show message that the functionality has been removed
      toast.error('Custom export functionality has been removed.');
    } catch (error) {
      console.error('Error exporting custom report:', error);
      toast.error('Failed to generate report: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle merged reports export
  const handleMergedReportsExport = async () => {
    // Create a persistent toast that we can update
    const toastId = toast.loading('Preparing merged reports for download...');
      
    try {
      // If no calculations are selected, export all displayed calculations
      const calculationsToExport = selectedCalculations.length > 0
        ? selectedCalculations 
        : filteredCalculations.map(calc => calc.id); // Include all filtered calculations
      
      if (calculationsToExport.length === 0) {
        toast.error('No calculations available to export', { id: toastId });
        return;
      }
      
      // Debug log
      console.log('Exporting calculations:', { 
        count: calculationsToExport.length,
        ids: calculationsToExport,
        dateFilter
      });
      
      // Get the current user session to access the auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Authentication required. Please log in again.', { id: toastId });
        return;
      }
      
      // Helper function to format dates
      const formatDateFn = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
          return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        } catch (e) {
          return 'Invalid Date';
        }
      };
      
      // Helper function to get date range string
      const getReportPeriod = () => {
        if (dateFilter.from && dateFilter.to) {
          const fromDate = new Date(dateFilter.from);
          const toDate = new Date(dateFilter.to);
          
          return `${formatDateFn(fromDate)} – ${formatDateFn(toDate)}`;
        }
        return 'All Time';
      };
      
      // Update toast with progress
      toast.loading('Fetching calculation data...', { id: toastId });

      // Fetch calculations with complete nested structure in a single query
      let calculationsData = [];
      try {
        // FIXED: Fetch all nested relationships in a single query
        const { data, error } = await supabase
          .from('calculation_documents')
          .select(`
            *,
            examiners:examiner_id (
              id,
              full_name,
              examiner_id,
              department
            ),
            calculation_days (
              id,
              evaluation_day_id,
              evaluation_days:evaluation_day_id (
                id,
                evaluation_date,
                staff_evaluations (
                  id,
                  staff_name,
                  papers_evaluated
                )
              )
            )
          `)
          .in('id', calculationsToExport);

        if (error) throw error;
        
        // Process calculations with examiner data
        calculationsData = data.map(calc => ({
          ...calc,
          examiner: calc.examiners,
          examiner_name: calc.examiners?.full_name || 'Unknown Examiner'
        }));
        
        // Debug the calculation structure to verify data is complete
        console.log('Nested calculation data received:', {
          count: calculationsData.length,
          firstCalcId: calculationsData[0]?.id || 'none',
          hasCalculationDays: calculationsData[0]?.calculation_days?.length > 0 || false,
          evaluationDaysCount: calculationsData[0]?.calculation_days?.[0]?.evaluation_days ? 1 : 0,
          staffCount: calculationsData[0]?.calculation_days?.[0]?.evaluation_days?.length || 0
        });
      } catch (fetchError) {
        console.error('Error fetching calculation data:', fetchError);
        toast.error(`Failed to fetch calculation data: ${fetchError.message || 'Unknown error'}`, { id: toastId });
        return;
      }
      
      // Check if calculations contain basic expected data
      const validCalculations = calculationsData.filter(calc => {
        const hasExaminer = 
          (calc.examiner && (calc.examiner.name || calc.examiner.full_name)) || 
          calc.examiner_name;
        
        const hasPapers = 
          calc.total_papers !== undefined || 
          (calc.calculation_days && calc.calculation_days.length > 0);
        
        return hasExaminer && hasPapers;
      });
      
      if (validCalculations.length === 0 && calculationsData.length > 0) {
        console.warn('Found calculations but none had valid examiner and paper data', calculationsData);
        toast.error('Calculations found but they may be missing key data', { id: toastId });
        return;
      }
      
      // Update toast with progress
      toast.loading('Generating merged PDF report...', { id: toastId });
      
      try {
        // Group calculations by examiner for the report
        const examinerMap = {};
        validCalculations.forEach(calc => {
          const examinerId = calc.examiner_id;
          if (!examinerMap[examinerId]) {
            examinerMap[examinerId] = {
              examiner: calc.examiner || {
                id: examinerId,
                full_name: calc.examiner_name,
                department: calc.department || 'General'
              },
              calculations: []
            };
          }
          
          // Transform calculation_days data structure for compatibility with MergedReportPDF
          // This ensures the PDF component can process the data correctly
          if (calc.calculation_days && calc.calculation_days.length > 0) {
            // Create an evaluationDays array to match what extractEvaluationData expects
            calc.evaluationDays = calc.calculation_days
              .filter(day => day.evaluation_days) // Only include days with evaluation data
              .map(day => {
                // Check if we have staff evaluations and log their structure
                const staff_evaluations = day.evaluation_days.staff_evaluations || [];
                if (staff_evaluations.length > 0) {
                  console.log(`Staff evaluation sample for day ${day.evaluation_days.id}:`, 
                    staff_evaluations[0], 
                    `papers_evaluated field exists: ${staff_evaluations[0].hasOwnProperty('papers_evaluated')}`
                  );
                }
                
                return {
                  id: day.evaluation_days.id,
                  evaluation_date: day.evaluation_days.evaluation_date,
                  staff_evaluations: staff_evaluations
                };
              });
              
            console.log(`Processed calculation ${calc.id}: ${calc.evaluationDays.length} evaluation days`);
          }
          
          examinerMap[examinerId].calculations.push(calc);
        });
        
        const examinersData = Object.values(examinerMap);
        
        // Debug: Verify examiners data structure
        console.log('Prepared examiners data for PDF:', {
          examinersCount: examinersData.length,
          totalCalculations: examinersData.reduce((sum, e) => sum + e.calculations.length, 0),
          firstExaminerName: examinersData[0]?.examiner?.full_name || 'Unknown',
          // Log more details about the first calculation for debugging
          sampleCalc: examinersData[0]?.calculations[0] ? {
            id: examinersData[0].calculations[0].id,
            hasEvaluationDays: Boolean(examinersData[0].calculations[0].evaluationDays?.length),
            evaluationDaysCount: examinersData[0].calculations[0].evaluationDays?.length || 0,
            hasCalculationDays: Boolean(examinersData[0].calculations[0].calculation_days?.length),
            calculationDaysCount: examinersData[0].calculations[0].calculation_days?.length || 0,
            staffCount: examinersData[0]?.calculations[0]?.evaluation_days?.staff_evaluations?.length || 0
          } : 'No calculations'
        });
        
        // Update toast indicating PDF generation is starting
        toast.loading('Generating PDF with @react-pdf/renderer...', { id: toastId });
        
        // Use reportService to generate the merged PDF with all examiners
        await generateAllExaminersReport({
          download: true,
          fileName: `All_Examiners_Report_${new Date().toISOString().split('T')[0]}.pdf`,
          examinersData: examinersData,
          filterInfo: {
            dateRange: getReportPeriod(),
            customFilters: selectedCalculations.length > 0 ? 'Selected Calculations' : 'Recent Calculations'
          }
        });
        
        // Update toast
        toast.dismiss(toastId);
        toast.success('Merged PDF report generated successfully');
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        
        // More detailed error information for debugging
        if (pdfError.message) console.error('Error message:', pdfError.message);
        if (pdfError.stack) console.error('Error stack:', pdfError.stack);
        
        toast.error(`Failed to generate merged PDF: ${pdfError.message || 'Unknown error'}`, { id: toastId });
        
        // Fall back to HTML report if PDF generation fails
        try {
          toast.loading('Attempting HTML fallback...', { id: toastId });
          // Generate HTML report with the enriched data
          const htmlContent = generateMergedReportHTML(validCalculations);
          
          // Create a Blob with the HTML content
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          // Create a link and trigger download
          const link = document.createElement('a');
          link.href = url;
          link.download = `ExaminerPro_Merged_Report_${new Date().toISOString().split('T')[0]}.html`;
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(link);
          }, 100);
          
          toast.error('PDF conversion failed. Downloaded as HTML instead.', { id: toastId });
        } catch (htmlError) {
          console.error('Error generating HTML report:', htmlError);
          toast.error('Failed to generate any report format.', { id: toastId });
        }
      }
    } catch (error) {
      console.error('Error exporting merged reports:', error);
      toast.error('Failed to export merged reports: ' + (error.message || 'Unknown error'), { id: toastId });
    }
  };

  // Function to generate merged report HTML
  const generateMergedReportHTML = (calculationData) => {
    // Debug the full calculation data to understand structure
    console.log('Full calculation data for PDF generation:', JSON.stringify(calculationData, null, 2));

    // Helper functions for safe data handling
    const safe = (val, fallback = 'N/A') => val !== undefined && val !== null ? val : fallback;
    const currency = (val) => new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(parseFloat(val) || 0);
    const formatDateFn = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      } catch (e) {
        return 'Invalid Date';
      }
    };
    
    // Group calculations by examiner
    const examinerGroups = {};
    let totalExaminers = 0;
    let totalEvaluations = 0;
    let totalPapers = 0;
    let totalAmount = 0;
    
    // Pre-process calculations to ensure consistent structure
    const processedCalculations = calculationData.map(calc => {
      // Debug individual calculation
      console.log('Processing calculation:', calc.id || 'unknown id', calc);
      
      // Handle nested examiner information
      let examinerData = {};
      
      // Extract examiner data from various possible paths
      if (calc.examiner && typeof calc.examiner === 'object') {
        examinerData = calc.examiner;
      } else if (calc.examiner_data && typeof calc.examiner_data === 'object') {
        examinerData = calc.examiner_data;
      }
      
      // Extract basic examiner info
      const extractedName = examinerData.full_name || examinerData.name || calc.examiner_name || calc.name;
      const extractedExaminerId = examinerData.id || examinerData.examiner_id || calc.examiner_id || calc.id;
      const extractedDepartment = examinerData.department || calc.department || 'General';
      
      // Extract financial values
      const extractedTotalPapers = Number(calc.total_papers || calc.papers_evaluated || 0);
      const extractedTotalAmount = Number(calc.total_amount || calc.final_amount || calc.amount || 0);
      const extractedBaseAmount = Number(calc.base_salary || calc.base_amount || (extractedTotalAmount * 0.9) || 0);
      const extractedIncentiveAmount = Number(calc.incentive || calc.incentive_amount || (extractedTotalAmount * 0.1) || 0);
      const extractedStaffCount = Number(calc.total_staff || calc.staff_count || 0);
      
      // Debug the extracted values
      console.log('Extracted values:', {
        name: extractedName,
        id: extractedExaminerId,
        department: extractedDepartment,
        papers: extractedTotalPapers,
        amount: extractedTotalAmount
      });
      
      return {
        ...calc,
        extracted: {
          name: extractedName,
          id: extractedExaminerId,
          department: extractedDepartment,
          papers: extractedTotalPapers,
          amount: extractedTotalAmount,
          baseAmount: extractedBaseAmount,
          incentiveAmount: extractedIncentiveAmount,
          staffCount: extractedStaffCount
        }
      };
    });
    
    // Process calculations and group by examiner
    processedCalculations.forEach(calc => {
      // Use extracted values
      const examinerId = safe(calc.extracted.id, `unknown-${Math.random().toString(36).substr(2, 9)}`);
      const examinerName = safe(calc.extracted.name, "Unknown Examiner");
      const department = safe(calc.extracted.department, "Unassigned");
      
      // Extract base calculation details
      const papersEvaluated = calc.extracted.papers;
      const finalAmount = calc.extracted.amount;
      const baseAmount = calc.extracted.baseAmount;
      const incentiveAmount = calc.extracted.incentiveAmount;
      const staffCount = calc.extracted.staffCount;
      
      if (!examinerGroups[examinerId]) {
        examinerGroups[examinerId] = {
          name: examinerName,
          id: examinerId,
          department: department,
          calculations: [],
          totalCalculations: 0,
          totalEvaluationDays: 0,
          totalStaffCount: 0,
          totalPapers: 0,
          totalAmount: 0,
        };
        totalExaminers++;
      }
      
      // Process calculation days (from new nested structure or legacy structure)
      let evaluationDays = [];
      let totalDays = 0;
      
      // First try to extract from calculation_days array
      if (calc.calculation_days && Array.isArray(calc.calculation_days) && calc.calculation_days.length > 0) {
        // New structure: calculation_days -> evaluation_day -> staff_evaluations
        evaluationDays = calc.calculation_days.map(day => {
          console.log('Processing day from calculation_days:', day);
          
          // Get evaluation_day data
          const evalDay = day.evaluation_day || {};
          
          // Try to get staff evaluations
          let staffEvaluations = [];
          if (evalDay.staff_evaluations && Array.isArray(evalDay.staff_evaluations)) {
            staffEvaluations = evalDay.staff_evaluations;
          } else if (day.staff_evaluations && Array.isArray(day.staff_evaluations)) {
            staffEvaluations = day.staff_evaluations;
          }
          
          totalDays++;
          
          // Calculate total papers for this day
          const dayTotalPapers = staffEvaluations.reduce(
            (sum, staff) => sum + Number(staff.papers_evaluated || 0), 0
          );
          
          return {
            date: evalDay.evaluation_date || evalDay.date || day.date,
            staff_count: staffEvaluations.length || 1,
            total_papers: dayTotalPapers,
            staff: staffEvaluations.map(staff => ({
              name: safe(staff.staff_name || staff.name, `Staff ${staffEvaluations.indexOf(staff) + 1}`),
              papers: Number(staff.papers_evaluated || staff.papers || 0)
            }))
          };
        });
      } 
      // Then try evaluation_days (legacy structure)
      else if (calc.evaluation_days && Array.isArray(calc.evaluation_days) && calc.evaluation_days.length > 0) {
        console.log('Processing from evaluation_days:', calc.evaluation_days);
        
        evaluationDays = calc.evaluation_days.map(day => {
          // Extract staff data
          const dayStaff = (day.staff && Array.isArray(day.staff)) ? day.staff : [];
          
          return {
            date: day.date || day.evaluation_date,
            staff_count: day.staff_count || dayStaff.length || 1,
            total_papers: day.total_papers || dayStaff.reduce((sum, s) => sum + Number(s.papers || 0), 0),
            staff: dayStaff.map(staff => ({
              name: safe(staff.name || staff.staff_name, `Staff ${dayStaff.indexOf(staff) + 1}`),
              papers: Number(staff.papers || staff.papers_evaluated || 0)
            }))
          };
        });
        
        totalDays = evaluationDays.length;
      }
      // Try evaluationDays (another possible structure)
      else if (calc.evaluationDays && Array.isArray(calc.evaluationDays) && calc.evaluationDays.length > 0) {
        console.log('Processing from evaluationDays:', calc.evaluationDays);
        
        evaluationDays = calc.evaluationDays.map(day => {
          // Extract staff data
          const dayStaff = (day.staff && Array.isArray(day.staff)) ? day.staff : [];
          
          return {
            date: day.date || day.evaluation_date,
            staff_count: day.staffCount || day.staff_count || dayStaff.length || 1,
            total_papers: day.totalPapers || day.total_papers || 
                          dayStaff.reduce((sum, s) => sum + Number(s.papers || 0), 0),
            staff: dayStaff.map(staff => ({
              name: safe(staff.name || staff.staff_name, `Staff ${dayStaff.indexOf(staff) + 1}`),
              papers: Number(staff.papers || staff.papers_evaluated || 0)
            }))
          };
        });
        
        totalDays = evaluationDays.length;
      }
      // Minimal structure - create synthetic evaluation days
      else if (papersEvaluated > 0) {
        console.log('Creating synthetic evaluation day for calculation:', calc.id || 'unknown');
        
        // Create synthetic staff distribution
        const syntheticStaff = [];
        if (staffCount > 0) {
          // Distribute papers evenly among staff
          const papersPerStaff = Math.floor(papersEvaluated / staffCount);
          const remainder = papersEvaluated % staffCount;
          
          for (let i = 0; i < staffCount; i++) {
            const extraPapers = i === 0 ? remainder : 0;
            syntheticStaff.push({
              name: `Staff ${i + 1}`,
              papers: papersPerStaff + extraPapers
            });
          }
        } else {
          // If no staff count, create one synthetic staff with all papers
          syntheticStaff.push({
            name: 'Staff 1',
            papers: papersEvaluated
          });
        }
        
        // Create a synthetic evaluation day
        evaluationDays = [{
          date: calc.calculation_date || calc.created_at || new Date(),
          staff_count: staffCount || 1,
          total_papers: papersEvaluated,
          staff: syntheticStaff
        }];
        
        totalDays = 1;
      }
      
      // Add enriched calculation to the examiner group
      examinerGroups[examinerId].calculations.push({
        ...calc,
        evaluationDays: evaluationDays,
        total_days: totalDays,
        total_papers: papersEvaluated,
        total_staff: staffCount,
        base_amount: baseAmount,
        incentive_amount: incentiveAmount,
        total_amount: finalAmount
      });
      
      examinerGroups[examinerId].totalCalculations++;
      examinerGroups[examinerId].totalEvaluationDays += totalDays;
      examinerGroups[examinerId].totalStaffCount += staffCount;
      examinerGroups[examinerId].totalPapers += papersEvaluated;
      examinerGroups[examinerId].totalAmount += finalAmount;
      
      totalEvaluations++;
      totalPapers += papersEvaluated;
      totalAmount += finalAmount;
    });
    
    // Check if we have valid data
    if (Object.keys(examinerGroups).length === 0) {
      console.error('No valid examiner groups could be created from calculation data');
    } else {
      console.log('Created examiner groups:', examinerGroups);
    }
    
    // Also group by department for the summary
    const departmentGroups = {};
    Object.values(examinerGroups).forEach(examiner => {
      const department = examiner.department;
      
      if (!departmentGroups[department]) {
        departmentGroups[department] = {
          examiners: new Set(),
          totalEvaluations: 0,
          totalPapers: 0,
          totalAmount: 0
        };
      }
      
      departmentGroups[department].examiners.add(examiner.id);
      departmentGroups[department].totalEvaluations += examiner.totalCalculations;
      departmentGroups[department].totalPapers += examiner.totalPapers;
      departmentGroups[department].totalAmount += examiner.totalAmount;
    });
    
    // Get report period
    const getReportPeriod = () => {
      if (dateFilter.from && dateFilter.to) {
        const fromDate = new Date(dateFilter.from);
        const toDate = new Date(dateFilter.to);
        
        return `${formatDateFn(fromDate)} – ${formatDateFn(toDate)}`;
      }
      return 'All Time';
    };
    
    // Calculate total number of pages for pagination
    const totalExaminerCount = Object.keys(examinerGroups).length;
    // Each examiner takes at least 2 pages (summary and details)
    const totalPages = 1 + (totalExaminerCount * 2); 
    
    // Current date for footer
    const currentDate = formatDateFn(new Date());
    
    // Create HTML header with styles
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Merged Examiner Salary Reports</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm; /* A4 width */
            margin: 0;
            padding: 0;
          }
          
          .section {
            page-break-after: always;
            position: relative;
            padding: 30px 20px;
          }
          
          /* Header Styles */
          .page-header {
            text-align: center;
            padding-bottom: 15px;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px 4px 0 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .college-name {
            font-size: 18pt;
            font-weight: 700;
            text-transform: uppercase;
            margin: 0;
            padding: 0;
            color: #1a365d;
          }
          
          .college-affiliation {
            font-size: 10pt;
            margin: 5px 0;
            font-style: italic;
            color: #4a5568;
          }
          
          .department-header {
            font-weight: 700;
            text-transform: uppercase;
            margin: 5px 0;
            text-decoration: underline;
            color: #2c5282;
          }
          
          .report-title {
            font-size: 14pt;
            margin: 10px 0 5px;
            font-weight: 600;
            color: #1a365d;
          }
          
          .report-period {
            font-size: 11pt;
            margin: 5px 0;
            color: #555;
          }
          
          /* Table Styles */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: 600;
          }
          
          tr.total-row {
            background-color: #FFFDE7;
            font-weight: 700;
          }
          
          td.amount {
            text-align: right;
          }
          
          /* Section Styles */
          .section-title {
            font-size: 16pt;
            margin: 20px 0 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #3F51B5;
            color: #3F51B5;
            position: relative;
          }
          
          .section-title:after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 100px;
            height: 2px;
            background-color: #e53e3e;
          }
          
          .examiner-summary {
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .examiner-detail {
            margin-bottom: 15px;
            display: flex;
            justify-content: space-between;
          }
          
          .calculation-detail {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px dashed #ddd;
          }
          
          .detail-date {
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
          }
          
          /* Footer Styles */
          .page-footer {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 9pt;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          
          .page-number {
            position: absolute;
            right: 0;
            bottom: 0;
          }
          
          /* Helper */
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .text-bold {
            font-weight: 700;
          }
          
          .text-danger {
            color: #D32F2F;
          }
          
          /* Alert box styles */
          .alert-box {
            background-color: #FFF3E0;
            border: 1px solid #FFE0B2;
            border-left: 4px solid #FB8C00;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            color: #E65100;
          }
          
          .text-small {
            font-size: 0.85em;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>`;
    
    // Common header content function
    const generatePageHeader = () => `
      <div class="page-header">
        <h1 class="college-name">Guru Nanak College (Autonomous)</h1>
        <p class="college-affiliation">Affiliated to University of Madras | Accredited 'A++' Grade by NAAC</p>
        <p class="department-header">Controller of Examinations (COE)</p>
        <p class="report-title">📄 Merged Salary Report</p>
        <p class="report-period">Report Period: ${getReportPeriod()}</p>
      </div>
    `;
    
    // Common footer content function
    const generatePageFooter = (pageNum) => `
      <div class="page-footer">
        Generated by ExaminerPro | Report generated on: ${currentDate}
        <br>Version 1.0.0 | 
        <span class="page-number">Page ${pageNum} of ${totalPages}</span>
      </div>
    `;
    
    // Page 1: Overall Summary Page
    html += `
      <div class="section">
        ${generatePageHeader()}
        
        <h2 class="section-title">Overall Summary</h2>
        
        ${Object.keys(departmentGroups).length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>No. of Examiners</th>
                <th>Total Evaluations</th>
                <th>Total Papers</th>
                <th>Total Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(departmentGroups).map(([dept, data]) => `
                <tr>
                  <td>${dept}</td>
                  <td class="text-center">${data.examiners.size}</td>
                  <td class="text-center">${data.totalEvaluations}</td>
                  <td class="text-center">${data.totalPapers}</td>
                  <td class="text-right">${currency(data.totalAmount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="text-center"><strong>${totalExaminers}</strong></td>
                <td class="text-center"><strong>${totalEvaluations}</strong></td>
                <td class="text-center"><strong>${totalPapers}</strong></td>
                <td class="text-right text-danger"><strong>${currency(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>
        ` : `
          <div class="alert-box">
            <p class="text-center">No department data available for summary.</p>
            <p class="text-center text-small">No valid calculation data was found to generate department statistics.</p>
          </div>
        `}
        
        ${generatePageFooter(1)}
      </div>
    `;
    
    // Generate pages for each examiner (2 pages per examiner)
    let pageCount = 2; // Starting from page 2
    
    Object.values(examinerGroups).forEach((examiner) => {
      // Page for examiner summary
      html += `
        <div class="section">
          ${generatePageHeader()}
          
          <div class="examiner-summary">
            <h2 class="text-center">Examiner Summary</h2>
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
              <div style="width: 48%;">
                <p><strong>Name:</strong> ${examiner.name}</p>
                <p><strong>Examiner ID:</strong> ${examiner.id}</p>
                <p><strong>Department:</strong> ${examiner.department}</p>
              </div>
              <div style="width: 48%;">
                <p><strong>Total Calculations:</strong> ${examiner.totalCalculations}</p>
                <p><strong>Total Papers Evaluated:</strong> ${examiner.totalPapers}</p>
                <p><strong>Total Amount Paid:</strong> ${currency(examiner.totalAmount)}</p>
              </div>
            </div>
          </div>
          
          <h3 class="section-title">Summary Table</h3>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Eval Days</th>
                <th>Total Staff</th>
                <th>Total Papers</th>
                <th>Base ₹</th>
                <th>Incentive ₹</th>
                <th>Final ₹</th>
              </tr>
            </thead>
            <tbody>
              ${examiner.calculations.map(calc => `
                <tr>
                  <td>${formatDateFn(calc.created_at || calc.calculation_date)}</td>
                  <td class="text-center">${calc.total_days}</td>
                  <td class="text-center">${calc.total_staff}</td>
                  <td class="text-center">${calc.total_papers}</td>
                  <td class="text-right">${currency(calc.base_amount)}</td>
                  <td class="text-right">${currency(calc.incentive_amount)}</td>
                  <td class="text-right">${currency(calc.total_amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="text-center"><strong>${examiner.totalEvaluationDays}</strong></td>
                <td class="text-center"><strong>${examiner.totalStaffCount}</strong></td>
                <td class="text-center"><strong>${examiner.totalPapers}</strong></td>
                <td class="text-right"><strong>${currency(examiner.totalAmount * 0.9)}</strong></td>
                <td class="text-right"><strong>${currency(examiner.totalAmount * 0.1)}</strong></td>
                <td class="text-right text-danger"><strong>${currency(examiner.totalAmount)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          ${generatePageFooter(pageCount++)}
        </div>
      `;
      
      // Page for examiner detailed breakdown
      html += `
        <div class="section">
          ${generatePageHeader()}
          
          <h2 class="section-title">Detailed Breakdown for ${examiner.name}</h2>
          
          ${examiner.calculations.length > 0 ? examiner.calculations.map(calc => `
            <div class="calculation-detail">
              <h3 class="detail-date">✅ Calculation Date: ${formatDateFn(calc.created_at || calc.calculation_date)}</h3>
              
              ${calc.evaluationDays && calc.evaluationDays.length > 0 ? 
                calc.evaluationDays.map(day => `
                  <h4>Evaluation Date: ${formatDateFn(day.date)}</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th class="text-right">Papers Evaluated</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${day.staff && day.staff.length > 0 ? 
                        day.staff.map(staff => `
                          <tr>
                            <td>${staff.name}</td>
                            <td class="text-right">${staff.papers}</td>
                          </tr>
                        `).join('') : `
                          <tr>
                            <td colspan="2" class="text-center">No staff details available</td>
                          </tr>
                        `
                      }
                      <tr class="total-row">
                        <td><strong>Total Papers</strong></td>
                        <td class="text-right"><strong>${day.total_papers}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                `).join('') : `
                  <div class="alert-box">
                    <p class="text-center">No evaluation day details available for this calculation.</p>
                    <p class="text-center text-small">The calculation was found but contains no detailed evaluation data.</p>
                  </div>
                `
              }
            </div>
          `).join('') : `
            <div class="alert-box">
              <p class="text-center">No calculations found for this examiner.</p>
              <p class="text-center text-small">The examiner exists in the system but has no calculation records.</p>
            </div>
          `}
          
          ${generatePageFooter(pageCount++)}
        </div>
      `;
    });
    
    // Close HTML
    html += `
      </body>
      </html>
    `;
    
    return html;
  };

  // Handle recalculation - We'll remove this since it's not used elsewhere in the code
  // eslint-disable-next-line no-unused-vars
  const handleRecalculate = async (calculationId) => {
    try {
      // Navigate to the calculation page with the ID
      navigate(`/calculations/new/${calculationId}?recalculate=true`);
    } catch (error) {
      console.error('Error initiating recalculation:', error);
      toast.error('Failed to initiate recalculation: ' + (error.message || 'Unknown error'));
    }
  };

  // Handle checkbox selection
  const handleSelectCalculation = (id) => {
    const newSelection = selectedCalculations.includes(id)
      ? selectedCalculations.filter(calcId => calcId !== id)
      : [...selectedCalculations, id];
    
    setSelectedCalculations(newSelection);
    setShowSmartToolbar(newSelection.length > 0);
  };

  // Handle favorite toggle
  const handleToggleFavorite = (id) => {
    setFavoriteCalculations((prevFavorites) => {
      if (prevFavorites.includes(id)) {
        return prevFavorites.filter(calcId => calcId !== id);
      } else {
        return [...prevFavorites, id];
      }
    });
  };

  // Toggle show only favorites
  const toggleShowOnlyFavorites = () => {
    setShowOnlyFavorites(!showOnlyFavorites);
  };

  // Handle select all
  // eslint-disable-next-line no-unused-vars
  const handleSelectAll = () => {
    if (selectedCalculations.length === filteredCalculations.length) {
      setSelectedCalculations([]);
      setShowSmartToolbar(false);
    } else {
      setSelectedCalculations(filteredCalculations.map(calc => calc.id));
      setShowSmartToolbar(true);
    }
  };

  // Filter and sort calculations
  const filterCalculations = () => {
    let filtered = [...calculations];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(calc => 
        (calc.examiner_name && calc.examiner_name.toLowerCase().includes(query)) ||
        (calc.department && calc.department.toLowerCase().includes(query)) ||
        (calc.calculation_number && calc.calculation_number.toString().includes(query)) ||
        (calc.total_amount && calc.total_amount.toString().includes(query))
      );
    }
    
    // Apply date filter based on dateRangeOption
    // ...
    
    // Filter by examiner if selected
    if (selectedExaminerId) {
      filtered = filtered.filter(calc => calc.examiner_id === selectedExaminerId);
    }
    
    // Filter by department if selected
    if (selectedDepartment) {
      filtered = filtered.filter(calc => calc.department === selectedDepartment);
    }
    
    // Filter favorites
    if (showOnlyFavorites) {
      filtered = filtered.filter(calc => favoriteCalculations.includes(calc.id));
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      // Implementation depends on your data structure
      // filtered = filtered.filter(calc => calc.type === typeFilter);
    }
    
    return filtered;
  };

  // Sort calculations
  const sortCalculations = (calcs) => {
    return [...calcs].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.calculation_date) - new Date(b.calculation_date);
        case 'date_desc':
          return new Date(b.calculation_date) - new Date(a.calculation_date);
        case 'amount_asc':
          return (a.total_amount || 0) - (b.total_amount || 0);
        case 'amount_desc':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'papers_asc':
          return (a.total_papers || 0) - (b.total_papers || 0);
        case 'papers_desc':
          return (b.total_papers || 0) - (a.total_papers || 0);
        case 'examiner_asc':
          return (a.examiner_name || '').localeCompare(b.examiner_name || '');
        case 'examiner_desc':
          return (b.examiner_name || '').localeCompare(a.examiner_name || '');
        default:
          return new Date(b.calculation_date) - new Date(a.calculation_date);
      }
    });
  };

  // Group calculations
  const groupCalculations = (calcs) => {
    if (groupBy === 'none') return { 'All Calculations': calcs };
    
    return calcs.reduce((groups, calc) => {
      let groupKey;
      
      switch (groupBy) {
        case 'examiner':
          groupKey = calc.examiner_name || 'Unknown';
          break;
        case 'department':
          groupKey = calc.department || 'Unknown';
          break;
        case 'month':
          const date = new Date(calc.calculation_date);
          groupKey = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
          break;
        default:
          groupKey = 'All Calculations';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(calc);
      return groups;
    }, {});
  };

  // Process calculations through filtering, sorting, and grouping
  const filteredCalculations = filterCalculations();
  const sortedCalculations = sortCalculations(filteredCalculations);
  const groupedCalculations = groupCalculations(sortedCalculations);

  // Pagination
  // eslint-disable-next-line no-unused-vars
  const totalPages = Math.ceil(filteredCalculations.length / itemsPerPage);
  
  // Handle date range selection
  const handleDateRangeChange = (option) => {
    setDateRangeOption(option);
    
    const today = new Date();
    let fromDate = '';
    let toDate = '';
    
    switch(option) {
      case 'all':
        // No date filter
        fromDate = '';
        toDate = '';
        break;
      case 'today':
        // Set to today
        fromDate = formatDateForInput(today);
        toDate = formatDateForInput(today);
        break;
      case 'yesterday':
        // Set to yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        fromDate = formatDateForInput(yesterday);
        toDate = formatDateForInput(yesterday);
        break;
      case 'week':
        // Last 7 days
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        fromDate = formatDateForInput(lastWeek);
        toDate = formatDateForInput(today);
        break;
      case 'month':
        // Last 30 days
        const lastMonth = new Date(today);
        lastMonth.setDate(lastMonth.getDate() - 30);
        fromDate = formatDateForInput(lastMonth);
        toDate = formatDateForInput(today);
        break;
      case 'thisMonth':
        // This month only
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = formatDateForInput(firstDayOfMonth);
        toDate = formatDateForInput(today);
        break;
      case 'year':
        // This year
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        fromDate = formatDateForInput(firstDayOfYear);
        toDate = formatDateForInput(today);
        break;
      case 'custom':
        // Keep existing dates for custom
        fromDate = dateFilter.from;
        toDate = dateFilter.to;
        break;
      default:
        break;
    }
    
    setDateFilter({
      from: fromDate,
      to: toDate
    });
    
    if (option !== 'custom') {
      // Close the date picker if not custom
      setShowDateRangePicker(false);
    }
  };
  
  // Get date range text for display
  const getDateRangeText = () => {
    if (!dateFilter.from && !dateFilter.to) {
      return 'All Time';
    }
    
    // For predefined options, show label
    switch(dateRangeOption) {
      case 'all':
        return 'All Time';
      case 'today':
        return 'Today';
      case 'yesterday':
        return 'Yesterday';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last 30 Days';
      case 'thisMonth':
        return 'This Month';
      case 'year':
        return 'This Year';
      case 'custom':
        // For custom range, format dates nicely
        if (dateFilter.from && dateFilter.to) {
          const fromFormatted = formatFriendlyDate(dateFilter.from);
          const toFormatted = formatFriendlyDate(dateFilter.to);
          return `${fromFormatted} - ${toFormatted}`;
        } else if (dateFilter.from) {
          return `After ${formatFriendlyDate(dateFilter.from)}`;
        } else if (dateFilter.to) {
          return `Before ${formatFriendlyDate(dateFilter.to)}`;
        }
        return 'Custom Range';
      default:
        // Fallback to date range
        if (dateFilter.from && dateFilter.to) {
          return `${dateFilter.from} - ${dateFilter.to}`;
        } else if (dateFilter.from) {
          return `After ${dateFilter.from}`;
        } else if (dateFilter.to) {
          return `Before ${dateFilter.to}`;
        }
        return 'Custom Range';
    }
  };
  
  // Format date for input fields (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  // Format date in a friendly way (e.g., Jan 1, 2023)
  const formatFriendlyDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };
  
  // Toggle group mode
  // eslint-disable-next-line no-unused-vars
  const toggleGroupMode = useCallback(() => {
    if (groupBy === 'none') {
      setGroupBy('examiner');
    } else {
      setGroupBy('none');
    }
  }, [groupBy]);
  
  // Handle download PDF
  const handleDownloadPDF = async (calculationId) => {
    try {
      setLoading(true);
      const fileName = `calculation_report_${calculationId}_${new Date().getTime()}.pdf`;
      
      // Call the service to generate PDF using react-pdf/renderer
      const document = await calculationService.generateCalculationPDF(calculationId, fileName);
      
      if (!document || !document.blob_url) {
        throw new Error('Failed to generate PDF document: No blob URL returned');
      }
      
      // Open the PDF in a new tab
      window.open(document.blob_url, '_blank');
      
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render calculation grid
  const renderCalculationGrid = (calculations) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {calculations.map(calculation => (
          <div key={calculation.id} className={`${cardBg} border ${borderColor} rounded-lg shadow-sm overflow-hidden`}>
            <div className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className={`text-sm font-medium ${textColor}`}>
                    {calculation.examiner_name || "Unknown"}
                  </h3>
                  <p className={`text-xs ${secondaryText}`}>
                    {formatDate(calculation.calculation_date || calculation.created_at || new Date())}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleToggleFavorite(calculation.id)}
                    className={`text-sm ${favoriteCalculations.includes(calculation.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                  >
                    {favoriteCalculations.includes(calculation.id) ? '⭐' : '☆'}
                  </button>
                  <input
                    type="checkbox"
                    checked={selectedCalculations.includes(calculation.id)}
                    onChange={() => handleSelectCalculation(calculation.id)}
                    className="h-3 w-3 text-blue-600 border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">📝</span> Papers
                  </p>
                  <p className={`${textColor} text-xs font-medium`}>
                    {calculation.total_papers || 0}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">📅</span> Days
                  </p>
                  <p className={`${textColor} text-xs font-medium`}>
                    {calculation.total_days || 0}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">👥</span> Staff
                  </p>
                  <p className={`${textColor} text-xs font-medium`}>
                    {calculation.total_staff || calculation.staff_count || 0}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">💰</span> Final Amount
                  </p>
                  <p className={`${textColor} text-xs font-medium`}>
                    ₹{(calculation.total_amount || calculation.final_amount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-row gap-2 mt-3 justify-center">
                <button
                  onClick={() => navigate(`/calculations/view/${calculation.id}`, { 
                    state: { 
                      examinerName: calculation.examiner_name || "Unknown",
                      fromCalculationArchive: true 
                    } 
                  })}
                  className="flex items-center px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40"
                >
                  <span className="mr-1">👁️</span> View Details
                </button>
                <button
                  onClick={() => handleDownloadPDF(calculation.id)}
                  className="flex items-center px-2 py-1 text-xs rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render calculation list
  const renderCalculationList = (calculations) => {
    return (
      <div className="space-y-3">
        {calculations.map(calculation => (
          <div key={calculation.id} className={`${cardBg} border ${borderColor} rounded-lg shadow-sm p-3`}>
            <div className="flex flex-col md:flex-row justify-between">
              <div className="flex items-center mb-2 md:mb-0">
                <div className="flex space-x-2 mr-2">
                  <input
                    type="checkbox"
                    checked={selectedCalculations.includes(calculation.id)}
                    onChange={() => handleSelectCalculation(calculation.id)}
                    className="h-3 w-3 text-blue-600 border-gray-300 rounded"
                  />
                  <button
                    onClick={() => handleToggleFavorite(calculation.id)}
                    className={`text-sm ${favoriteCalculations.includes(calculation.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                  >
                    {favoriteCalculations.includes(calculation.id) ? '⭐' : '☆'}
                  </button>
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${textColor}`}>
                    {calculation.examiner_name || "Unknown"}
                  </h3>
                  <div className="flex items-center mt-0.5">
                    <span className={`text-xs ${secondaryText} mr-2`}>
                      ID: {calculation.examiner_id || 'N/A'}
                    </span>
                    <span className={`text-xs ${secondaryText}`}>
                      {formatDate(calculation.calculation_date || calculation.created_at || new Date())}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                <div className="flex flex-col items-end">
                  <div className={`text-sm font-medium ${textColor}`}>
                    ₹{(calculation.total_amount || calculation.final_amount || 0).toFixed(2)}
                  </div>
                  <div className="flex items-center">
                    <span className={`text-xs ${secondaryText}`}>
                      Papers: {calculation.total_papers || 0} | Staff: {calculation.total_staff || calculation.staff_count || 0}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={() => navigate(`/calculations/view/${calculation.id}`, { 
                      state: { 
                        examinerName: calculation.examiner_name || "Unknown",
                        fromCalculationArchive: true 
                      } 
                    })}
                    className="flex items-center px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40"
                  >
                    <span className="mr-1">👁️</span> View Details
                  </button>
                  <button 
                    onClick={() => toggleExpand(calculation.id)}
                    className="flex items-center px-2 py-1 text-xs rounded-md bg-gray-50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                  >
                    {expandedItems[calculation.id] ? 'Hide Details' : 'Show Details'}
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(calculation.id)}
                    className="flex items-center px-2 py-1 text-xs rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Expanded details */}
            {expandedItems[calculation.id] && (
              <div className={`mt-3 p-3 rounded-md bg-gray-50 dark:bg-gray-800 border ${borderColor}`}>
                <h4 className={`text-xs font-semibold ${textColor} mb-2`}>Calculation Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <h5 className={`text-xs font-medium ${secondaryText} mb-0.5`}>Valuation Details</h5>
                    <ul className={`text-xs ${textColor}`}>
                      <li>Total Days: {calculation.total_days || (calculation.evaluationDays && calculation.evaluationDays.length) || 0}</li>
                      <li>Total Papers: {calculation.total_papers || 0}</li>
                      <li>Total Staff: {calculation.total_staff || calculation.staff_count || 0}</li>
                      <li>Total Amount: ₹{(calculation.total_amount || calculation.final_amount || 0).toFixed(2)}</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className={`text-xs font-medium ${secondaryText} mb-0.5`}>Evaluation Days</h5>
                    <ul className={`text-xs ${textColor}`}>
                      {calculation.evaluationDays && calculation.evaluationDays.map((day, i) => (
                        <li key={day.id || i}>
                          {formatDate(day.evaluation_date)} - {day.staff_count || 0} staff, {day.total_papers || 0} papers
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className={`text-xs font-medium ${secondaryText} mb-0.5`}>Documents</h5>
                    <ul className={`text-xs ${textColor}`}>
                      {calculation.documents && calculation.documents.map((doc, i) => (
                        <li key={doc.id || i} className="flex items-center justify-between">
                          <span>{doc.file_name}</span>
                          <button 
                            onClick={() => calculationService.downloadCalculationDocument(doc.file_path)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                          >
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render summary stats
  const renderSummaryStats = (calculations) => {
    // Calculate summary statistics
    const totalPapers = calculations.reduce((sum, calc) => sum + (calc.total_papers || 0), 0);
    const totalAmount = calculations.reduce((sum, calc) => sum + (calc.total_amount || calc.final_amount || 0), 0);
    const uniqueExaminers = new Set(calculations.map(calc => calc.examiner_id)).size;
    const totalCalculations = calculations.length;
    
    return (
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3 rounded-lg shadow-md border ${borderColor} bg-blue-50 dark:bg-blue-900/30`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium text-blue-700 dark:text-blue-300`}>Total Calculations</p>
            <span className="text-blue-500 text-base">🧾</span>
          </div>
          <p className={`text-lg font-bold text-blue-800 dark:text-blue-200`}>{totalCalculations}</p>
        </div>
        <div className={`p-3 rounded-lg shadow-md border ${borderColor} bg-purple-50 dark:bg-purple-900/30`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium text-purple-700 dark:text-purple-300`}>Total Examiners</p>
            <span className="text-purple-500 text-base">👤</span>
          </div>
          <p className={`text-lg font-bold text-purple-800 dark:text-purple-200`}>{uniqueExaminers}</p>
        </div>
        <div className={`p-3 rounded-lg shadow-md border ${borderColor} bg-amber-50 dark:bg-amber-900/30`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium text-amber-700 dark:text-amber-300`}>Total Papers</p>
            <span className="text-amber-500 text-base">🧻</span>
          </div>
          <p className={`text-lg font-bold text-amber-800 dark:text-amber-200`}>{totalPapers}</p>
        </div>
        <div className={`p-3 rounded-lg shadow-md border ${borderColor} bg-green-50 dark:bg-green-900/30`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-medium text-green-700 dark:text-green-300`}>Total Paid</p>
            <span className="text-green-500 text-base">💰</span>
          </div>
          <p className={`text-lg font-bold text-green-800 dark:text-green-200`}>₹{Number(totalAmount).toFixed(2)}</p>
        </div>
      </div>
    );
  };

  // Function to handle clicks outside of components
  function handleClickOutside(event) {
    if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
      setShowDateRangePicker(false);
    }
    if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
      setShowExportDropdown(false);
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear selection and hide smart toolbar
  const handleClearSelection = () => {
    setSelectedCalculations([]);
    setShowSmartToolbar(false);
  };

  // Toggle more filters popup
  const handleToggleMoreFilters = () => {
    setShowMoreFiltersPopup(!showMoreFiltersPopup);
  };

  // Handle export option change
  const handleExportOptionChange = (option) => {
    setExportOptions({
      ...exportOptions,
      [option]: !exportOptions[option]
    });
  };

  // Handle export dropdown toggle
  const handleExportDropdownToggle = () => {
    setShowExportDropdown(!showExportDropdown);
    // Hide smart toolbar if we're closing the dropdown and no calculations are selected
    if (showExportDropdown && selectedCalculations.length === 0) {
      setShowSmartToolbar(false);
    }
  };

  // Get unique examiners from calculations
  const getUniqueExaminers = () => {
    const examiners = new Map();
    
    calculations.forEach(calc => {
      if (calc.examiner_id && calc.examiner_name) {
        examiners.set(calc.examiner_id, calc.examiner_name);
      }
    });
    
    return Array.from(examiners).map(([id, name]) => ({ id, name }));
  };
  
  // Get unique departments from calculations
  const getUniqueDepartments = () => {
    const departments = new Set();
    
    calculations.forEach(calc => {
      if (calc.department) {
        departments.add(calc.department);
      }
    });
    
    return Array.from(departments);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSortBy('date_desc');
    setGroupBy('none');
    setDateFilter({ from: '', to: '' });
    setDateRangeOption('all');
    setSelectedExaminer('');
    setSelectedDepartment('');
  };

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('favoriteCalculations');
      if (savedFavorites) {
        setFavoriteCalculations(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('favoriteCalculations', JSON.stringify(favoriteCalculations));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, [favoriteCalculations]);

  // Component initialization/effects
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener('scroll', handleScroll);
    
    // Remove event listener on cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [dateRangeOption, customDateRange, selectedExaminerId, selectedDepartment, showOnlyFavorites, typeFilter]);
  
  useEffect(() => {
    // Initialize toggleGroupMode for group display
    if (viewMode === 'grid' && groupBy === 'none') {
      // This ensures toggleGroupMode is used at least once
      console.log('Group mode available:', groupBy);
    }
  }, [viewMode, groupBy]);

  // Add missing handleScroll function
  const handleScroll = () => {
    // Implement infinite scrolling or any scroll-based functionality here
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Example: Load more calculations when user scrolls near the bottom
    if (scrollY + windowHeight >= documentHeight - 200) {
      // Could implement pagination or "load more" functionality here
      console.log('Near bottom of page, could load more calculations');
    }
  };

  // Handle Excel Export
  const handleExportToExcel = () => {
    try {
      toast.error('Excel export functionality has been removed temporarily.');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export to Excel: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <HistoryLayout>
      {/* Header - with consistent padding */}
      <div className="mb-4 flex justify-between items-center px-5 pt-5">
        <div>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculation Archives
          </h1>
        </div>
      </div>

      {/* Content section with consistent padding */}
      <div className="px-5 pb-5">
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm ${isDarkMode ? 'bg-red-900/20 border-red-800 text-red-400' : ''}`}>
            {error}
          </div>
        )}

        {/* Content */}
        {/* Summary Stats */}
        {!loading && !error && filteredCalculations.length > 0 && renderSummaryStats(filteredCalculations)}
        
        {/* Smart Toolbar - Only shown when checkboxes selected or Custom Report is active */}
        {showSmartToolbar && (
          <div className={`mb-3 p-2 ${smartToolbarBg} rounded-md border ${borderColor} flex justify-between items-center shadow-sm transition-all duration-200 ease-in-out text-sm`}>
            <div className="flex items-center gap-4">
              <div className={`${textColor} flex items-center`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{selectedCalculations.length}</span> selected
              </div>
              <div className="h-5 border-l border-gray-300 dark:border-gray-600"></div>
              <button
                onClick={handleToggleMoreFilters}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'} transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                More Filters
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkExport}
                className="flex items-center px-2 py-1 rounded-md text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Selected
              </button>
              <button
                onClick={handleBulkDelete}
                className={`flex items-center px-2 py-1 rounded-md text-xs ${isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-gray-700' : 'text-red-600 hover:text-red-700 hover:bg-gray-100'} transition-colors`}
                title="Delete Selected"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={handleClearSelection}
                className={`flex items-center px-2 py-1 rounded-md text-xs ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'} transition-colors`}
                title="Clear Selection"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Controls - Single Row */}
        <div className="mb-5">
          {/* Main Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2 mb-2">
            {/* Search */}
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search calculations..."
                className={`w-full h-8 p-1 pl-8 border ${borderColor} rounded-md text-sm ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                <span className="text-gray-400 dark:text-gray-500 text-sm">🔍</span>
              </div>
            </div>
            
            {/* Filter Controls Group */}
            <div className="flex flex-wrap lg:flex-nowrap gap-2">
              {/* Sort Options */}
              <div className="flex items-center w-28 relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`w-full h-8 px-8 py-1 pr-6 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} appearance-none`}
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="amount_desc">Amount (High-Low)</option>
                  <option value="amount_asc">Amount (Low-High)</option>
                  <option value="papers_desc">Papers (High-Low)</option>
                  <option value="papers_asc">Papers (Low-High)</option>
                  <option value="examiner_asc">Examiner (A-Z)</option>
                  <option value="examiner_desc">Examiner (Z-A)</option>
                </select>
                <div className="absolute pointer-events-none left-0 flex items-center h-full pl-2">
                  <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>Sort</span>
                </div>
                <div className="absolute pointer-events-none right-0 flex items-center h-full pr-2">
                  <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Group By Dropdown */}
              <div className="flex items-center w-28 relative">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className={`w-full h-8 px-8 py-1 pr-6 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} appearance-none`}
                >
                  <option value="none">None</option>
                  <option value="examiner">By Examiner</option>
                  <option value="department">By Department</option>
                  <option value="month">By Month</option>
                </select>
                <div className="absolute pointer-events-none left-0 flex items-center h-full pl-2">
                  <span className={`text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>Group By</span>
                </div>
                <div className="absolute pointer-events-none right-0 flex items-center h-full pr-2">
                  <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {/* Date Range Picker */}
              <div className="relative w-28" ref={datePickerRef}>
                <button
                  className={`w-full h-8 px-2 py-1 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} flex items-center justify-center`}
                  onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                >
                  <span className="mr-1 flex-shrink-0">📅</span>
                  <span>Time Filter</span>
                </button>
                
                {/* Date Range Dropdown */}
                {showDateRangePicker && (
                  <div className={`absolute z-30 mt-1 right-0 w-56 ${cardBg} rounded-md shadow-lg border ${borderColor} py-1 px-2 text-xs`}>
                    <div className="space-y-0.5 mb-1">
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'all' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('all')}
                      >
                        All Time
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'today' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('today')}
                      >
                        Today
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'yesterday' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('yesterday')}
                      >
                        Yesterday
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'week' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('week')}
                      >
                        Last 7 Days
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'month' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('month')}
                      >
                        Last 30 Days
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'thisMonth' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('thisMonth')}
                      >
                        This Month
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'year' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('year')}
                      >
                        This Year
                      </button>
                      <button
                        className={`w-full text-left px-2 py-1 rounded-md ${dateRangeOption === 'custom' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                        onClick={() => handleDateRangeChange('custom')}
                      >
                        Custom Range
                      </button>
                    </div>
                    
                    {dateRangeOption === 'custom' && (
                      <div className="space-y-1">
                        <div>
                          <label className={`block text-xs font-medium ${textColor} mb-0.5`}>From</label>
                          <input
                            type="date"
                            value={dateFilter.from}
                            onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                            className={`w-full h-7 px-2 py-0.5 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-medium ${textColor} mb-0.5`}>To</label>
                          <input
                            type="date"
                            value={dateFilter.to}
                            onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                            className={`w-full h-7 px-2 py-0.5 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                          />
                        </div>
                        <div className="flex justify-end mt-1">
                          <button
                            className="h-6 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            onClick={() => setShowDateRangePicker(false)}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              {/* Export Dropdown */}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  className={`flex items-center justify-center h-8 px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-28 text-xs whitespace-nowrap`}
                  onClick={handleExportDropdownToggle}
                >
                  <span className="mr-1">⬇️</span>
                  Export Reports
                </button>
                {/* Dropdown menu */}
                {showExportDropdown && (
                  <div className="absolute z-30 mt-1 right-0 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-2 text-xs">
                    <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">Export Options</h3>
                    </div>
                    <div className="space-y-0.5 pt-1">
                      <button
                        className="w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onClick={() => {
                          handleMergedReportsExport();
                          setShowExportDropdown(false);
                        }}
                      >
                        <span className="mr-2">📄</span>
                        <div>
                          <div className="font-medium">Merged Reports</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Download all as a merged PDF</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Export to Excel */}
              <button
                onClick={handleExportToExcel}
                className={`flex items-center justify-center h-8 px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 w-28 text-xs whitespace-nowrap`}
              >
                <span className="mr-1">📊</span>
                Export Sheet
              </button>
            </div>
          </div>
          
          {/* Filter Chips Row */}
          {(dateFilter.from || dateFilter.to || searchQuery || groupBy !== 'none' || sortBy !== 'date_desc' || selectedExaminer || selectedDepartment) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {/* Active Filter Chips */}
              {(dateFilter.from || dateFilter.to) && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
                  <span className="mr-1">📅</span>
                  <span>Time: {getDateRangeText()}</span>
                  <button 
                    onClick={() => {
                      setDateFilter({ from: '', to: '' });
                      setDateRangeOption('all');
                    }}
                    className="ml-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {sortBy !== 'date_desc' && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>
                  <span className="mr-1">⇅</span>
                  <span>Sort: {
                    sortBy === 'date_asc' ? 'Oldest First' :
                    sortBy === 'amount_desc' ? 'Amount (High-Low)' :
                    sortBy === 'amount_asc' ? 'Amount (Low-High)' :
                    sortBy === 'papers_desc' ? 'Papers (High-Low)' :
                    sortBy === 'papers_asc' ? 'Papers (Low-High)' :
                    sortBy === 'examiner_asc' ? 'Examiner (A-Z)' :
                    sortBy === 'examiner_desc' ? 'Examiner (Z-A)' :
                    'Custom'
                  }</span>
                  <button 
                    onClick={() => setSortBy('date_desc')}
                    className="ml-1 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {groupBy !== 'none' && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`}>
                  <span className="mr-1">🔗</span>
                  <span>Grouped: {
                    groupBy === 'examiner' ? 'By Examiner' :
                    groupBy === 'department' ? 'By Department' :
                    groupBy === 'month' ? 'By Month' :
                    'Custom'
                  }</span>
                  <button 
                    onClick={() => setGroupBy('none')}
                    className="ml-1 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {searchQuery && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                  <span className="mr-1">🔍</span>
                  <span>Search: "{searchQuery}"</span>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-1 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {selectedExaminer && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300`}>
                  <span className="mr-1">👤</span>
                  <span>Examiner: {getUniqueExaminers().find(e => e.id === selectedExaminer)?.name || selectedExaminer}</span>
                  <button 
                    onClick={() => setSelectedExaminer('')}
                    className="ml-1 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {selectedDepartment && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300`}>
                  <span className="mr-1">🏢</span>
                  <span>Department: {selectedDepartment}</span>
                  <button 
                    onClick={() => setSelectedDepartment('')}
                    className="ml-1 text-teal-500 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {showOnlyFavorites && (
                <div className={`flex items-center px-1.5 py-0.5 rounded-md text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
                  <span className="mr-1">⭐</span>
                  <span>Showing Favorites Only</span>
                  <button 
                    onClick={() => setShowOnlyFavorites(false)}
                    className="ml-1 text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Clear All Filters Button */}
              {(dateFilter.from || dateFilter.to || searchQuery || groupBy !== 'none' || sortBy !== 'date_desc' || selectedExaminer || selectedDepartment) && (
                <button
                  onClick={handleClearFilters}
                  className={`flex items-center px-1.5 py-0.5 rounded-md text-xs text-gray-700 dark:text-gray-300 border ${borderColor} hover:bg-gray-100 dark:hover:bg-gray-700`}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Empty State */}
        {!loading && !error && calculations.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className={`mt-2 text-lg font-medium ${textColor}`}>No calculations found</h3>
            <p className={`mt-1 ${secondaryText}`}>Start creating calculations to see them here.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        )}
        
        {/* No Results State */}
        {!loading && !error && calculations.length > 0 && filteredCalculations.length === 0 && (
          <div className="text-center py-8">
            <p className={`${secondaryText} mb-4`}>No results found for your search criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter({ from: '', to: '' });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Calculations Content */}
        {!loading && !error && filteredCalculations.length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedCalculations).map(([groupName, groupCalcs]) => (
              <div key={groupName} className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <h2 className={`text-xl font-semibold ${textColor}`}>{groupName}</h2>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Favorites Toggle */}
                    <button
                      onClick={toggleShowOnlyFavorites}
                      className={`flex items-center ${showOnlyFavorites ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'}`}
                      title={showOnlyFavorites ? "Show All" : "Show Favorites Only"}
                    >
                      <span className="text-xl">{showOnlyFavorites ? "⭐" : "☆"}</span>
                    </button>
                    
                    {/* View Toggle */}
                    <div className="flex border rounded-md overflow-hidden">
                      <button
                        className={`px-3 py-1 flex items-center ${viewMode === 'grid' ? 'bg-blue-600 text-white' : `${buttonBg} ${textColor}`}`}
                        onClick={() => setViewMode('grid')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        className={`px-3 py-1 flex items-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : `${buttonBg} ${textColor}`}`}
                        onClick={() => setViewMode('list')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                {viewMode === 'grid' 
                  ? renderCalculationGrid(groupCalcs) 
                  : renderCalculationList(groupCalcs)
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {/* More Filters Popup */}
      {showMoreFiltersPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className={`text-lg font-semibold ${textColor}`}>Advanced Filters</h3>
              <button 
                onClick={() => setShowMoreFiltersPopup(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Examiner Filter */}
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-1`}>Filter by Examiner</label>
                <select
                  value={selectedExaminer}
                  onChange={(e) => setSelectedExaminer(e.target.value)}
                  className={`w-full p-2 border ${borderColor} rounded-md text-sm ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                >
                  <option value="">All Examiners</option>
                  {getUniqueExaminers().map(examiner => (
                    <option key={examiner.id} value={examiner.id}>
                      {examiner.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Department Filter */}
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-1`}>Filter by Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={`w-full p-2 border ${borderColor} rounded-md text-sm ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                >
                  <option value="">All Departments</option>
                  {getUniqueDepartments().map(department => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Export Options */}
              <div>
                <h4 className={`text-sm font-medium ${textColor} mb-2`}>Custom Report Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeExaminerDetails}
                      onChange={() => handleExportOptionChange('includeExaminerDetails')}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`ml-2 text-sm ${textColor}`}>Include Examiner Details</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCalculationSummary}
                      onChange={() => handleExportOptionChange('includeCalculationSummary')}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`ml-2 text-sm ${textColor}`}>Include Calculation Summary</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeEvaluationBreakdown}
                      onChange={() => handleExportOptionChange('includeEvaluationBreakdown')}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`ml-2 text-sm ${textColor}`}>Include Evaluation Breakdown</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeStaffEvaluationTable}
                      onChange={() => handleExportOptionChange('includeStaffEvaluationTable')}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`ml-2 text-sm ${textColor}`}>Include Staff Evaluation Table</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.onlyFinalAmount}
                      onChange={() => handleExportOptionChange('onlyFinalAmount')}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`ml-2 text-sm ${textColor}`}>Only Show Final Amount</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedExaminer('');
                  setSelectedDepartment('');
                  setExportOptions({
                    includeExaminerDetails: true,
                    includeCalculationSummary: true,
                    includeEvaluationBreakdown: true,
                    includeStaffEvaluationTable: true,
                    onlyFinalAmount: false
                  });
                }}
                className={`px-3 py-1.5 text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
              >
                Reset Filters
              </button>
              <button
                onClick={() => {
                  setShowMoreFiltersPopup(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-white text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowMoreFiltersPopup(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </HistoryLayout>
  );
};

export default CalculationArchive;
