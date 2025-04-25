import { supabase } from '../lib/supabase';
import { downloadPDF, openPDFInNewTab, ReportTypes } from '../components/pdf/PDFRenderer';

/**
 * Generate an individual examiner report for a single calculation
 * @param {string} calculationId - The calculation ID
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The URL of the generated PDF
 */
export const generateIndividualReport = async (calculationId, options = {}) => {
  try {
    // Get the calculation data
    const { data: calculation, error: calcError } = await supabase
      .from('calculation_documents')
      .select('*')
      .eq('id', calculationId)
      .single();
      
    if (calcError) throw calcError;
    
    // Get examiner information
    const { data: examiner, error: examinerError } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', calculation.examiner_id)
      .single();
      
    if (examinerError) throw examinerError;
    
    // Get staff details if not provided
    let staffDetails = options.staffDetails || [];
    if (staffDetails.length === 0) {
      try {
        // Try to get evaluation days connected to this calculation
        const { data: evalDays } = await supabase
          .from('evaluation_days')
          .select('id')
          .eq('calculation_id', calculationId);
          
        if (evalDays?.length > 0) {
          const evalDayIds = evalDays.map(day => day.id);
          
          // Get staff evaluations for these days
          const { data: staffData } = await supabase
            .from('staff_evaluations')
            .select('*')
            .in('evaluation_day_id', evalDayIds);
            
          if (staffData?.length > 0) {
            staffDetails = staffData.map(staff => ({
              name: staff.staff_name,
              papersEvaluated: staff.papers_evaluated
            }));
          }
        }
      } catch (staffError) {
        console.warn('Error getting staff details:', staffError);
      }
    }
    
    // Generate the PDF
    if (options.download) {
      // Download the PDF
      const fileName = options.fileName || `Examiner_Calculation_${examiner.id}_${new Date().getTime()}.pdf`;
      await downloadPDF(examiner, [calculation], fileName, ReportTypes.INDIVIDUAL, { staffDetails });
      return true;
    } else {
      // Open in new tab
      return await openPDFInNewTab(examiner, [calculation], ReportTypes.INDIVIDUAL, { staffDetails });
    }
  } catch (error) {
    console.error('Error generating individual report:', error);
    throw error;
  }
};

/**
 * Generate a full history report for an examiner
 * @param {string} examinerId - The examiner ID
 * @param {object} options - Additional options
 * @returns {Promise<string>} - The URL of the generated PDF
 */
export const generateHistoryReport = async (examinerId, options = {}) => {
  try {
    // Get examiner information
    const { data: examiner, error: examinerError } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', examinerId)
      .single();
      
    if (examinerError) throw examinerError;
    
    // Get all calculations for this examiner
    const { data: calculations, error: calcsError } = await supabase
      .from('calculation_documents')
      .select('*')
      .eq('examiner_id', examinerId)
      .order('created_at', { ascending: false });
      
    if (calcsError) throw calcsError;
    
    // Generate the PDF
    if (options.download) {
      // Download the PDF
      const fileName = options.fileName || `Examiner_History_${examiner.id}_${new Date().getTime()}.pdf`;
      await downloadPDF(examiner, calculations, fileName, ReportTypes.HISTORY);
      return true;
    } else {
      // Open in new tab
      return await openPDFInNewTab(examiner, calculations, ReportTypes.HISTORY);
    }
  } catch (error) {
    console.error('Error generating history report:', error);
    throw error;
  }
};

/**
 * Generate a merged report for all examiners
 * @param {object} options - Options for the report (filterInfo, limit, etc.)
 * @returns {Promise<string>} - The URL of the generated PDF
 */
export const generateAllExaminersReport = async (options = {}) => {
  try {
    // Get all examiners and their calculations
    const { data: examiners, error: examinersError } = await supabase
      .from('examiners')
      .select('*')
      .limit(options.limit || 100);
      
    if (examinersError) throw examinersError;
    
    // For each examiner, get their calculations
    const examinersData = await Promise.all(examiners.map(async (examiner) => {
      const { data: calculations } = await supabase
        .from('calculation_documents')
        .select('*')
        .eq('examiner_id', examiner.id)
        .order('created_at', { ascending: false });
        
      return {
        examiner,
        calculations: calculations || []
      };
    }));
    
    // Use a placeholder examiner for the main function call
    const placeholderExaminer = examiners[0] || { id: 'all', name: 'All Examiners' };
    
    // Generate the PDF
    if (options.download) {
      // Download the PDF
      const fileName = options.fileName || `All_Examiners_Report_${new Date().getTime()}.pdf`;
      await downloadPDF(
        placeholderExaminer, 
        [], 
        fileName, 
        ReportTypes.ALL_EXAMINERS, 
        { examinersData, filterInfo: options.filterInfo }
      );
      return true;
    } else {
      // Open in new tab
      return await openPDFInNewTab(
        placeholderExaminer, 
        [], 
        ReportTypes.ALL_EXAMINERS, 
        { examinersData, filterInfo: options.filterInfo }
      );
    }
  } catch (error) {
    console.error('Error generating all examiners report:', error);
    throw error;
  }
};

/**
 * Generate a custom report based on user-defined criteria
 * @param {object} options - Options for generating the report
 * @returns {Promise<string>} - The URL of the generated PDF
 */
export const generateCustomReport = async (options = {}) => {
  try {
    // Get examiners data from options or fetch it
    let examinersData = options.examinersData;
    
    if (!examinersData) {
      // Apply filters to get the examiners
      let query = supabase.from('examiners').select('*');
      
      // Apply department filter if specified
      if (options.filterInfo?.department) {
        query = query.eq('department', options.filterInfo.department);
      }
      
      // Apply limit
      query = query.limit(options.limit || 100);
      
      // Execute the query
      const { data: examiners, error: examinersError } = await query;
      if (examinersError) throw examinersError;
      
      // For each examiner, get their calculations with date filtering if needed
      examinersData = await Promise.all(examiners.map(async (examiner) => {
        let calcQuery = supabase
          .from('calculation_documents')
          .select('*')
          .eq('examiner_id', examiner.id);
        
        // Apply date range filter if specified
        if (options.filterInfo?.dateFrom) {
          calcQuery = calcQuery.gte('created_at', options.filterInfo.dateFrom);
        }
        if (options.filterInfo?.dateTo) {
          calcQuery = calcQuery.lte('created_at', options.filterInfo.dateTo);
        }
        
        // Order by date
        calcQuery = calcQuery.order('created_at', { ascending: false });
        
        const { data: calculations } = await calcQuery;
        
        return {
          examiner,
          calculations: calculations || []
        };
      }));
    }
    
    // Use a placeholder examiner for the main function call
    const placeholderExaminer = (examinersData[0]?.examiner) || { id: 'custom', name: 'Custom Report' };
    
    // Generate the PDF
    if (options.download) {
      // Download the PDF
      const fileName = options.fileName || `Custom_Report_${new Date().getTime()}.pdf`;
      await downloadPDF(
        placeholderExaminer, 
        [], 
        fileName, 
        ReportTypes.CUSTOM, 
        {
          title: options.title || 'Custom Examiner Report',
          examinersData, 
          reportConfig: options.reportConfig || {},
          filterInfo: options.filterInfo || {}
        }
      );
      return true;
    } else {
      // Open in new tab
      return await openPDFInNewTab(
        placeholderExaminer, 
        [], 
        ReportTypes.CUSTOM, 
        {
          title: options.title || 'Custom Examiner Report',
          examinersData, 
          reportConfig: options.reportConfig || {},
          filterInfo: options.filterInfo || {}
        }
      );
    }
  } catch (error) {
    console.error('Error generating custom report:', error);
    throw error;
  }
};

// Create a named object to export as default
const reportService = {
  generateIndividualReport,
  generateHistoryReport,
  generateAllExaminersReport,
  generateCustomReport,
  ReportTypes
};

export default reportService; 