import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import calculationService from '../services/calculationService';
import { formatDate } from '../utils/dateUtils';
import { supabase } from '../lib/supabase';
import HistoryLayout from './HistoryLayout';

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
        : filteredCalculations.slice(0, 10).map(calc => calc.id); // Limit to first 10 if none selected
      
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

      // Fetch calculations directly from Supabase instead of using the edge function
      let calculationsData = [];
      try {
        const { data, error } = await supabase
          .from('calculation_documents')
          .select(`
            *,
            examiners:examiner_id (
              id,
              full_name,
              examiner_id,
              department
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
        
        // Fetch calculation_days for these calculations
        for (const calc of calculationsData) {
          try {
            // First get calculation_days that link to this calculation
            const { data: calcDays, error: calcDaysError } = await supabase
              .from('calculation_days')
              .select(`
                id,
                evaluation_day_id
              `)
              .eq('calculation_id', calc.id);
              
            if (calcDaysError) {
              console.warn(`Error getting calculation days for calculation ${calc.id}:`, calcDaysError);
              continue;
            }
            
            calc.evaluationDays = [];
            
            if (calcDays && calcDays.length > 0) {
              // Get evaluation days data
              const evalDayIds = calcDays.map(day => day.evaluation_day_id);
              const { data: evalDays, error: evalDaysError } = await supabase
                .from('evaluation_days')
                .select('*')
                .in('id', evalDayIds);
                
              if (evalDaysError) {
                console.warn(`Error getting evaluation days for calculation ${calc.id}:`, evalDaysError);
                continue;
              }
              
              calc.evaluationDays = evalDays || [];
            }
          } catch (daysError) {
            console.error(`Error processing days for calculation ${calc.id}:`, daysError);
          }
        }
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
          (calc.evaluationDays && calc.evaluationDays.length > 0) ||
          (calc.calculation_days && calc.calculation_days.length > 0);
        
        return hasExaminer && hasPapers;
      });
      
      if (validCalculations.length === 0 && calculationsData.length > 0) {
        console.warn('Found calculations but none had valid examiner and paper data', calculationsData);
        toast.error('Calculations found but they may be missing key data', { id: toastId });
        return;
      }
      
      // Update toast with progress
      toast.loading('Generating PDF from calculation data...', { id: toastId });
      
      // Generate HTML report with the enriched data
      const htmlContent = generateMergedReportHTML(validCalculations);
      
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
        
        // Generate PDF using @react-pdf/renderer
        const generatePDF = async () => {
          try {
            // Update toast
            toast.loading('Creating PDF document...', { id: toastId });
            
            // Use the already defined calculationsToExport from the outer function scope
            if (calculationsToExport && calculationsToExport.length > 0) {
              // Since we can't do proper merging in one PDF with @react-pdf/renderer yet,
              // we'll create individual PDFs for each calculation (up to 5 to avoid too many tabs)
              const processedCalculations = calculationsToExport.slice(0, 5);
              
              for (const calculationId of processedCalculations) {
                await calculationService.generateCalculationPDF(
                  calculationId, 
                  `calculation_${calculationId}.pdf`
                );
              }
              
              // Clean up
              document.body.removeChild(container);
              
              // Update toast
              toast.dismiss(toastId);
              toast.success(`Generated ${processedCalculations.length} PDF reports successfully`);
            } else {
              // Clean up
              document.body.removeChild(container);
              
              toast.error('No calculations selected for export', { id: toastId });
              throw new Error('No calculations selected');
            }
          } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            // Clean up on error
            if (container.parentNode) {
              document.body.removeChild(container);
            }
            throw pdfError;
          }
        };
        
        // Execute PDF generation
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {calculations.map(calculation => (
          <div key={calculation.id} className={`${cardBg} rounded-lg shadow-md border ${borderColor} overflow-hidden`}>
            {/* Card Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className={`${textColor} font-semibold`}>
                  {calculation.examiner_name || "Unknown Examiner"}
                </h3>
                <p className={`${secondaryText} text-sm flex items-center`}>
                  <span className="mr-1">🆔</span> {calculation.examiner_id || "N/A"}
                </p>
              </div>
              <input
                type="checkbox"
                checked={selectedCalculations.includes(calculation.id)}
                onChange={() => handleSelectCalculation(calculation.id)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
            </div>
            
            {/* Card Content */}
            <div className="p-4">
              {calculation.detailsFetchFailed && (
                <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-md">
                  Some details couldn't be loaded. Basic information shown.
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">📅</span> Date & Time
                  </p>
                  <p className={`${textColor} text-sm`}>
                    {formatDate(calculation.calculation_date || calculation.created_at || new Date())}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">📄</span> Total Papers
                  </p>
                  <p className={`${textColor} text-sm font-medium`}>
                    {calculation.total_papers || 0}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">👥</span> Staff
                  </p>
                  <p className={`${textColor} text-sm font-medium`}>
                    {calculation.total_staff || calculation.staff_count || 0}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${secondaryText} flex items-center`}>
                    <span className="mr-1">💰</span> Final Amount
                  </p>
                  <p className={`${textColor} text-sm font-medium`}>
                    ₹{(calculation.total_amount || calculation.final_amount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-row gap-2 mt-4 justify-center">
                <button
                  onClick={() => navigate(`/calculations/view/${calculation.id}`)}
                  className="flex items-center px-3 py-1.5 text-sm rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40"
                >
                  <span className="mr-1">👁️</span> View Details
                </button>
                <button
                  onClick={() => handleDownloadPDF(calculation.id)}
                  className="flex items-center px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      <div className="space-y-4">
        {calculations.map(calculation => (
          <div key={calculation.id} className={`${cardBg} border ${borderColor} rounded-lg shadow-sm p-4`}>
            <div className="flex flex-col md:flex-row justify-between">
              <div className="flex items-center mb-3 md:mb-0">
                <input
                  type="checkbox"
                  checked={selectedCalculations.includes(calculation.id)}
                  onChange={() => handleSelectCalculation(calculation.id)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                />
                <div>
                  <h3 className={`text-lg font-medium ${textColor}`}>
                    {calculation.examiner_name || "Unknown"}
                  </h3>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm ${secondaryText} mr-3`}>
                      ID: {calculation.examiner_id || 'N/A'}
                    </span>
                    <span className={`text-sm ${secondaryText}`}>
                      {formatDate(calculation.calculation_date || calculation.created_at || new Date())}
                    </span>
              </div>
                  </div>
                      </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="flex flex-col items-end">
                  <div className={`text-base font-medium ${textColor}`}>
                    ₹{(calculation.total_amount || calculation.final_amount || 0).toFixed(2)}
                  </div>
                  <div className="flex items-center">
                    <span className={`text-xs ${secondaryText}`}>
                      Papers: {calculation.total_papers || 0} | Staff: {calculation.total_staff || calculation.staff_count || 0}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/calculations/view/${calculation.id}`)}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40"
                  >
                    <span className="mr-1">👁️</span> View Details
                  </button>
                  <button 
                    onClick={() => toggleExpand(calculation.id)}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md bg-gray-50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70"
                      >
                    {expandedItems[calculation.id] ? 'Hide Details' : 'Show Details'}
                      </button>
                      <button
                    onClick={() => handleDownloadPDF(calculation.id)}
                    className="flex items-center px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/40"
                      >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Expanded details */}
            {expandedItems[calculation.id] && (
              <div className={`mt-4 p-4 rounded-md bg-gray-50 dark:bg-gray-800 border ${borderColor}`}>
                <h4 className={`text-sm font-semibold ${textColor} mb-3`}>Calculation Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h5 className={`text-xs font-medium ${secondaryText} mb-1`}>Valuation Details</h5>
                    <ul className={`text-sm ${textColor}`}>
                      <li>Total Days: {calculation.total_days || 0}</li>
                      <li>Total Papers: {calculation.total_papers || 0}</li>
                      <li>Total Staff: {calculation.total_staff || calculation.staff_count || 0}</li>
                      <li>Total Amount: ₹{(calculation.total_amount || calculation.final_amount || 0).toFixed(2)}</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className={`text-xs font-medium ${secondaryText} mb-1`}>Evaluation Days</h5>
                    <ul className={`text-sm ${textColor}`}>
                      {calculation.evaluationDays && calculation.evaluationDays.map((day, i) => (
                        <li key={day.id || i}>
                          {formatDate(day.evaluation_date)} - {day.staff_count || 0} staff, {day.total_papers || 0} papers
                        </li>
                      ))}
                    </ul>
                          </div>
                  
                  <div>
                    <h5 className={`text-xs font-medium ${secondaryText} mb-1`}>Documents</h5>
                    <ul className={`text-sm ${textColor}`}>
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

  return (
    <HistoryLayout>
      {/* Header - with consistent padding */}
      <div className="mb-6 flex justify-between items-center px-6 pt-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculation Archives
          </h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Browse and manage your salary calculations history
          </p>
        </div>
        <div className="flex space-x-2">
          {selectedCalculations.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleBulkExport}
                className={`flex items-center px-3 py-2 rounded-md text-sm ${
                  isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export ({selectedCalculations.length})
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-3 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete ({selectedCalculations.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content section with consistent padding */}
      <div className="px-6 pb-6">
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
        
        {/* Controls - Single Row */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center mb-6 gap-3">
          {/* Search */}
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calculations..."
              className={`w-full h-10 p-2 pl-10 border ${borderColor} rounded-md ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-400 dark:text-gray-500">🔍</span>
            </div>
          </div>
          
          {/* Sort Options */}
          <div className="flex items-center min-w-[180px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`w-full h-10 px-3 py-2 pr-8 border ${borderColor} rounded-md text-sm ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
            >
              <option value="date_desc">⇅ Newest First</option>
              <option value="date_asc">⇅ Oldest First</option>
              <option value="amount_desc">⇅ Amount (High to Low)</option>
              <option value="amount_asc">⇅ Amount (Low to High)</option>
              <option value="papers_desc">⇅ Papers (High to Low)</option>
              <option value="papers_asc">⇅ Papers (Low to High)</option>
              <option value="examiner_asc">⇅ Examiner (A-Z)</option>
              <option value="examiner_desc">⇅ Examiner (Z-A)</option>
            </select>
          </div>
          
          {/* Date Range Picker */}
          <div className="relative min-w-[160px]" ref={datePickerRef}>
            <button
              className={`w-full h-10 px-3 py-2 border ${borderColor} rounded-md text-sm ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} flex items-center`}
              onClick={() => setShowDateRangePicker(!showDateRangePicker)}
            >
              <span className="mr-2 flex-shrink-0">📅</span>
              <span className="truncate max-w-[120px]">{getDateRangeText()}</span>
              {dateFilter.from && dateFilter.to && (
                <span 
                  className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer flex-shrink-0" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateFilter({ from: '', to: '' });
                    setDateRangeOption('all');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
            </button>
            
            {/* Date Range Dropdown */}
            {showDateRangePicker && (
              <div className={`absolute z-30 mt-1 right-0 w-64 ${cardBg} rounded-md shadow-lg border ${borderColor} py-2 px-3`}>
                <div className="space-y-1 mb-2">
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${dateRangeOption === 'all' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                    onClick={() => handleDateRangeChange('all')}
                  >
                    All Time
                  </button>
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${dateRangeOption === 'today' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                    onClick={() => handleDateRangeChange('today')}
                  >
                    Today
                  </button>
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${dateRangeOption === 'week' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                    onClick={() => handleDateRangeChange('week')}
                  >
                    This Week
                  </button>
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${dateRangeOption === 'month' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                    onClick={() => handleDateRangeChange('month')}
                  >
                    This Month
                  </button>
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${dateRangeOption === 'year' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                    onClick={() => handleDateRangeChange('year')}
                  >
                    This Year
                  </button>
                  <button
                    className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${dateRangeOption === 'custom' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' : `${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}`}
                    onClick={() => handleDateRangeChange('custom')}
                  >
                    Custom Range
                  </button>
                </div>
                
                {dateRangeOption === 'custom' && (
                  <div className="space-y-2">
                    <div>
                      <label className={`block text-xs font-medium ${textColor} mb-1`}>From</label>
                      <input
                        type="date"
                        value={dateFilter.from}
                        onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                        className={`w-full h-8 px-2 py-1 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${textColor} mb-1`}>To</label>
                      <input
                        type="date"
                        value={dateFilter.to}
                        onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                        className={`w-full h-8 px-2 py-1 border ${borderColor} rounded-md text-xs ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        className="h-8 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                className={`flex items-center justify-center h-10 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-32 text-sm whitespace-nowrap`}
                onClick={() => setShowExportDropdown(!showExportDropdown)}
              >
                <span className="mr-1">⬇️</span>
                Export Reports
              </button>
              {/* Dropdown menu */}
              {showExportDropdown && (
                <div className="absolute z-30 mt-1 right-0 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <div className="space-y-1">
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center"
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
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center"
                      onClick={() => {
                        handleCustomReportsSelection();
                        setShowExportDropdown(false);
                      }}
                    >
                      <span className="mr-2">🔍</span>
                      <div>
                        <div className="font-medium">Custom Reports</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Select specific examiners or calculations</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Export to Excel */}
            <button
              onClick={handleExportToExcel}
              className={`flex items-center justify-center h-10 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 w-32 text-sm whitespace-nowrap`}
            >
              <span className="mr-1">📊</span>
              Export Sheet
            </button>
          </div>
        </div>
        
        {/* Bulk Actions - Only show when items are selected */}
        {selectedCalculations.length > 0 && (
          <div className={`mb-4 p-3 ${cardBg} rounded-md border ${borderColor} flex justify-between items-center`}>
            <div className={textColor}>
              {selectedCalculations.length} calculation(s) selected
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkExport}
                className="h-10 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Export Selected
              </button>
              <button
                onClick={handleBulkDelete}
                className="h-10 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedCalculations([])}
                className="h-10 px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
        
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
                    
                    <div className="mx-4 h-6 border-l border-gray-300 dark:border-gray-600"></div>
                    
                    <button
                      onClick={toggleGroupMode}
                      className={`text-sm flex items-center px-3 py-1.5 border ${borderColor} rounded-md ${groupBy !== 'none' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : `${buttonBg} ${textColor}`}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
    </HistoryLayout>
  );
};

export default CalculationArchive;