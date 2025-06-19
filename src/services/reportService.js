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
    // Get the examiner data
    const { data: examiner, error: examinerError } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', examinerId)
      .single();
      
    if (examinerError) throw examinerError;
    
    // Get all calculations for this examiner
    const { data: calculations, error: calcError } = await supabase
      .from('calculation_documents')
      .select('*')
      .eq('examiner_id', examinerId)
      .order('created_at', { ascending: false });
      
    if (calcError) throw calcError;
    
    // Generate the PDF
    if (options.download) {
      // Download the PDF
      const fileName = options.fileName || `Examiner_History_${examiner.full_name.replace(/\s+/g, '_')}.pdf`;
      await downloadPDF(examiner, calculations, fileName, ReportTypes.HISTORY);
      
      // Save metadata to pdf_documents table
      const timestamp = new Date().toISOString().slice(0, 10);
      await supabase.from('pdf_documents').insert({
        examiner_id: examinerId,
        report_type: 'examiner report',
        calculation_id: null,
        filters: options.filters ? JSON.stringify(options.filters) : null,
        report_name: `${examiner.full_name} - Full History Report (${timestamp})`,
        pdf_url: null, // We don't store the actual PDF URL since it's generated on-demand
        is_favorite: false
      });
      
      return true;
    } else {
      // Open in new tab
      const url = await openPDFInNewTab(examiner, calculations, ReportTypes.HISTORY);
      
      // Save metadata to pdf_documents table
      const timestamp = new Date().toISOString().slice(0, 10);
      await supabase.from('pdf_documents').insert({
        examiner_id: examinerId,
        report_type: 'examiner report',
        calculation_id: null,
        filters: options.filters ? JSON.stringify(options.filters) : null,
        report_name: `${examiner.full_name} - Full History Report (${timestamp})`,
        pdf_url: null, // We don't store the actual PDF URL since it's generated on-demand
        is_favorite: false
      });
      
      return url;
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
    console.log('generateAllExaminersReport called with options:', JSON.stringify({
      download: options.download,
      fileName: options.fileName,
      hasExaminersData: !!options.examinersData,
      examinersDataLength: options.examinersData?.length || 0,
      filterInfo: options.filterInfo
    }, null, 2));
    
    // Use provided examinersData if available, otherwise fetch from Supabase
    let examinersData = options.examinersData;
    
    if (!examinersData || examinersData.length === 0) {
      console.log('No examinersData provided, fetching from Supabase');
      // Get all examiners and their calculations
      const { data: examiners, error: examinersError } = await supabase
        .from('examiners')
        .select('*')
        .limit(options.limit || 100);
        
      if (examinersError) {
        console.error('Error fetching examiners:', examinersError);
        throw examinersError;
      }
      
      // For each examiner, get their calculations
      examinersData = await Promise.all(examiners.map(async (examiner) => {
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
    } else {
      console.log('Using provided examinersData:', examinersData.length, 'examiners');
    }
    
    if (!examinersData || examinersData.length === 0) {
      console.error('No examiners data available after processing');
      throw new Error('No examiners data available to generate report');
    }
    
    // Use a placeholder examiner for the main function call
    const placeholderExaminer = 
      (examinersData[0]?.examiner) || 
      { id: 'all', name: 'All Examiners', full_name: 'All Examiners' };
    
    console.log('Using placeholder examiner:', placeholderExaminer);
    
    // Generate the PDF
    if (options.download) {
      console.log('Downloading PDF with data:', {
        examinersCount: examinersData.length,
        firstExaminerName: examinersData[0]?.examiner?.full_name || 'Unknown',
        calculationsPerExaminer: examinersData.map(e => ({
          examinerName: e.examiner?.full_name || 'Unknown',
          calculationsCount: e.calculations?.length || 0,
          firstCalculationId: e.calculations?.[0]?.id || 'none'
        }))
      });
      // Download the PDF
      const fileName = options.fileName || `All_Examiners_Report_${new Date().getTime()}.pdf`;
      await downloadPDF(
        placeholderExaminer, 
        [], 
        fileName, 
        ReportTypes.ALL_EXAMINERS, 
        { examinersData, filterInfo: options.filterInfo }
      );
      
      // Save metadata to pdf_documents table
      const timestamp = new Date().toISOString().slice(0, 10);
      await supabase.from('pdf_documents').insert({
        examiner_id: null, // No specific examiner for merged reports
        report_type: 'merged report',
        calculation_id: null,
        filters: options.filterInfo ? JSON.stringify(options.filterInfo) : null,
        report_name: `Merged Examiners Report (${timestamp})`,
        pdf_url: null, // We don't store the actual PDF URL since it's generated on-demand
        is_favorite: false
      });
      
      console.log('PDF download initiated');
      return true;
    } else {
      console.log('Opening PDF in new tab...');
      // Open in new tab
      const url = await openPDFInNewTab(
        placeholderExaminer, 
        [], 
        ReportTypes.ALL_EXAMINERS, 
        { examinersData, filterInfo: options.filterInfo }
      );
      
      // Save metadata to pdf_documents table
      const timestamp = new Date().toISOString().slice(0, 10);
      await supabase.from('pdf_documents').insert({
        examiner_id: null, // No specific examiner for merged reports
        report_type: 'merged report',
        calculation_id: null,
        filters: options.filterInfo ? JSON.stringify(options.filterInfo) : null,
        report_name: `Merged Examiners Report (${timestamp})`,
        pdf_url: null, // We don't store the actual PDF URL since it's generated on-demand
        is_favorite: false
      });
      
      return url;
    }
  } catch (error) {
    console.error('Error generating all examiners report:', error);
    throw error;
  }
};