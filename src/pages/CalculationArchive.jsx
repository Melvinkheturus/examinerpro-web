import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import calculationService from '../services/calculationService';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import HistoryLayout from './HistoryLayout';
import { formatDate } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  // eslint-disable-next-line no-unused-vars
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');

  // Theme-based styling
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const secondaryText = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const buttonBg = isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200';

  // Fetch calculations
  useEffect(() => {
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

  // Handle bulk export
  const handleBulkExport = async () => {
    try {
      await calculationService.exportCalculations(selectedCalculations);
      toast.success('Calculations exported successfully');
    } catch (error) {
      console.error('Error exporting calculations:', error);
      toast.error('Failed to export calculations: ' + (error.message || 'Unknown error'));
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
        : filteredCalculations.map(calc => calc.id);
      
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
      
      // Update toast with progress
      toast.loading('Fetching calculation data...', { id: toastId });

      // Prepare date range if filtering by date
      let requestBody = {
        calculation_ids: calculationsToExport
      };
      
      if (dateFilter.from && dateFilter.to) {
        requestBody.start_date = dateFilter.from;
        requestBody.end_date = dateFilter.to;
      }
      
      // Add department filter if available
      if (departmentFilter && departmentFilter !== 'All Departments') {
        requestBody.department = departmentFilter;
      }
      
      // Debug log the request
      console.log('Edge function request:', { 
        url: 'https://zampawknbmlrnhsaacqm.supabase.co/functions/v1/generate-merged-pdf',
        body: requestBody 
      });
      
      // Call the Supabase Edge Function
      const res = await fetch('https://zampawknbmlrnhsaacqm.supabase.co/functions/v1/generate-merged-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      // Update toast with progress
      toast.loading('Processing server response...', { id: toastId });
      
      // Check for non-OK response
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Edge function error response:', { 
          status: res.status, 
          statusText: res.statusText,
          body: errorText
        });
        
        let errorMsg;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || `Server responded with status: ${res.status}`;
        } catch (e) {
          errorMsg = `Server responded with status: ${res.status}`;
        }
        
        throw new Error(errorMsg);
      }
      
      // Parse the response data
      const responseText = await res.text();
      console.log('Edge function raw response:', responseText.substring(0, 200) + '...');
      
      // Handle empty response
      if (!responseText || responseText.trim() === '') {
        toast.error('Empty response from server', { id: toastId });
        return;
      }
      
      // Parse JSON response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        toast.error('Invalid response format from server', { id: toastId });
        return;
      }
      
      console.log('Edge function parsed response:', result);
      
      // Extract calculations from the new response structure
      let calculations = [];
      
      // Handle the new structured response format
      if (result && result.status === "success" && Array.isArray(result.calculations)) {
        calculations = result.calculations;
      } 
      // Handle legacy or direct array response
      else if (Array.isArray(result)) {
        calculations = result;
      }
      // Handle single calculation response
      else if (result && typeof result === 'object' && (result.id || result.calculation_id)) {
        calculations = [result];
      }
      else {
        console.error('Unexpected response structure:', result);
        toast.error('Invalid response structure from server', { id: toastId });
        return;
      }
      
      // Ensure all calculations have proper examiner data
      calculations = calculations.map(calc => {
        // Extract examiner info safely to ensure complete data
        const examinerData = calc.examiners || calc.examiner || calc.examiner_data || {};
        const uniqueId = Math.random().toString(36).substr(2, 9);
        
        // Make sure all required fields have values
        calc.examiner_name = examinerData.full_name || examinerData.name || calc.examiner_name || calc.name || 'Unknown Examiner';
        calc.examiner_id = examinerData.examiner_id || examinerData.id || calc.examiner_id || calc.id || `unknown-${uniqueId}`;
        calc.department = examinerData.department || calc.department || 'General Department';
        
        // Also ensure calculation has total_papers, total_amount, etc.
        calc.total_papers = Number(calc.total_papers || calc.papers_evaluated || 0);
        calc.total_amount = Number(calc.total_amount || calc.final_amount || calc.amount || 0);
        calc.total_days = Number(calc.total_days || (calc.evaluation_days?.length || 0));
        calc.total_staff = Number(calc.total_staff || calc.staff_count || 1);
        
        return calc;
      });
      
      // Validate calculations - ensure we have data to work with
      if (calculations.length === 0) {
        console.error('No calculation data found in the response');
        toast.error('No calculation data found for the selected criteria', { id: toastId });
        return;
      }
      
      // Check if calculations contain basic expected data
      const validCalculations = calculations.filter(calc => {
        const hasExaminer = 
          (calc.examiner && (calc.examiner.name || calc.examiner.full_name)) || 
          calc.examiner_name;
        
        const hasPapers = 
          calc.total_papers !== undefined || 
          (calc.evaluationDays && calc.evaluationDays.length > 0) ||
          (calc.calculation_days && calc.calculation_days.length > 0);
        
        return hasExaminer && hasPapers;
      });
      
      if (validCalculations.length === 0 && calculations.length > 0) {
        console.warn('Found calculations but none had valid examiner and paper data', calculations);
        toast.error('Calculations found but they may be missing key data', { id: toastId });
      }
      
      // Update toast with progress
      toast.loading('Generating PDF from calculation data...', { id: toastId });
      
      // Generate HTML report with the enriched data
      const htmlContent = generateMergedReportHTML(calculations);
      
      // Update toast message
      toast.loading('Converting to PDF...', { id: toastId });
      
      try {
        // Create a container for the PDF content
        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        container.style.position = 'absolute';
        container.style.left = '-9999px'; // Off-screen
        container.style.top = '0';
        container.style.width = '210mm'; // A4 width
        document.body.appendChild(container);
        
        // Generate PDF
        const generatePDF = async () => {
          try {
            // Create a PDF document with A4 size
            const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
            });
            
            // Get all page section elements
            const sections = container.querySelectorAll('.section');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            
            // Process each section as potential page
            for (let i = 0; i < sections.length; i++) {
              // Add a new page for sections after the first one
              if (i > 0) {
                pdf.addPage();
              }
              
              const section = sections[i];
              
              try {
                // Convert section to canvas
                const canvas = await html2canvas(section, {
                  scale: 2,
                  useCORS: true,
                  letterRendering: true,
                  logging: false // Turn off verbose logging
                });
                
                // Calculate proper scaling to fit in PDF page
                const imgWidth = pdfWidth - 20; // 10mm margins on each side
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // Add the image to the PDF
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                // Add image centered on page with margins
                pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
                
              } catch (canvasError) {
                console.error(`Error rendering section ${i}:`, canvasError);
                // Continue with other sections
              }
            }
            
            // Save the PDF
            pdf.save(`ExaminerPro_Merged_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            
            // Clean up
            document.body.removeChild(container);
            
            // Show success message
            toast.success(`${calculations.length} reports merged and downloaded as PDF`, { id: toastId });
          } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            throw pdfError; // Re-throw to trigger fallback
          }
        };
        
        // Execute PDF generation with fallback
        generatePDF().catch(error => {
          console.error('Falling back to HTML download:', error);
          
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
            document.body.removeChild(container);
          }, 100);
          
          toast.error('PDF conversion failed. Downloaded as HTML instead.', { id: toastId });
        });
        
      } catch (setupError) {
        console.error('Error in PDF setup:', setupError);
        
        // Fallback to HTML if any error occurs in setup
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
    
    // Improved function to extract examiner information consistently
    const getExaminerInfo = (calc) => {
      // Extract examiner info safely
      const examinerData = calc.examiners || calc.examiner || calc.examiner_data || {};
      const examinerName = examinerData.full_name || examinerData.name || calc.examiner_name || calc.name || 'Unknown Examiner';
      const examinerId = examinerData.examiner_id || examinerData.id || calc.examiner_id || calc.id || `unknown-${Math.random().toString(36).substr(2, 9)}`;
      const department = examinerData.department || calc.department || 'General';
      
      return {
        name: examinerName,
        id: examinerId,
        department: department
      };
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
      
      // Extract examiner information using our improved helper
      const { name, id, department } = getExaminerInfo(calc);
      
      // Extract financial values
      const extractedTotalPapers = Number(calc.total_papers || calc.papers_evaluated || 0);
      const extractedTotalAmount = Number(calc.total_amount || calc.final_amount || calc.amount || 0);
      const extractedBaseAmount = Number(calc.base_salary || calc.base_amount || (extractedTotalAmount * 0.9) || 0);
      const extractedIncentiveAmount = Number(calc.incentive || calc.incentive_amount || (extractedTotalAmount * 0.1) || 0);
      const extractedStaffCount = Number(calc.total_staff || calc.staff_count || 0);
      
      // Debug the extracted values
      console.log('Extracted values:', {
        name,
        id,
        department,
        papers: extractedTotalPapers,
        amount: extractedTotalAmount
      });
      
      return {
        ...calc,
        extracted: {
          name,
          id,
          department,
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
      const examinerId = safe(calc.extracted.id);
      const examinerName = safe(calc.extracted.name);
      const department = safe(calc.extracted.department);
      
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
      
      // First try to extract from the nested structure
      if (calc.calculation_days && Array.isArray(calc.calculation_days) && calc.calculation_days.length > 0) {
        console.log('Processing from calculation_days:', calc.calculation_days);
        
        calc.calculation_days.forEach(cDay => {
          // Handle both evaluation_day (singular) and evaluation_days (plural)
          const evalDaysArray = [];
          
          if (cDay.evaluation_days && Array.isArray(cDay.evaluation_days)) {
            evalDaysArray.push(...cDay.evaluation_days);
          } else if (cDay.evaluation_day) {
            evalDaysArray.push(cDay.evaluation_day);
          }
          
          evalDaysArray.forEach(evalDay => {
            // Get staff evaluations from either path
            const staffEvals = evalDay.staff_evaluations || cDay.staff_evaluations || [];
            
            totalDays++;
            
            evaluationDays.push({
              date: evalDay.evaluation_date || evalDay.date || cDay.date,
              staff_count: staffEvals.length || 1,
              total_papers: staffEvals.reduce(
                (sum, staff) => sum + Number(staff.papers_evaluated || staff.papers || 0), 0
              ),
              staff: staffEvals.map(staff => ({
                name: safe(staff.staff_name || staff.name, `Staff ${staffEvals.indexOf(staff) + 1}`),
                papers: Number(staff.papers_evaluated || staff.papers || 0)
              }))
            });
          });
        });
      } 
      // Then try to extract from calculation_days array (previous structure)
      else if (calc.calculation_days && Array.isArray(calc.calculation_days) && calc.calculation_days.length > 0) {
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
      // Try evaluation_days (legacy structure)
      else if (calc.evaluation_days && Array.isArray(calc.evaluation_days) && calc.evaluation_days.length > 0) {
        console.log('Processing from evaluation_days:', calc.evaluation_days);
        
        evaluationDays = calc.evaluation_days.map(day => {
          // Extract staff data
          const dayStaff = (day.staff && Array.isArray(day.staff)) ? day.staff : [];
          
          totalDays++;
          
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
      }
      // Try evaluationDays (another possible structure)
      else if (calc.evaluationDays && Array.isArray(calc.evaluationDays) && calc.evaluationDays.length > 0) {
        console.log('Processing from evaluationDays:', calc.evaluationDays);
        
        evaluationDays = calc.evaluationDays.map(day => {
          // Extract staff data
          const dayStaff = (day.staff && Array.isArray(day.staff)) ? day.staff : [];
          
          totalDays++;
          
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
            min-height: 90vh;
            display: flex;
            flex-direction: column;
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
            text-align: center;
            font-size: 9pt;
            color: #666;
            padding: 10px 0;
            border-top: 1px solid #ddd;
            margin-top: 20px;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
          }
          
          .page-footer-spacer {
            height: 50px;
            width: 100%;
            margin-top: auto;
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
                  <td>${safe(dept)}</td>
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
        
        <div class="page-footer-spacer"></div>
        ${generatePageFooter(1)}
      </div>
    `;
    
    // Generate pages for each examiner (1 page per examiner now - no detailed breakdown)
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
                <p><strong>Name:</strong> ${safe(examiner.name)}</p>
                <p><strong>Examiner ID:</strong> ${safe(examiner.id)}</p>
                <p><strong>Department:</strong> ${safe(examiner.department)}</p>
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
                  <td class="text-center">${calc.total_days || 0}</td>
                  <td class="text-center">${calc.total_staff || 0}</td>
                  <td class="text-center">${calc.total_papers || 0}</td>
                  <td class="text-right">${currency(calc.base_amount || 0)}</td>
                  <td class="text-right">${currency(calc.incentive_amount || 0)}</td>
                  <td class="text-right">${currency(calc.total_amount || 0)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="text-center"><strong>${examiner.totalEvaluationDays || 0}</strong></td>
                <td class="text-center"><strong>${examiner.totalStaffCount || 0}</strong></td>
                <td class="text-center"><strong>${examiner.totalPapers || 0}</strong></td>
                <td class="text-right"><strong>${currency(examiner.totalAmount * 0.9 || 0)}</strong></td>
                <td class="text-right"><strong>${currency(examiner.totalAmount * 0.1 || 0)}</strong></td>
                <td class="text-right text-danger"><strong>${currency(examiner.totalAmount || 0)}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="page-footer-spacer"></div>
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

  // Handle custom reports selection
  const handleCustomReportsSelection = () => {
    // If there are already selected calculations, proceed with export
    if (selectedCalculations.length > 0) {
      handleBulkExport();
      return;
    }
    
    // Otherwise show a toast guiding the user to select calculations first
    toast.dismiss();
    toast('Please select specific calculations using the checkboxes, then click Export Reports again', 
      { duration: 5000 });
      
    // Add a slight highlight effect to the checkboxes to draw attention
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        checkbox.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 2000);
    });
  };

  // Handle Excel Export
  const handleExportToExcel = () => {
    try {
      // Access XLSX from window global (added via CDN)
      const XLSX = window.XLSX;
      
      if (!XLSX) {
        toast.error('Excel library not loaded. Please refresh the page and try again.');
        return;
      }
      
      toast.loading('Generating Excel report...');
      
      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Filter calculations - only include finalized ones
      const finalizedCalculations = calculations.filter(calc => 
        calc.pdf_url || calc.status === 'saved' || calc.calculation_status === 'completed'
      );
      
      // Group calculations by department
      const departmentGroups = {};
      let totalExaminers = 0;
      let totalEvaluations = 0;
      let totalPapers = 0;
      let totalAmount = 0;
      
      // Process calculations and group by department
      finalizedCalculations.forEach(calc => {
        const department = calc.department || 'Unassigned';
        
        if (!departmentGroups[department]) {
          departmentGroups[department] = {
            calculations: [],
            examiners: new Set(),
            evaluations: 0,
            papers: 0,
            amount: 0
          };
        }
        
        departmentGroups[department].calculations.push(calc);
        departmentGroups[department].examiners.add(calc.examiner_id);
        departmentGroups[department].evaluations += 1;
        departmentGroups[department].papers += (calc.total_papers || 0);
        departmentGroups[department].amount += (calc.total_amount || calc.final_amount || 0);
        
        // Update totals
        totalPapers += (calc.total_papers || 0);
        totalAmount += (calc.total_amount || calc.final_amount || 0);
      });
      
      totalExaminers = Object.values(departmentGroups).reduce((sum, dept) => sum + dept.examiners.size, 0);
      totalEvaluations = Object.values(departmentGroups).reduce((sum, dept) => sum + dept.evaluations, 0);
      
      // Define colors for styling
      const lightBlue = { fgColor: { rgb: "D9EAF7" } };
      const lightGreen = { fgColor: { rgb: "E2EFDA" } };
      const headerFont = { bold: true };
      const titleFont = { bold: true, sz: 14 };
      const centerAlign = { horizontal: 'center' };
      // eslint-disable-next-line no-unused-vars
      const rightAlign = { horizontal: 'right' };
      const border = { 
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Create summary sheet
      const summaryData = [];
      const currentDate = new Date();
      const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
      
      // Title and header info (blank cells for proper alignment)
      summaryData.push([null, null, null, null, null, null]);
      summaryData.push([null, "CHIEF EXAMINER SALARY REPORT SUMMARY", null, null, null, null]);
      summaryData.push([null, `Report Date: ${formattedDate} | Powered by ExaminerPro`, null, null, null, null]);
      summaryData.push([null, null, null, null, null, null]);
      
      // Headers row
      summaryData.push([null, "Department", "No. of Examiners", "Total Evaluations", "Total Papers", "Total Paid"]);
      
      // Add department data
      Object.entries(departmentGroups).forEach(([department, data]) => {
        summaryData.push([
          null,
          department,
          data.examiners.size,
          data.evaluations,
          data.papers,
          `₹ ${Number(data.amount).toFixed(2)}`
        ]);
      });
      
      // Add total row
      summaryData.push([
        null,
        "TOTAL",
        totalExaminers,
        totalEvaluations,
        totalPapers,
        `₹ ${Number(totalAmount).toFixed(2)}`
      ]);
      
      // Convert to worksheet
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Apply styles to summary sheet
      const summaryRange = XLSX.utils.decode_range(summarySheet['!ref']);
      
      // Title cell styling (B2)
      summarySheet['B2'] = { 
        v: "CHIEF EXAMINER SALARY REPORT SUMMARY", 
        t: 's',
        s: { ...titleFont, ...centerAlign }
      };
      
      // Apply style to header row (B5:F5)
      for (let col = 1; col <= 5; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 4, c: col });
        if (summarySheet[cellRef]) {
          summarySheet[cellRef].s = { ...headerFont, ...lightGreen, ...border };
        }
      }
      
      // Apply background to title area (B2:F2)
      for (let col = 1; col <= 5; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 1, c: col });
        if (summarySheet[cellRef]) {
          summarySheet[cellRef].s = { ...titleFont, ...lightBlue };
        } else {
          summarySheet[cellRef] = { v: "", t: 's', s: { ...lightBlue } };
        }
      }
      
      // Style the total row
      for (let col = 1; col <= 5; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: summaryRange.e.r, c: col });
        if (summarySheet[cellRef]) {
          summarySheet[cellRef].s = { ...headerFont, ...lightGreen, ...border };
        }
      }
      
      // Apply column widths
      summarySheet['!cols'] = [
        { width: 5 },
        { width: 40 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 }
      ];
      
      // Add summary sheet to workbook
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Create department sheets
      Object.entries(departmentGroups).forEach(([department, data]) => {
        // Group calculations by examiner
        const examinerGroups = {};
        
        data.calculations.forEach(calc => {
          const examinerId = calc.examiner_id || 'Unknown';
          if (!examinerGroups[examinerId]) {
            examinerGroups[examinerId] = {
              examinerName: calc.examiner_name || 'Unknown',
              calculations: [],
              totalCalcs: 0,
              totalPapers: 0,
              totalPaid: 0
            };
          }
          
          examinerGroups[examinerId].calculations.push(calc);
          examinerGroups[examinerId].totalCalcs += 1;
          examinerGroups[examinerId].totalPapers += (calc.total_papers || 0);
          examinerGroups[examinerId].totalPaid += (calc.total_amount || calc.final_amount || 0);
        });
        
        // Create department data as array of arrays for better formatting control
        const departmentData = [];
        
        // Title and header info
        departmentData.push([null, null, null, null, null, null, null, null, null]);
        departmentData.push([null, `${department} DEPARTMENT REPORT`, null, null, null, null, null, null, null]);
        departmentData.push([null, `Report Date: ${formattedDate} | Powered by ExaminerPro`, null, null, null, null, null, null, null]);
        departmentData.push([null, null, null, null, null, null, null, null, null]);
        
        // Section A: Examiners Summary
        departmentData.push([null, "A. Examiners Summary", null, null, null, null, null, null, null]);
        departmentData.push([null, "Examiners Name", "Examiners ID", "Total Calculation", "Total Papers", "Total Paid", null, null, null]);
        
        // Add examiners data
        let totalCalculation = 0;
        let totalPapers = 0;
        let totalAmount = 0;
        
        Object.entries(examinerGroups).forEach(([examinerId, examinerData]) => {
          departmentData.push([
            null,
            examinerData.examinerName,
            examinerId,
            examinerData.totalCalcs,
            examinerData.totalPapers,
            `₹ ${Number(examinerData.totalPaid).toFixed(2)}`,
            null, null, null
          ]);
          
          totalCalculation += examinerData.totalCalcs;
          totalPapers += examinerData.totalPapers;
          totalAmount += examinerData.totalPaid;
        });
        
        // Add total row for section A
        departmentData.push([
          null, 
          "Total", 
          null, 
          totalCalculation,
          totalPapers, 
          `₹ ${Number(totalAmount).toFixed(2)}`, 
          null, null, null
        ]);
        
        // Empty row
        departmentData.push([null, null, null, null, null, null, null, null, null]);
        
        // Section B: Individual Examiner Details
        departmentData.push([null, "B. Individual Examiner Details", null, null, null, null, null, null, null]);
        
        // For each examiner, add detailed evaluation reports
        Object.entries(examinerGroups).forEach(([examinerId, examinerData]) => {
          // Consolidated header for examiner
          departmentData.push([null, `Consolidated Examiner Evaluation Report - ${examinerData.examinerName}`, null, null, null, null, null, null, null]);
          
          // Table headers for evaluation details
          departmentData.push([
            null, "Examiner Name", "Examiner ID", "Calc. Date", "Eval Days", "Total Staff", 
            "Total Papers", "Base ₹", "Incentive ₹", "Final ₹"
          ]);
          
          // Add calculation rows for this examiner
          let examinerTotalDays = 0;
          let examinerTotalStaff = 0;
          let examinerTotalPapers = 0;
          let examinerTotalBase = 0;
          let examinerTotalIncentive = 0;
          let examinerTotalFinal = 0;
          
          examinerData.calculations.forEach(calc => {
            const calcDate = formatDate(calc.calculation_date || calc.created_at || new Date()).slice(0, 10);
            const evalDays = calc.total_days || calc.evaluationDays?.length || 0;
            const staffCount = calc.total_staff || calc.staff_count || 0;
            const papers = calc.total_papers || 0;
            const baseAmount = calc.base_amount || 0;
            const incentiveAmount = calc.incentive_amount || 0;
            const finalAmount = calc.total_amount || calc.final_amount || 0;
            
            departmentData.push([
              null,
              examinerData.examinerName,
              examinerId,
              calcDate,
              evalDays,
              staffCount,
              papers,
              `₹ ${Number(baseAmount).toFixed(2)}`,
              `₹ ${Number(incentiveAmount).toFixed(2)}`,
              `₹ ${Number(finalAmount).toFixed(2)}`
            ]);
            
            examinerTotalDays += evalDays;
            examinerTotalStaff += staffCount;
            examinerTotalPapers += papers;
            examinerTotalBase += baseAmount;
            examinerTotalIncentive += incentiveAmount;
            examinerTotalFinal += finalAmount;
          });
          
          // Add total row for this examiner
          departmentData.push([
            null,
            "Total",
            null,
            null,
            examinerTotalDays,
            examinerTotalStaff,
            examinerTotalPapers,
            `₹ ${Number(examinerTotalBase).toFixed(2)}`,
            `₹ ${Number(examinerTotalIncentive).toFixed(2)}`,
            `₹ ${Number(examinerTotalFinal).toFixed(2)}`
          ]);
          
          // Add empty row after examiner
          departmentData.push([null, null, null, null, null, null, null, null, null]);
        });
        
        // Create valid sheet name (Excel has a 31 character limit)
        let sheetName = department;
        if (sheetName.length > 31) {
          // Truncate to 28 chars and add "..." to indicate truncation
          sheetName = sheetName.substring(0, 28) + "...";
        }
        
        // Create sheet from array of arrays
        const departmentSheet = XLSX.utils.aoa_to_sheet(departmentData);
        
        // Apply styles to department sheet
        const range = XLSX.utils.decode_range(departmentSheet['!ref']);
        
        // Style title (B2)
        departmentSheet['B2'] = { 
          v: `${department} DEPARTMENT REPORT`, 
          t: 's',
          s: { ...titleFont, ...centerAlign }
        };
        
        // Apply background to title (B2 to J2)
        for (let col = 1; col <= 9; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: 1, c: col });
          if (departmentSheet[cellRef]) {
            departmentSheet[cellRef].s = { ...titleFont, ...centerAlign, ...lightBlue };
          } else {
            departmentSheet[cellRef] = { v: "", t: 's', s: { ...lightBlue } };
          }
        }
        
        // Apply style to Section A title (B5)
        departmentSheet['B5'] = { 
          v: "A. Examiners Summary", 
          t: 's',
          s: { ...titleFont, ...lightBlue }
        };
        
        // Apply background to section A title row
        for (let col = 1; col <= 9; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: 4, c: col });
          if (!departmentSheet[cellRef]) {
            departmentSheet[cellRef] = { v: "", t: 's', s: { ...lightBlue } };
          } else {
            departmentSheet[cellRef].s = { ...lightBlue };
          }
        }
        
        // Apply style to Section A headers (row 6)
        for (let col = 1; col <= 5; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: 5, c: col });
          if (departmentSheet[cellRef]) {
            departmentSheet[cellRef].s = { ...headerFont, ...lightGreen, ...border };
          }
        }
        
        // Find the row index of Section B (search for "B. Individual Examiner Details")
        let sectionBRow = null;
        for (let r = 0; r <= range.e.r; r++) {
          const cellRef = XLSX.utils.encode_cell({ r, c: 1 });
          if (departmentSheet[cellRef] && departmentSheet[cellRef].v === "B. Individual Examiner Details") {
            sectionBRow = r;
            break;
          }
        }
        
        // Add style to Section B title if found
        if (sectionBRow !== null) {
          departmentSheet[XLSX.utils.encode_cell({ r: sectionBRow, c: 1 })] = {
            v: "B. Individual Examiner Details",
            t: 's',
            s: { ...titleFont, ...lightBlue }
          };
          
          // Apply background to section B title row
          for (let col = 1; col <= 9; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: sectionBRow, c: col });
            if (!departmentSheet[cellRef]) {
              departmentSheet[cellRef] = { v: "", t: 's', s: { ...lightBlue } };
            } else {
              departmentSheet[cellRef].s = { ...lightBlue };
            }
          }
          
          // Style the "Consolidated Examiner Evaluation Report" rows
          for (let r = sectionBRow + 1; r <= range.e.r; r++) {
            const cellRef = XLSX.utils.encode_cell({ r, c: 1 });
            const cellValue = departmentSheet[cellRef]?.v || "";
            
            if (typeof cellValue === 'string' && cellValue.includes("Consolidated Examiner Evaluation Report")) {
              // Style the consolidated header row
              for (let col = 1; col <= 9; col++) {
                const headerCellRef = XLSX.utils.encode_cell({ r, c: col });
                if (!departmentSheet[headerCellRef]) {
                  departmentSheet[headerCellRef] = { v: "", t: 's', s: { ...lightBlue } };
                } else {
                  departmentSheet[headerCellRef].s = { ...lightBlue };
                }
              }
              
              // Style the table headers in the next row
              for (let col = 1; col <= 9; col++) {
                const headerCellRef = XLSX.utils.encode_cell({ r: r + 1, c: col });
                if (departmentSheet[headerCellRef]) {
                  departmentSheet[headerCellRef].s = { ...headerFont, ...lightGreen, ...border };
                }
              }
            }
            
            // Style the "Total" rows
            if (departmentSheet[cellRef]?.v === "Total") {
              for (let col = 1; col <= 9; col++) {
                const totalCellRef = XLSX.utils.encode_cell({ r, c: col });
                if (departmentSheet[totalCellRef]) {
                  departmentSheet[totalCellRef].s = { ...headerFont, ...lightGreen };
                }
              }
            }
          }
        }
        
        // Apply column widths
        departmentSheet['!cols'] = [
          { width: 5 },
          { width: 20 },
          { width: 15 },
          { width: 15 },
          { width: 10 },
          { width: 10 },
          { width: 12 },
          { width: 15 },
          { width: 15 },
          { width: 15 }
        ];
        
        // Add department sheet to workbook
        XLSX.utils.book_append_sheet(workbook, departmentSheet, sheetName);
      });
      
      // Write and download the Excel file with the new naming convention
      const date = new Date();
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      const filename = `GNC_Examiner_Reports_${month}-${year}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      
      toast.dismiss();
      toast.success('Excel report generated successfully');
    } catch (error) {
      toast.dismiss();
      console.error('Error generating Excel report:', error);
      toast.error('Failed to generate Excel report: ' + (error.message || 'Unknown error'));
    }
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
    if (selectedCalculations.includes(id)) {
      setSelectedCalculations(selectedCalculations.filter(calcId => calcId !== id));
    } else {
      setSelectedCalculations([...selectedCalculations, id]);
    }
  };

  // Handle select all
  // eslint-disable-next-line no-unused-vars
  const handleSelectAll = () => {
    if (selectedCalculations.length === filteredCalculations.length) {
      setSelectedCalculations([]);
    } else {
      setSelectedCalculations(filteredCalculations.map(calc => calc.id));
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
        (calc.examiner_id && calc.examiner_id.toLowerCase().includes(query)) ||
        (calc.calculation_name && calc.calculation_name.toLowerCase().includes(query)) ||
        (calc.department && calc.department.toLowerCase().includes(query))
      );
    }
    
    // Apply date filter
    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from);
      filtered = filtered.filter(calc => new Date(calc.calculation_date) >= fromDate);
    }
    
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to);
      filtered = filtered.filter(calc => new Date(calc.calculation_date) <= toDate);
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
      case 'today':
        fromDate = today.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        fromDate = weekStart.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = monthStart.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        fromDate = yearStart.toISOString().split('T')[0];
        toDate = today.toISOString().split('T')[0];
        break;
      case 'custom':
        setShowDateRangePicker(true);
        return;
      default: // 'all'
        fromDate = '';
        toDate = '';
    }
    
    setDateFilter({ from: fromDate, to: toDate });
    setShowDateRangePicker(false);
  };

  // Format date range for display
  const getDateRangeText = () => {
    if (dateRangeOption === 'all') return 'All Time';
    if (dateRangeOption === 'today') return 'Today';
    if (dateRangeOption === 'week') return 'This Week';
    if (dateRangeOption === 'month') return 'This Month';
    if (dateRangeOption === 'year') return 'This Year';
    
    if (dateRangeOption === 'custom') {
      if (dateFilter.from && dateFilter.to) {
        // Format dates in a more compact way: "01 Jan - 15 Feb"
        const formatDate = (dateStr) => {
          const date = new Date(dateStr);
          const day = date.getDate();
          const month = date.toLocaleString('default', { month: 'short' });
          return `${day} ${month}`;
        };
        return `${formatDate(dateFilter.from)} - ${formatDate(dateFilter.to)}`;
      }
      return 'Custom Range';
    }
    
    return 'Select Date Range';
  };
  
  // Toggle group mode
  const toggleGroupMode = () => {
    if (groupBy === 'none') {
      setGroupBy('examiner');
    } else {
      setGroupBy('none');
    }
  };
  
  // Handle PDF download
  const handleDownloadPDF = async (calculationId) => {
    try {
      toast.loading('Preparing PDF download...', { id: 'pdf-toast' });
      
      // Find the calculation to get its details
      const calculation = calculations.find(c => c.id === calculationId);
      
      if (!calculation) {
        toast.error('Calculation not found', { id: 'pdf-toast' });
        return false;
      }
      
      // Check if PDF URL already exists and try to fetch it
      if (calculation && calculation.pdf_url) {
        try {
      await calculationService.downloadCalculationPDF({ calculationId });
          toast.success('PDF downloaded successfully', { id: 'pdf-toast' });
          return true;
        } catch (error) {
          console.warn('Could not download existing PDF, will regenerate:', error);
          // Continue to regeneration below
        }
      }
      
      toast.loading('Generating new PDF report...', { id: 'pdf-toast' });
      
      // Extract calculation data
      const examinerName = calculation.examiner_name || "Unknown Examiner";
      const examinerId = calculation.examiner_id || "N/A";
      const department = calculation.department || "N/A";
      const totalPapers = calculation.total_papers || 0;
      const totalStaff = calculation.total_staff || calculation.staff_count || 0;
      const baseSalary = calculation.base_salary || calculation.base_amount || 0;
      const incentive = calculation.incentive || calculation.incentive_amount || 0;
      const finalAmount = calculation.total_amount || calculation.final_amount || 0;
      
      // Format functions
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 2
        }).format(parseFloat(amount) || 0);
      };
      
      // Get current date
      const currentDate = formatDate(new Date());
      const calculationDate = formatDate(calculation.calculation_date || calculation.created_at || new Date());
      
      // Generate evaluation days details
      let evaluationDaysHtml = '';
      
      // Check if we have detailed calculation days
      if (calculation.calculation_days && Array.isArray(calculation.calculation_days)) {
        calculation.calculation_days.forEach((day, index) => {
          const evalDay = day.evaluation_day || {};
          const evalDate = formatDate(evalDay.date || day.date || new Date());
          const staffCount = evalDay.staff_count || day.staff_count || 1;
          const totalPapers = evalDay.total_papers || day.total_papers || 0;
          
          // Calculate papers per staff for this day
          const papersPerStaff = Math.floor(totalPapers / staffCount);
          const remainder = totalPapers % staffCount;
          
          let staffRows = '';
          for (let i = 0; i < staffCount; i++) {
            // Add extra papers to the first staff member if there's a remainder
            const extraPapers = i === 0 ? remainder : 0;
            const staffPapers = papersPerStaff + extraPapers;
            
            staffRows += `
              <tr>
                <td>Staff ${i + 1}</td>
                <td class="text-right">${staffPapers}</td>
              </tr>
            `;
          }
          
          evaluationDaysHtml += `
            <div class="evaluation-day">
              <h4>Day ${index + 1} – ${evalDate}</h4>
              <table class="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th class="text-right">Papers Evaluated</th>
                  </tr>
                </thead>
                <tbody>
                  ${staffRows}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total Papers</strong></td>
                    <td class="text-right"><strong>${totalPapers}</strong></td>
                  </tr>
                </tfoot>
              </table>
              <p class="day-salary">Calculated Chief Examiner Salary for this day: ${formatCurrency(totalPapers * 20)}</p>
            </div>
          `;
        });
      } else {
        // If no detailed days, create a simplified single day view
        evaluationDaysHtml = `
          <div class="evaluation-day">
            <h4>Evaluation Day – ${calculationDate}</h4>
            <table class="staff-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Staff</td>
                  <td class="text-right">${totalStaff}</td>
                </tr>
                <tr>
                  <td>Total Papers</td>
                  <td class="text-right">${totalPapers}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }
      
      // Create a professional HTML representation of the calculation data
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Examiner Salary Calculation</title>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              
              body {
                font-family: 'Inter', sans-serif;
                padding: 0;
                margin: 0;
                color: #333;
                font-size: 11pt;
                line-height: 1.5;
              }
              
              .wrapper {
                max-width: 210mm; /* A4 width */
                margin: 0 auto;
                padding: 20px;
              }
              
              /* Header Section */
              .header {
                text-align: center;
                margin-bottom: 30px;
                position: relative;
                padding-bottom: 15px;
                border-bottom: 1px solid #ddd;
              }
              
              .college-name {
                font-size: 18pt;
                font-weight: 700;
                text-transform: uppercase;
                margin: 0;
                padding: 0;
                font-family: 'Arial', 'Helvetica', sans-serif;
              }
              
              .college-affiliation {
                font-style: italic;
                font-size: 10pt;
                margin: 4px 0;
                font-family: 'Arial', 'Helvetica', sans-serif;
                font-weight: 600;
              }
              
              .department {
                font-weight: 700;
                text-transform: uppercase;
                text-decoration: underline;
                margin: 8px 0;
                font-family: 'Arial', 'Helvetica', sans-serif;
              }
              
              .header-date {
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 9pt;
              }
              
              /* Examiner Info Section */
              .examiner-info {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 25px;
                display: flex;
                flex-wrap: wrap;
              }
              
              .info-label {
                width: 40%;
                font-weight: 500;
                padding: 5px 0;
              }
              
              .info-value {
                width: 60%;
                padding: 5px 0;
              }
              
              .examiner-title {
                display: inline-block;
                margin-left: 10px;
                background-color: #E3F2FD;
                border: 1px solid #90CAF9;
                border-radius: 4px;
                padding: 2px 8px;
                font-size: 9pt;
              }
              
              /* Summary Table */
              .summary-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              
              .summary-table th,
              .summary-table td {
                padding: 10px;
                border: 1px solid #ddd;
              }
              
              .summary-table th {
                background-color: #f5f5f5;
                font-weight: 600;
                text-align: left;
              }
              
              .summary-table td.value {
                text-align: right;
              }
              
              .summary-table tr.total-row {
                background-color: #FFFDE7;
                font-weight: 700;
                color: #D32F2F;
              }
              
              /* Detailed Report */
              .detailed-report {
                margin-bottom: 30px;
              }
              
              .section-title {
                font-size: 14pt;
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #3F51B5;
                color: #3F51B5;
                font-weight: 600;
              }
              
              .evaluation-day {
                margin-bottom: 25px;
                border-left: 3px solid #E0E0E0;
                padding-left: 15px;
              }
              
              .evaluation-day h4 {
                margin: 0 0 10px 0;
                font-weight: 600;
                color: #455A64;
              }
              
              .staff-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
              }
              
              .staff-table th,
              .staff-table td {
                padding: 8px;
                border: 1px solid #ddd;
                text-align: left;
              }
              
              .staff-table th {
                background-color: #f5f5f5;
                font-weight: 500;
              }
              
              .staff-table tfoot {
                background-color: #ECEFF1;
              }
              
              .text-right {
                text-align: right !important;
              }
              
              .day-salary {
                margin: 5px 0;
                font-weight: 500;
                color: #455A64;
              }
              
              /* Footer */
              .footer {
                margin-top: 40px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                text-align: center;
                font-size: 9pt;
                color: #757575;
              }
              
              .footer-branding {
                font-weight: 600;
                margin-bottom: 5px;
              }
              
              .copyright {
                font-size: 8pt;
              }
            </style>
          </head>
          <body>
            <div class="wrapper">
              <!-- Header Section -->
              <div class="header">
                <div class="header-date">Report Generated: ${currentDate}</div>
                <h1 class="college-name">Guru Nanak College (Autonomous)</h1>
                <p class="college-affiliation">Affiliated to University of Madras, Chennai</p>
                <p class="department">Controller of Examinations (COE)</p>
              </div>
              
              <!-- Examiner Info Section -->
              <div class="examiner-info">
                <div class="info-label">Full Name:</div>
                <div class="info-value">
                  <strong>${examinerName}</strong>
                  <span class="examiner-title">Chief Examiner</span>
                </div>
                
                <div class="info-label">Examiner ID:</div>
                <div class="info-value">${examinerId}</div>
                
                <div class="info-label">Department:</div>
                <div class="info-value">${department}</div>
                
                <div class="info-label">Calculation Date:</div>
                <div class="info-value">${calculationDate}</div>
              </div>
              
              <!-- Summary Table -->
              <h2 class="section-title">Summary Calculation</h2>
              <table class="summary-table">
                <tbody>
                  <tr>
                    <th>Total Papers</th>
                    <td class="value">${totalPapers}</td>
                  </tr>
                  <tr>
                    <th>Total Staff</th>
                    <td class="value">${totalStaff}</td>
                  </tr>
                  <tr>
                    <th>Base Salary</th>
                    <td class="value">${formatCurrency(baseSalary)}</td>
                  </tr>
                  <tr>
                    <th>Incentive (10%)</th>
                    <td class="value">${formatCurrency(incentive)}</td>
                  </tr>
                  <tr class="total-row">
                    <th>Final Amount</th>
                    <td class="value">${formatCurrency(finalAmount)}</td>
                  </tr>
                </tbody>
              </table>
              
              <!-- Detailed Report -->
              <h2 class="section-title">Detailed Calculation Report</h2>
              <div class="detailed-report">
                ${evaluationDaysHtml}
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <p class="footer-branding">Generated via ExaminerPro — Center of Examination (COE) Automation System</p>
                <p class="copyright">© 2024 Guru Nanak College - Controller of Examinations</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      try {
        // Create a container for the PDF content
        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        container.style.position = 'absolute';
        container.style.left = '-9999px'; // Off-screen
        container.style.top = '0';
        container.style.width = '210mm'; // A4 width
        document.body.appendChild(container);
        
        // Create a PDF document with A4 size
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Convert HTML to canvas and add to PDF
        const element = container.querySelector('.wrapper');
        
        await html2canvas(element, {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false // Turn off verbose logging
        }).then(canvas => {
          // Calculate proper scaling to fit in PDF page
          const imgWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm margins on each side
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Add the image to the PDF
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
          
          // Save the PDF
          const fileName = `calculation_${examinerId}_${new Date().getTime()}.pdf`;
          pdf.save(fileName);
        });
        
        // Clean up
        document.body.removeChild(container);
        
        // Update PDF URL in the database
        const timestamp = new Date().getTime();
        const pdfFileName = `calculation_${examinerId}_${timestamp}.pdf`;
        const pdfUrl = `/pdfs/${pdfFileName}`;
        
        try {
          // Update the existing record with the PDF URL
          const { error: updateError } = await supabase
            .from('calculation_documents')
            .update({ pdf_url: pdfUrl })
            .eq('id', calculationId);
            
          if (updateError) {
            console.warn('Error updating calculation with PDF URL:', updateError);
          }
        } catch (dbError) {
          console.warn('Failed to update PDF URL in database:', dbError);
        }
        
        toast.success('PDF generated and downloaded successfully', { id: 'pdf-toast' });
        return true;
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        
        // Fallback to HTML if PDF generation fails
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = `calculation_${examinerId}_${new Date().getTime()}.html`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);
        
        toast.warning('PDF conversion failed. Downloaded as HTML instead.', { id: 'pdf-toast' });
        return false;
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error downloading PDF:', error);
      toast.error('Error downloading PDF: ' + (error.message || 'Unknown error'), { id: 'pdf-toast' });
      return false;
    }
  };

  // Render calculation grid
  const renderCalculationGrid = (calculations) => {
    // Group calculations if needed
    const grouped = groupBy !== 'none' ? groupCalculations(calculations) : {'All Calculations': calculations};
    
    return (
      <div className="space-y-4 md:space-y-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            {/* Group Header - Only show if grouped */}
            {groupBy !== 'none' && (
              <div className="px-3 md:px-4 py-2 md:py-3 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-3 md:mb-4 flex justify-between items-center">
                <h3 className="font-medium text-gray-800 dark:text-white text-sm md:text-base">{group}</h3>
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{items.length} calculations</span>
              </div>
            )}
            
            {/* Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {items.map((calculation) => (
                <div 
                  key={calculation.id} 
                  className={`relative rounded-lg shadow-md overflow-hidden ${
                    selectedCalculations.includes(calculation.id) 
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                      : ''
                  }`}
                >
                  {/* Card Content */}
                  <div className="bg-white dark:bg-gray-800 p-3 md:p-4">
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 md:top-3 right-2 md:right-3">
                      <input
                        type="checkbox"
                        checked={selectedCalculations.includes(calculation.id)}
                        onChange={() => handleSelectCalculation(calculation.id)}
                        className="h-4 w-4 md:h-5 md:w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Header */}
                    <div className="mb-2 md:mb-3 pr-5 md:pr-6">
                      <h4 className="text-sm md:text-base font-medium text-gray-900 dark:text-white mb-1 truncate">
                        {calculation.examiner_name || 'Unknown Examiner'}
                      </h4>
                      <div className="flex justify-between text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatDate(calculation.calculation_date || calculation.created_at)}</span>
                        <span className="font-medium">₹{calculation.total_amount?.toFixed(2) || 0}</span>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 mb-3 md:mb-4">
                      <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {calculation.total_papers || 0} Papers
                      </span>
                      <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {calculation.total_days || 0} Days
                      </span>
                      {calculation.department && (
                        <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 truncate max-w-[100px] md:max-w-[120px]" title={calculation.department}>
                          {calculation.department}
                        </span>
                      )}
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs md:text-sm mb-3 md:mb-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-1.5 md:p-2 rounded">
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Base</p>
                        <p className="font-medium">₹{calculation.base_salary || 0}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-1.5 md:p-2 rounded">
                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Incentive</p>
                        <p className="font-medium">₹{calculation.incentive || 0}</p>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                      <button
                        onClick={() => navigate(`/calculations/${calculation.id}`)}
                        className="w-full py-1 md:py-1.5 text-[10px] md:text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(calculation.id)}
                        className="w-full py-1 md:py-1.5 text-[10px] md:text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => handleDelete(calculation.id)}
                        className="w-full py-1 md:py-1.5 text-[10px] md:text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleRecalculate(calculation.id)}
                        className="w-full py-1 md:py-1.5 text-[10px] md:text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800/40 transition-colors"
                      >
                        Recalculate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render calculation list
  const renderCalculationList = (calculations) => {
    // Group calculations if needed
    const grouped = groupBy !== 'none' ? groupCalculations(calculations) : {'All Calculations': calculations};
    
    return (
      <div className="space-y-4 md:space-y-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Group Header - Only show if grouped */}
            {groupBy !== 'none' && (
              <div className="px-3 md:px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <h3 className="font-medium text-gray-800 dark:text-white text-sm md:text-base">{group}</h3>
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{items.length} calculations</span>
              </div>
            )}
            
            {/* Items */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((calculation) => (
                <div 
                  key={calculation.id} 
                  className={`p-3 md:p-4 ${
                    selectedCalculations.includes(calculation.id) 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  } transition-colors`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0 mr-2 md:mr-3 mb-2 md:mb-0">
                      <input
                        type="checkbox"
                        checked={selectedCalculations.includes(calculation.id)}
                        onChange={() => handleSelectCalculation(calculation.id)}
                        className="h-4 w-4 md:h-5 md:w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-grow md:mr-2 mb-2 md:mb-0">
                      <div className="flex flex-col md:flex-row md:items-center mb-1 space-y-1 md:space-y-0 md:space-x-3">
                        <h4 className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                          {calculation.examiner_name || 'Unknown Examiner'}
                        </h4>
                        <div className="flex items-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDate(calculation.calculation_date || calculation.created_at)}</span>
                          <span className="mx-2">•</span>
                          <span>₹{calculation.total_amount?.toFixed(2) || 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Papers: {calculation.total_papers || 0}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Days: {calculation.total_days || 0}
                        </span>
                        {calculation.department && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {calculation.department}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-row sm:flex-col md:flex-row space-x-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => toggleExpand(calculation.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        {expandedItems[calculation.id] ? 'Hide Details' : 'View Details'}
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(calculation.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                      >
                        Download PDF
                      </button>
                      <button
                        onClick={() => handleDelete(calculation.id)}
                        className="flex-1 sm:flex-none px-3 py-1.5 text-xs rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedItems[calculation.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Evaluation Details</h5>
                          <div className="text-sm">
                            <p className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span>Total Papers:</span>
                              <span className="font-medium">{calculation.total_papers || 0}</span>
                            </p>
                            <p className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span>Total Staff:</span>
                              <span className="font-medium">{calculation.total_staff || 0}</span>
                            </p>
                            <p className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span>Evaluation Days:</span>
                              <span className="font-medium">{calculation.total_days || 0}</span>
                            </p>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Salary Breakdown</h5>
                          <div className="text-sm">
                            <p className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span>Base Salary:</span>
                              <span className="font-medium">₹{calculation.base_salary || 0}</span>
                            </p>
                            <p className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span>Incentives:</span>
                              <span className="font-medium">₹{calculation.incentive || 0}</span>
                            </p>
                            <p className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                              <span>Final Amount:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">₹{calculation.total_amount?.toFixed(2) || 0}</span>
                            </p>
                          </div>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Actions</h5>
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => navigate(`/calculations/${calculation.id}`)}
                              className="w-full py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              View Full Details
                            </button>
                            <button
                              onClick={() => handleRecalculate(calculation.id)}
                              className="w-full py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                              Recalculate
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg shadow-md border ${borderColor} bg-blue-50 dark:bg-blue-900/30`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium text-blue-700 dark:text-blue-300`}>Total Calculations</p>
            <span className="text-blue-500 text-xl">🧾</span>
          </div>
          <p className={`text-2xl font-bold text-blue-800 dark:text-blue-200`}>{totalCalculations}</p>
        </div>
        <div className={`p-4 rounded-lg shadow-md border ${borderColor} bg-purple-50 dark:bg-purple-900/30`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium text-purple-700 dark:text-purple-300`}>Total Examiners</p>
            <span className="text-purple-500 text-xl">👤</span>
          </div>
          <p className={`text-2xl font-bold text-purple-800 dark:text-purple-200`}>{uniqueExaminers}</p>
        </div>
        <div className={`p-4 rounded-lg shadow-md border ${borderColor} bg-amber-50 dark:bg-amber-900/30`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium text-amber-700 dark:text-amber-300`}>Total Papers</p>
            <span className="text-amber-500 text-xl">🧻</span>
          </div>
          <p className={`text-2xl font-bold text-amber-800 dark:text-amber-200`}>{totalPapers}</p>
        </div>
        <div className={`p-4 rounded-lg shadow-md border ${borderColor} bg-green-50 dark:bg-green-900/30`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium text-green-700 dark:text-green-300`}>Total Paid</p>
            <span className="text-green-500 text-xl">💰</span>
          </div>
          <p className={`text-2xl font-bold text-green-800 dark:text-green-200`}>₹{Number(totalAmount).toFixed(2)}</p>
        </div>
      </div>
    );
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDateRangePicker(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderCalculationTable = (calculations) => {
    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={calculations.length > 0 && selectedCalculations.length === calculations.length}
                  onChange={() => handleSelectAll(calculations)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Examiner
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Department
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Papers
              </th>
              <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Days
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {calculations.map(calculation => (
              <tr 
                key={calculation.id} 
                className={selectedCalculations.includes(calculation.id) 
                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedCalculations.includes(calculation.id)}
                    onChange={() => handleSelectCalculation(calculation.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {calculation.examiner_id || 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {calculation.examiner_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                      {calculation.total_papers || 0} papers
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {calculation.department || 'General'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(calculation.calculation_date || calculation.created_at)}
                </td>
                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {calculation.total_papers || 0}
                </td>
                <td className="hidden lg:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {calculation.total_days || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  ₹{calculation.total_amount?.toFixed(2) || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleDownloadPDF(calculation.id)}
                      className="p-1 rounded-md text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Download PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigate(`/calculations/${calculation.id}`)}
                      className="p-1 rounded-md text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View Details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(calculation.id)}
                      className="p-1 rounded-md text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <HistoryLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="flex flex-col space-y-4">
          {/* Title and Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Calculation Archive
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                View and manage all your salary calculations
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => navigate('/new-calculation')}
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                New Calculation
              </button>
              
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Export Data
                </button>
                
                {showExportDropdown && (
                  <div className="absolute z-10 right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-sm ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <button
                      onClick={handleBulkExport}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      🗃️ Export Selected as PDFs
                    </button>
                    
                    <button
                      onClick={handleMergedReportsExport}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📊 Generate Merged Report
                    </button>
                    
                    <button
                      onClick={handleExportToExcel}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📑 Export to Excel
                    </button>
                    
                    <button
                      onClick={handleCustomReportsSelection}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      📝 Custom Reports...
                    </button>
                  </div>
                )}
              </div>
              
              {selectedCalculations.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Delete Selected ({selectedCalculations.length})
                </button>
              )}
            </div>
          </div>
          
          {/* Filters and Controls Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by examiner, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <span className="absolute right-3 top-2.5 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </span>
              </div>
              
              {/* Date Filter */}
              <div className="relative" ref={datePickerRef}>
                <button
                  onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-left bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      {getDateRangeText()}
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </button>
                
                {showDateRangePicker && (
                  <div className="absolute z-10 left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-sm ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-gray-200">Filter by date range</h3>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => handleDateRangeChange('all')}
                        className={`w-full text-left px-3 py-2 rounded-md mb-1 ${dateRangeOption === 'all' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        All Time
                      </button>
                      
                      <button
                        onClick={() => handleDateRangeChange('today')}
                        className={`w-full text-left px-3 py-2 rounded-md mb-1 ${dateRangeOption === 'today' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        Today
                      </button>
                      
                      <button
                        onClick={() => handleDateRangeChange('week')}
                        className={`w-full text-left px-3 py-2 rounded-md mb-1 ${dateRangeOption === 'week' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        This Week
                      </button>
                      
                      <button
                        onClick={() => handleDateRangeChange('month')}
                        className={`w-full text-left px-3 py-2 rounded-md mb-1 ${dateRangeOption === 'month' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        This Month
                      </button>
                      
                      <button
                        onClick={() => handleDateRangeChange('year')}
                        className={`w-full text-left px-3 py-2 rounded-md mb-1 ${dateRangeOption === 'year' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        This Year
                      </button>
                      
                      <button
                        onClick={() => handleDateRangeChange('custom')}
                        className={`w-full text-left px-3 py-2 rounded-md mb-1 ${dateRangeOption === 'custom' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        Custom Range
                      </button>
                      
                      {dateRangeOption === 'custom' && (
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                              <input
                                type="date"
                                value={dateFilter.from}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                              <input
                                type="date"
                                value={dateFilter.to}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => handleDateRangeChange('apply')}
                            className="w-full py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                          >
                            Apply Custom Range
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="amount_asc">Amount (Low to High)</option>
                  <option value="amount_desc">Amount (High to Low)</option>
                  <option value="papers_asc">Papers (Low to High)</option>
                  <option value="papers_desc">Papers (High to Low)</option>
                  <option value="examiner_asc">Examiner Name (A-Z)</option>
                  <option value="examiner_desc">Examiner Name (Z-A)</option>
                </select>
              </div>
              
              {/* View Mode & Group By */}
              <div className="flex space-x-2">
                <div className="w-1/2">
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="none">No Grouping</option>
                    <option value="examiner">Group by Examiner</option>
                    <option value="department">Group by Department</option>
                    <option value="month">Group by Month</option>
                  </select>
                </div>
                
                <div className="w-1/2 flex justify-end">
                  <div className="flex border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center justify-center w-10 h-10 ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                      title="List View"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`flex items-center justify-center w-10 h-10 ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                      title="Grid View"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className={`mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-600 ${isDarkMode ? 'bg-red-900/20 border-red-800 text-red-400' : ''}`}>
              {error}
            </div>
          )}
          
          {/* Content */}
          {/* Summary Stats */}
          {!loading && !error && filteredCalculations.length > 0 && renderSummaryStats(filteredCalculations)}
          
          {/* Calculations Content */}
          {!loading && !error && filteredCalculations.length > 0 && (
            <div className="space-y-8">
              {Object.entries(groupedCalculations).map(([groupName, groupCalcs]) => (
                <div key={groupName} className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <h2 className={`text-xl font-semibold ${textColor}`}>{groupName}</h2>
                      
                      <div className="mx-4 h-6 border-l border-gray-300 dark:border-gray-600"></div>
                      
                      <button
                        onClick={toggleGroupMode}
                        className={`text-sm flex items-center px-3 py-1.5 border ${borderColor} rounded-md ${groupBy !== 'none' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : `${buttonBg} ${textColor}`}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        {groupBy === 'none' ? 'Group by Examiner' : 'Show All'}
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Favorites Toggle */}
                      <button
                        onClick={() => {/* TODO: Implement favorites filtering */}}
                        className={`flex items-center text-gray-500 hover:text-yellow-500`}
                        title="Show Favorites"
                      >
                        <span className="text-xl">⭐</span>
                      </button>
                      
                      {/* View Toggle */}
                      <div className="flex border rounded-md overflow-hidden">
                        <button
                          className={`px-3 py-1 flex items-center ${viewMode === 'grid' ? 'bg-blue-600 text-white' : `${buttonBg} ${textColor}`}`}
                          onClick={() => setViewMode('grid')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                          </svg>
                        </button>
                        <button
                          className={`px-3 py-1 flex items-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : `${buttonBg} ${textColor}`}`}
                          onClick={() => setViewMode('list')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
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
          
          {/* Empty State */}
          {!loading && !error && calculations.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
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
        </div>
      </div>
    </HistoryLayout>
  );
};

export default CalculationArchive;