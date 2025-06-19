// Common utility functions for PDF reports

// Helper function to format currency
export const formatCurrency = (amount) => {
  return `₹${parseFloat(amount || 0).toFixed(0)}`;
};

// Helper function to format Indian currency with commas
export const formatIndianCurrency = (amount) => {
  if (!amount) return '₹ 0';
  const num = parseFloat(amount);
  const result = num.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR',
    currencyDisplay: 'symbol'
  });
  return result;
};

// Helper function to safely format dates
export const formatDate = (dateString, format = 'full') => {
  try {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';
    
    if (format === 'full') {
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else if (format === 'short') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (format === 'monthDay') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (format === 'monthDayYear') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (format === 'withYear') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (format === 'dateOnly') {
      // Format as DD-MM-YYYY
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    } else if (format === 'fullDate') {
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'N/A';
  }
};

// Function to get staff name with fallbacks
export const getStaffName = (staff) => {
  // Try all possible property names
  return staff?.staffName || staff?.name || staff?.staff_name || 
         staff?.full_name || staff?.staff?.name || staff?.staff?.full_name || '—';
};

// Get the paper count from a staff object with different possible property names
export const getPaperCount = (staff) => {
  if (!staff) return 0;
  
  const paperCount = parseInt(
    staff?.papersEvaluated || 
    staff?.papers_evaluated ||
    staff?.papers || 
    staff?.paper_count || 
    staff?.count || 
    '0'
  );
  
  return isNaN(paperCount) ? 0 : paperCount;
};

// Generate custom calculation ID - ECR-YYYY-NNN format
export const getCustomCalcId = (calc, index) => {
  if (calc.custom_id) return calc.custom_id;
  
  const year = calc.created_at 
    ? new Date(calc.created_at).getFullYear() 
    : new Date().getFullYear();
  const paddedIndex = String(index + 1).padStart(3, '0');
  return `ECR-${year}-${paddedIndex}`;
};

/**
 * Extract evaluation days and staff details following the schema structure:
 * calculation_documents → calculation_days → evaluation_days → staff_evaluations
 * 
 * Handles the nested PostgREST format from Supabase
 */
export const extractEvaluationData = (calculation) => {
  const evaluationDays = [];
  const staffDetails = [];
  const evaluationSummary = [];
  
  // Track data for debugging
  const debug = {
    calcId: calculation.id,
    hasCalculationDays: calculation.calculation_days && calculation.calculation_days.length > 0,
    calcDaysCount: calculation.calculation_days ? calculation.calculation_days.length : 0,
    evalDaysFound: 0,
    staffEvaluationsFound: 0
  };
  
  // Log entry point
  console.log(`extractEvaluationData for calculation ${calculation.id}`, debug);
  
  // Check if calculation_days are properly loaded
  if (calculation.calculation_days && Array.isArray(calculation.calculation_days) && calculation.calculation_days.length > 0) {
    // For each calculation day, extract the evaluation_days object
    calculation.calculation_days.forEach(calcDay => {
      // In the updated structure from Supabase, evaluation_days is a direct property
      // not nested inside evaluation_days
      const evalDay = calcDay.evaluation_days;
      
      if (evalDay) {
        // Add to counter
        debug.evalDaysFound++;
        
        // Add to our evaluation days list
        const evalDayData = {
          id: evalDay.id,
          evaluation_date: evalDay.evaluation_date,
          staff_evaluations: evalDay.staff_evaluations || []
        };
        
        evaluationDays.push(evalDayData);
        
        // Now extract staff evaluations
        if (Array.isArray(evalDay.staff_evaluations)) {
          const staffEvals = evalDay.staff_evaluations;
          debug.staffEvaluationsFound += staffEvals.length;
          
          // Log the structure of the first staff evaluation
          if (staffEvals.length > 0) {
            console.log(`Staff evaluation structure for day ${evalDay.id}:`, {
              firstStaff: staffEvals[0],
              hasName: Boolean(staffEvals[0].staff_name),
              hasPapersEvaluated: Boolean(staffEvals[0].papers_evaluated),
              actualPapersValue: staffEvals[0].papers_evaluated
            });
          }
          
          // Process each staff evaluation
          staffEvals.forEach(staff => {
            staffDetails.push({
              evaluationDate: evalDay.evaluation_date,
              staffName: getStaffName(staff),
              papersEvaluated: getPaperCount(staff)
            });
          });
          
          // Add to evaluation summary for the "Section A: Evaluation Summary" table
          evaluationSummary.push({
            date: evalDay.evaluation_date,
            staffCount: staffEvals.length,
            totalPapers: staffEvals.reduce((sum, staff) => sum + getPaperCount(staff), 0)
          });
        }
      }
    });
  }
  
  // FALLBACK: If no evaluation days were found but we have calculation totals,
  // create a synthetic evaluation day using calculation date and create individual staff entries
  if (evaluationDays.length === 0 && calculation.total_staff > 0 && calculation.total_papers > 0) {
    console.log(`Creating synthetic evaluation data for calculation ${calculation.id} (no evaluation days but has totals)`);
    
    const syntheticDate = calculation.created_at;
    const syntheticEvalDay = {
      id: `synthetic-${calculation.id}`,
      evaluation_date: syntheticDate,
      synthetic: true
    };
    
    evaluationDays.push(syntheticEvalDay);
    
    // Distribute papers evenly among staff
    const staffCount = calculation.total_staff || 1;
    const totalPapers = calculation.total_papers || 0;
    const papersPerStaff = Math.floor(totalPapers / staffCount);
    let remainingPapers = totalPapers % staffCount;
    
    // Create individual synthetic staff entries
    for (let i = 0; i < staffCount; i++) {
      // Add one extra paper to earlier staff if there are remaining papers
      const extraPaper = remainingPapers > 0 ? 1 : 0;
      remainingPapers -= extraPaper;
      
      staffDetails.push({
        evaluationDate: syntheticDate,
        staffName: `Staff ${i + 1}`,
        papersEvaluated: papersPerStaff + extraPaper,
        synthetic: true
      });
    }
    
    // Add synthetic summary
    evaluationSummary.push({
      date: syntheticDate,
      staffCount: staffCount,
      totalPapers: totalPapers,
      synthetic: true
    });
    
    debug.syntheticDataCreated = true;
  }
  
  // Log output for debugging
  console.log(`Extraction results for calculation ${calculation.id}:`, {
    evaluationDaysCount: evaluationDays.length,
    staffDetailsCount: staffDetails.length,
    evaluationSummaryCount: evaluationSummary.length,
    debug
  });
  
  return { evaluationDays, staffDetails, evaluationSummary, debug };
};

// Helper function to calculate totals for an examiner's calculations
export const calculateTotals = (calculations) => {
  if (!calculations || !calculations.length) {
    return {
      count: 0,
      evalDays: 0,
      papers: 0,
      staff: 0,
      baseSalary: 0,
      incentive: 0,
      finalAmount: 0
    };
  }
  
  return calculations.reduce((totals, calc) => {
    // Calculate evaluation days similar to MergedReportPDF approach
    const evalDays = calc.total_days || 
      (calc.calculation_days && Array.isArray(calc.calculation_days) ? calc.calculation_days.length : 0) || 
      (calc.evaluationDays && Array.isArray(calc.evaluationDays) ? calc.evaluationDays.length : 0) || 0;
    
    return {
      count: totals.count + 1,
      evalDays: totals.evalDays + evalDays,
      papers: totals.papers + (parseInt(calc.total_papers) || 0),
      staff: totals.staff + (parseInt(calc.total_staff) || 0),
      baseSalary: totals.baseSalary + (parseFloat(calc.base_salary) || 0),
      incentive: totals.incentive + (parseFloat(calc.incentive || calc.incentive_amount) || 0),
      finalAmount: totals.finalAmount + (parseFloat(calc.final_amount || calc.total_amount) || 0)
    };
  }, { count: 0, evalDays: 0, papers: 0, staff: 0, baseSalary: 0, incentive: 0, finalAmount: 0 });
};

// Common page footer component 
export const renderPageFooter = (reportType, pageNumber, totalPages) => {
  return {
    reportType,
    pageNumber,
    totalPages
  };
}; 

// ============ PAGE LAYOUT UTILITIES =============

// Constants for page layout rules
export const PAGE_LAYOUT = {
  MARGINS: {
    TOP: 40,
    BOTTOM: 30,
    LEFT: 40, 
    RIGHT: 40
  },
  HEADER_HEIGHT: 100,
  FOOTER_HEIGHT: 40,
  // A4 dimensions in points (72 dpi)
  PAGE_SIZE: {
    WIDTH: 595.28,
    HEIGHT: 841.89
  }
};

/**
 * Estimate the height of a table based on row count
 * @param {number} rowCount - Number of rows in the table
 * @param {number} rowHeight - Height of each row in points (default: 25)
 * @param {number} headerHeight - Height of the table header in points (default: 40)
 * @param {number} padding - Additional padding in points (default: 10)
 * @returns {number} Estimated height of the table in points
 */
export const estimateTableHeight = (rowCount, rowHeight = 25, headerHeight = 40, padding = 10) => {
  return headerHeight + (rowCount * rowHeight) + padding;
};

/**
 * Check if a content block will fit on the current page
 * @param {number} currentY - Current Y position on the page
 * @param {number} contentHeight - Height of the content block
 * @returns {boolean} True if content fits, false if a page break is needed
 */
export const contentFitsOnPage = (currentY, contentHeight) => {
  // Add an additional buffer of 15 points to use more space
  const availableHeight = PAGE_LAYOUT.PAGE_SIZE.HEIGHT - PAGE_LAYOUT.MARGINS.BOTTOM - PAGE_LAYOUT.FOOTER_HEIGHT + 15;
  return (currentY + contentHeight) <= availableHeight;
};

/**
 * Group staff details by evaluation date for table rendering
 * with pagination considerations
 * @param {Array} staffDetails - Array of staff evaluation details
 * @param {number} maxRowsPerPage - Maximum rows per page (default: 20)
 * @param {boolean} keepDateGroups - Whether to keep date groups together (default: true)
 * @returns {Array} Array of pages with grouped staff details
 */
export const groupStaffDetailsByDateForPagination = (staffDetails, maxRowsPerPage = 20, keepDateGroups = true) => {
  // First group by date
  const staffByDate = {};
  
  staffDetails.forEach(staff => {
    const date = staff.evaluationDate;
    if (!staffByDate[date]) {
      staffByDate[date] = [];
    }
    staffByDate[date].push(staff);
  });
  
  // Sort dates
  const sortedDates = Object.keys(staffByDate).sort((a, b) => new Date(a) - new Date(b));
  
  // Create pages of staff details
  const pages = [];
  let currentPage = [];
  let currentRowCount = 0;
  
  sortedDates.forEach(date => {
    const staffForDate = staffByDate[date];
    const rowsForDate = staffForDate.length;
    
    // If we're keeping date groups together and this group would exceed the page limit
    if (keepDateGroups) {
      // Check if this date group would exceed the page limit and we already have content
      if (currentRowCount > 0 && (currentRowCount + rowsForDate) > maxRowsPerPage) {
        // Start a new page for this date group
        pages.push(currentPage);
        currentPage = [];
        currentRowCount = 0;
      }
      
      // Add all staff for this date to the current page
      staffForDate.forEach(staff => {
        currentPage.push({
          ...staff,
          newDateGroup: currentPage.length === 0 || 
                        currentPage[currentPage.length - 1].evaluationDate !== date
        });
      });
      
      currentRowCount += rowsForDate;
      
      // If current date group made a full page, start a new page
      if (currentRowCount >= maxRowsPerPage) {
        pages.push(currentPage);
        currentPage = [];
        currentRowCount = 0;
      }
    } 
    // If we're not keeping date groups together, split as needed
    else {
      // Process each staff entry individually
      staffForDate.forEach((staff, index) => {
        // If adding this row would exceed the page limit, start a new page
        if (currentRowCount >= maxRowsPerPage) {
          pages.push(currentPage);
          currentPage = [];
          currentRowCount = 0;
        }
        
        // Add this staff to the current page
        currentPage.push({
          ...staff,
          // Mark as new date group if it's the first entry on the page or differs from previous entry
          newDateGroup: currentPage.length === 0 || 
                        currentPage[currentPage.length - 1].evaluationDate !== date ||
                        // Always mark first entry of each date as a new group, even if split across pages
                        (index === 0 && staff.evaluationDate === date)
        });
        
        currentRowCount++;
      });
    }
  });
  
  // Add any remaining staff to the pages array
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  
  return pages;
};

/**
 * Estimate if a section will fit on the current page
 * @param {number} currentY - Current Y position on the page
 * @param {Object} section - Section to check (with rows, headers, etc.)
 * @param {boolean} needsPageBreak - Whether the section needs a page break
 * @returns {boolean} True if section fits, false if page break needed
 */
export const shouldInsertPageBreak = (currentY, content) => {
  // Safe bottom margin to prevent content from overlapping with footer
  const safeBottomMargin = 30;
  const maxY = PAGE_LAYOUT.PAGE_SIZE.HEIGHT - PAGE_LAYOUT.MARGINS.BOTTOM - PAGE_LAYOUT.FOOTER_HEIGHT - safeBottomMargin;
  
  if (!content) return false;
  
  // Different content types have different height estimations
  let estimatedHeight = 0;
  
  if (content.type === 'table') {
    // For tables: header + rows + footer
    const headerHeight = content.hasHeader ? 30 : 0;
    const rowHeight = content.rowHeight || 20;
    const rowCount = content.rows || 0;
    const footerHeight = content.hasFooter ? 30 : 0;
    const padding = content.padding || 10;
    
    estimatedHeight = headerHeight + (rowCount * rowHeight) + footerHeight + padding;
  } 
  else if (content.type === 'dateGroup') {
    // For date groups: all staff for a specific date
    const rowHeight = content.rowHeight || 20;
    const staffCount = content.staffCount || 0;
    const padding = content.padding || 10;
    
    estimatedHeight = (staffCount * rowHeight) + padding;
  }
  else if (content.type === 'section') {
    // For general sections: estimate based on provided height
    estimatedHeight = content.height || 100;
  }
  
  // Check if adding this content would exceed the page height
  return (currentY + estimatedHeight) > maxY;
}; 