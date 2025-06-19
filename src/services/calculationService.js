import axios from 'axios';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateUtils';
import { saveAs } from 'file-saver';

/**
 * Get examiner details
 * @param {string} examinerId Examiner ID
 * @returns {Promise} Promise object with examiner data
 */
export const getExaminerDetails = async (examinerId) => {
  try {
    const response = await axios.get(`/api/examiners/${examinerId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Save a calculation to the database
 * @param {Object} calculationData The calculation data to save
 * @returns {Promise} Promise object with saved calculation data
 */
export const saveCalculation = async (calculationData) => {
  try {
    console.log('Saving calculation with data:', {
      examinerId: calculationData.examinerId,
      name: calculationData.name,
      dailyRate: calculationData.dailyRate,
      paperRate: calculationData.paperRate,
      totalDays: calculationData.evaluationDays?.length,
      totalPapers: calculationData.totalPapers,
      baseSalary: calculationData.baseSalary,
      incentiveAmount: calculationData.incentiveAmount,
      totalSalary: calculationData.totalSalary
    });
    
    // Ensure we have valid numbers (parse strings, handle nulls)
    const saveData = {
      examiner_id: calculationData.examinerId,
      calculation_name: calculationData.name || `Calculation ${formatDate(new Date())}`,
      daily_rate: parseFloat(calculationData.dailyRate) || 0,
      paper_rate: parseFloat(calculationData.paperRate) || 0,
      total_days: calculationData.evaluationDays ? calculationData.evaluationDays.length : 0,
      total_papers: parseInt(calculationData.totalPapers) || 0,
      base_salary: parseFloat(calculationData.baseSalary) || 0,
      incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
      total_amount: parseFloat(calculationData.totalSalary) || 0,
      notes: calculationData.notes || '',
      status: 'completed'
    };
    
    console.log('Formatted data for insert:', saveData);
    
    // Create the salary calculation record
    const { data: calculation, error: calculationError } = await supabase
      .from('calculation_documents')
      .insert(saveData)
      .select()
      .single();

    if (calculationError) {
      console.error('Error inserting calculation:', calculationError);
      throw calculationError;
    }

    console.log('Successfully saved calculation:', calculation);

    // Link evaluation days to the calculation
    if (calculationData.evaluationDays && calculationData.evaluationDays.length > 0) {
      const calculationDaysData = calculationData.evaluationDays
        .filter(day => day.id) // Only include days with IDs
        .map(day => ({
          calculation_id: calculation.id,
          evaluation_day_id: day.id
        }));

      if (calculationDaysData.length > 0) {
        const { error: linkError } = await supabase
          .from('calculation_days')
          .insert(calculationDaysData);

        if (linkError) throw linkError;
      }
    }

    // Also save calculation information to calculation_documents for reference
    try {
      // First, check table schema 
      const { data: schemaCheck, error: schemaError } = await supabase
        .from('calculation_documents')
        .select('*')
        .limit(1);
        
      if (schemaError) {
        console.error('Error checking calculation_documents schema:', schemaError);
        // Continue even if we can't check schema
      } else {
        // Get the actual columns
        const actualColumns = schemaCheck && schemaCheck.length > 0 ? Object.keys(schemaCheck[0]) : [];
        console.log('Actual columns in calculation_documents:', actualColumns);
        
        // Create insert data with only columns that exist
        const insertData = {};
        
        if (actualColumns.includes('file_name')) {
          insertData.file_name = `calculation_${calculation.id}_${new Date().getTime()}.json`;
        }
        
        if (actualColumns.includes('file_path')) {
          insertData.file_path = `/calculations/${calculationData.examinerId}/${calculation.id}`;
        }
        
        if (actualColumns.includes('salary_calculation_id')) {
          insertData.salary_calculation_id = calculation.id;
        } else if (actualColumns.includes('calculation_id')) {
          insertData.calculation_id = calculation.id;
        }
        
        if (actualColumns.includes('examiner_id')) {
          insertData.examiner_id = calculationData.examinerId;
        }
        
        if (actualColumns.includes('metadata')) {
          insertData.metadata = JSON.stringify({
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0,
            calculation_date: new Date().toISOString()
          });
        }
        
        // Only insert if we have columns to insert
        if (Object.keys(insertData).length > 0) {
          console.log('Inserting into calculation_documents with data:', insertData);
          
          const { data: docData, error: docError } = await supabase
            .from('calculation_documents')
            .insert(insertData)
            .select();
  
          if (docError) {
            console.error('Warning: Could not save to calculation_documents:', docError);
          } else {
            console.log('Successfully saved document reference:', docData);
          }
        } else {
          console.warn('No valid columns to insert into calculation_documents');
        }
      }
    } catch (docError) {
      console.error('Error saving document reference:', docError);
      // Continue even if document reference fails
    }

    return calculation;
  } catch (error) {
    console.error('Error saving calculation:', error);
    throw error;
  }
};

/**
 * Get all calculations
 * @returns {Promise} Promise object with calculations data
 */
export const getAllCalculations = async () => {
  try {
    // Join with examiners table to get examiner name and details
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
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Process the data to flatten the examiner properties
    const processedData = data?.map(calc => ({
      ...calc,
      examiner_name: calc.examiners?.full_name || 'Unknown Examiner',
      examiner_id: calc.examiners?.examiner_id || calc.examiner_id || 'N/A',
      department: calc.examiners?.department || 'N/A',
    })) || [];
    
    return processedData;
  } catch (error) {
    console.error('Error fetching calculations:', error);
    throw error;
  }
};

/**
 * Get a calculation by ID with all linked data
 * @param {string} calculationId The calculation ID
 * @returns {Promise} Promise object with calculation data
 */
export const getCalculationById = async (calculationId) => {
  try {
    // Get the calculation with examiner info
    const { data: calculation, error: calculationError } = await supabase
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
      .eq('id', calculationId)
      .single();

    if (calculationError) throw calculationError;
    
    // Process the examiner properties
    const processedCalculation = {
      ...calculation,
      examiner_name: calculation.examiners?.full_name || 'Unknown Examiner',
      examiner_id: calculation.examiners?.examiner_id || calculation.examiner_id || 'N/A',
      department: calculation.examiners?.department || 'N/A',
    };

    // Get linked evaluation days
    const { data: calculationDays, error: daysError } = await supabase
      .from('calculation_days')
      .select(`
        evaluation_day_id
      `)
      .eq('calculation_id', calculationId);

    if (daysError) throw daysError;

    // Get details for each evaluation day
    const evaluationDayIds = calculationDays.map(day => day.evaluation_day_id);
    
    let evaluationDays = [];
    if (evaluationDayIds.length > 0) {
      // Get basic evaluation day info
      const { data: days, error: evaluationDaysError } = await supabase
        .from('evaluation_days')
        .select('id, evaluation_date')
        .in('id', evaluationDayIds);

      if (evaluationDaysError) throw evaluationDaysError;
      
      // Enhance with staff evaluations data
      evaluationDays = await Promise.all(days.map(async day => {
        const { data: staffEvaluations, error: staffError } = await supabase
          .from('staff_evaluations')
          .select('*')
          .eq('evaluation_day_id', day.id);
          
        if (staffError) throw staffError;
        
        // Convert papers_evaluated to numbers to ensure proper calculation
        const staffWithNumericPapers = staffEvaluations?.map(staff => ({
          ...staff,
          papers_evaluated: parseInt(staff.papers_evaluated || 0, 10)
        })) || [];
        
        // Calculate total papers, ensuring numeric values
        const totalPapers = staffWithNumericPapers.reduce(
          (sum, staff) => sum + (staff.papers_evaluated || 0), 
          0
        );
        
        return {
          ...day,
          staff_count: staffWithNumericPapers.length || 0,
          total_papers: totalPapers,
          staff: staffWithNumericPapers.map(staff => ({
            id: staff.id,
            staff_name: staff.staff_name,
            papers_evaluated: staff.papers_evaluated,
          })) || []
        };
      }));
    }

    // Get document history - using proper relationship
    // The main document is already fetched above as 'calculation'
    // If we need related documents, we should handle that differently
    // For now, just include the main document in the documents array
    const documents = processedCalculation ? [processedCalculation] : [];

    // Calculate and update the total papers count for the calculation
    const totalPapers = evaluationDays.reduce(
      (sum, day) => sum + (day.total_papers || 0), 
      0
    );

    // Calculate total days from evaluation days array if current value is 0
    const totalDays = processedCalculation.total_days || evaluationDays.length || 0;

    return {
      ...processedCalculation,
      evaluationDays,
      total_papers: totalPapers > 0 ? totalPapers : processedCalculation.total_papers, // Use calculated total if available
      total_days: totalDays, // Use calculated total days
      documents: documents || []
    };
  } catch (error) {
    console.error('Error fetching calculation details:', error);
    throw error;
  }
};

/**
 * Update a calculation
 * @param {string} calculationId The calculation ID
 * @param {Object} updates The updates to apply
 * @returns {Promise} Promise object with updated calculation
 */
export const updateCalculation = async (calculationId, updates) => {
  try {
    const { data, error } = await supabase
      .from('calculation_documents')
      .update(updates)
      .eq('id', calculationId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating calculation:', error);
    throw error;
  }
};

/**
 * Generate a PDF for a calculation
 * @param {string} calculationId The calculation ID
 * @param {string} fileName The file name to save
 * @param {string} reportType The type of report to generate (default: 'individual')
 * @param {object} options Additional options for the report
 * @returns {Promise} Promise object with document data
 */
export const generateCalculationPDF = async (calculationId, fileName, reportType = 'individual', options = {}) => {
  try {
    // Get the calculation data to include in the document metadata
    const { data: calcData, error: calcError } = await supabase
      .from('calculation_documents')
      .select('*')
      .eq('id', calculationId)
      .single();
      
    if (calcError) {
      console.error('Failed to fetch calculation data:', calcError);
      throw new Error('Failed to fetch calculation data: ' + calcError.message);
    }
    
    if (!calcData) {
      throw new Error('Calculation data not found for ID: ' + calculationId);
    }
    
    console.log('Creating PDF document for calculation:', calculationId, 'with data:', calcData);
    
    // Get examiner information
    const { data: examiner, error: examinerError } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', calcData.examiner_id)
      .single();
      
    if (examinerError) {
      console.warn('Error getting examiner details:', examinerError);
    }
    
    let calculations = [];
    let staffDetails = [];
    let examinersData = [];
    
    // Based on report type, fetch the necessary data
    if (reportType === 'individual') {
      // For individual report, we only need this calculation and its staff details
      calculations = [calcData];
      
      // Get staff details if available in options or fetch them
      if (options.staffDetails) {
        staffDetails = options.staffDetails;
      } else {
        // First get calculation_days that link to this calculation
        try {
          const { data: calcDays, error: calcDaysError } = await supabase
            .from('calculation_days')
            .select(`
              id,
              evaluation_day_id
            `)
            .eq('calculation_id', calculationId);
            
          if (calcDaysError) {
            console.warn('Error getting calculation days:', calcDaysError);
          } else if (calcDays?.length > 0) {
            const evalDayIds = calcDays.map(day => day.evaluation_day_id);
            
            // First, get the evaluation days to retrieve dates
            const { data: evalDays, error: evalDaysError } = await supabase
              .from('evaluation_days')
              .select('id, evaluation_date')
              .in('id', evalDayIds);
              
            if (evalDaysError) {
              console.warn('Error getting evaluation days:', evalDaysError);
            } else {
              // Create a map of evaluation day ID to date for quick lookup
              const evalDayDateMap = {};
              evalDays.forEach(day => {
                evalDayDateMap[day.id] = day.evaluation_date;
              });
            
            // Get staff evaluations for these evaluation days
            const { data: staffData, error: staffError } = await supabase
              .from('staff_evaluations')
              .select('*')
              .in('evaluation_day_id', evalDayIds);
              
            if (staffError) {
              console.warn('Error getting staff evaluations:', staffError);
            } else if (staffData?.length > 0) {
                // Map evaluation dates to staff records using the lookup map
              staffDetails = staffData.map(staff => ({
                  evaluationDate: evalDayDateMap[staff.evaluation_day_id] || null,
                  evaluation_day_id: staff.evaluation_day_id,
                  staffName: staff.staff_name,
                  papersEvaluated: staff.papers_evaluated || 0
              }));
                
                console.log(`Fetched ${staffDetails.length} staff evaluations across ${evalDays.length} evaluation days`);
              }
            }
          }
        } catch (staffError) {
          console.warn('Error getting staff details:', staffError);
        }
      }
      
    } else if (reportType === 'history') {
      // For history report, we need all calculations for this examiner
      const { data: examinerCalcs, error: calcsError } = await supabase
        .from('calculation_documents')
        .select('*')
        .eq('examiner_id', calcData.examiner_id)
        .order('created_at', { ascending: false });
        
      if (calcsError) {
        console.warn('Error getting examiner calculations:', calcsError);
        calculations = [calcData]; // Fallback to just this calculation
      } else {
        calculations = examinerCalcs;
      }
      
    } else if (reportType === 'all-examiners' || reportType === 'custom') {
      // For all-examiners or custom report, we need data for multiple examiners
      // Use provided examinersData if available, otherwise fetch all examiners
      if (options.examinersData) {
        examinersData = options.examinersData;
      } else {
        // Get all examiners and their calculations
        const { data: allExaminers, error: allExaminersError } = await supabase
          .from('examiners')
          .select('*')
          .limit(options.limit || 100);
          
        if (allExaminersError) {
          console.warn('Error getting all examiners:', allExaminersError);
        } else if (allExaminers?.length > 0) {
          // For each examiner, get their calculations
          examinersData = await Promise.all(allExaminers.map(async (examiner) => {
            const { data: examinerCalcs, error: examinerCalcsError } = await supabase
              .from('calculation_documents')
              .select('*')
              .eq('examiner_id', examiner.id)
              .order('created_at', { ascending: false });
              
            return {
              examiner,
              calculations: examinerCalcsError ? [] : examinerCalcs || []
            };
          }));
        }
      }
    }
    
    // Prepare options for the PDF generation
    const pdfOptions = {
      ...options,
      staffDetails,
      examinersData
    };
    
    // Generate the PDF blob directly with the appropriate report type
    console.log('Generating PDF blob with data', {
      examinerPresent: !!examiner,
      calculationsCount: calculations?.length || 0,
      reportType,
      staffDetailsCount: staffDetails?.length || 0
    });
    
    // Make sure we have valid data before generating
    if (!examiner && reportType === 'individual') {
      console.warn('Warning: Generating individual report without examiner data');
    }
    
    if (!calculations || calculations.length === 0) {
      console.warn('Warning: No calculations data for PDF generation');
    }
    
    // Import the PDFRenderer dynamically to avoid circular dependencies
    const PDFRenderer = await import('../components/pdf/PDFRenderer');
    
    if (!PDFRenderer || !PDFRenderer.generatePDFBlob) {
      console.error('Failed to import PDFRenderer or generatePDFBlob function');
      throw new Error('PDF generation failed: Could not import PDF generator');
    }
    
    console.log('Successfully imported PDFRenderer:', !!PDFRenderer);
    
    try {
      // Generate the PDF blob using the imported function
      const pdfBlob = await PDFRenderer.generatePDFBlob(
        examiner || { id: calcData.examiner_id, name: 'Unknown', department: 'Unknown' },
        calculations || [calcData],
        reportType,
        pdfOptions
      );
      
      if (!pdfBlob) {
        console.error('PDF generation failed: No blob returned from generatePDFBlob');
        throw new Error('PDF generation failed: No blob returned');
      }
      
      console.log('Successfully generated PDF blob of size:', pdfBlob.size, 'bytes');
      
      // Map the report type from internal type to schema type
      let schemaReportType = 'individual report'; // default
      if (reportType === 'individual') {
        schemaReportType = 'individual report';
      } else if (reportType === 'history') {
        schemaReportType = 'examiner report';
      } else if (reportType === 'all-examiners') {
        schemaReportType = 'merged report';
      } else if (reportType === 'custom') {
        schemaReportType = 'custom report';
      }
      
      // Create a proper report name based on type and date
      const timestamp = new Date().toISOString().slice(0, 10);
      const examinerName = examiner ? examiner.full_name || examiner.name : 'Unknown';
      
      // Create a filename-friendly version of the report name (no spaces or special chars)
      const reportName = (() => {
        switch (schemaReportType) {
          case 'individual report':
            return `${examinerName} - Individual Report (${timestamp})`;
          case 'examiner report':
            return `${examinerName} - Full History Report (${timestamp})`;
          case 'merged report':
            return `Merged Examiners Report (${timestamp})`;
          case 'custom report':
            return `Custom Report (${timestamp})`;
          default:
            return `Report ${timestamp}`;
        }
      })();
      
      // Create a proper filename for downloads
      const safeFilename = fileName || reportName.replace(/[^a-zA-Z0-9-_() ]/g, '');
      const downloadFilename = safeFilename.endsWith('.pdf') ? safeFilename : `${safeFilename}.pdf`;
      
      // Store reference to the PDF in the pdf_documents table
      const pdfDocumentData = {
        examiner_id: examiner?.id || calcData.examiner_id,
        report_type: schemaReportType,
        calculation_id: reportType === 'individual' ? calculationId : null,
        filters: options.filters ? JSON.stringify(options.filters) : null,
        report_name: reportName,
        is_favorite: false
      };
      
      console.log('Saving PDF document metadata to pdf_documents table:', pdfDocumentData);
      
      // Save metadata to database
      let savedPdfDoc = null;
      try {
        const { data: pdfDocData, error: pdfDocError } = await supabase
          .from('pdf_documents')
          .insert(pdfDocumentData)
          .select()
          .single();
        
        if (pdfDocError) {
          console.error('Error saving to pdf_documents:', pdfDocError);
          // Continue even if metadata save fails
        } else {
          console.log('Successfully saved to pdf_documents:', pdfDocData);
          savedPdfDoc = pdfDocData;
        }
      } catch (metadataError) {
        console.error('Error saving PDF metadata:', metadataError);
        // Continue even if metadata save fails
      }
      
      // Return all necessary data including the blob itself for direct use
      return { 
        ...savedPdfDoc,
        blob: pdfBlob,
        download_filename: downloadFilename
      };
    } catch (pdfError) {
      console.error('Error in PDF generation process:', pdfError);
      throw new Error('Failed to generate PDF: ' + (pdfError.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate and download a PDF for a calculation - simplified direct approach
 * @param {Object} params Calculation parameters
 * @returns {Promise} Promise object with download result
 */
export const downloadCalculationPDF = async (params) => {
  try {
    console.log('Starting PDF download with params:', params);
    
    // If we have a pdfDocumentId, we need to regenerate the PDF from the calculation data
    // since we're not storing PDFs or blob URLs in the database
    let calculationId = params.calculationId;
    let reportType = params.reportType || 'individual';
    
    if (params.pdfDocumentId) {
      // Get the PDF document metadata to determine what to regenerate
      const { data: pdfDoc, error: pdfDocError } = await supabase
        .from('pdf_documents')
        .select('calculation_id, report_type, report_name')
        .eq('id', params.pdfDocumentId)
        .single();
        
      if (pdfDocError) {
        console.error('Error retrieving PDF document metadata:', pdfDocError);
        throw new Error('Could not find PDF document metadata');
      }
      
      // Use the calculation_id and report_type from the document
      calculationId = pdfDoc.calculation_id || params.calculationId;
      reportType = pdfDoc.report_type?.split(' ')[0] || reportType; // Convert 'individual report' to 'individual'
      
      if (!calculationId) {
        throw new Error('No calculation ID found for PDF document');
      }
    }
    
    // Generate the PDF
    console.log(`Generating ${reportType} PDF for calculation ${calculationId}`);
    const pdfDocument = await generateCalculationPDF(
      calculationId,
      params.fileName,
      reportType,
      params.options || {}
    );
    
    if (!pdfDocument) {
      console.error('PDF generation failed: No document returned');
      throw new Error('PDF generation failed - no document returned');
    }
    
    if (!pdfDocument.blob) {
      console.error('PDF generation failed: No blob in document', pdfDocument);
      throw new Error('PDF generation failed - no blob produced');
    }
    
    console.log('PDF generation successful, blob size:', pdfDocument.blob.size, 'bytes');
    
    // Prepare filename
    let filename = pdfDocument.download_filename || 
                  params.fileName || 
                  `ExaminerPro_Report_${new Date().getTime()}.pdf`;
    
    // Ensure it has .pdf extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }
    
    // Ensure the filename is valid
    filename = filename.replace(/[/\\?%*:|"<>]/g, '-');
    
    console.log(`PDF blob ready for download: ${pdfDocument.blob.size} bytes, filename: ${filename}`);
    
    // Create a download URL from the blob
    const downloadUrl = URL.createObjectURL(pdfDocument.blob);
    
    // Handle preview in a new tab if requested
    if (params.openPreview) {
      console.log('Opening PDF preview in new tab');
      window.open(downloadUrl, '_blank');
    }
    
    // DIRECT DOWNLOAD APPROACH: Create and click an anchor element
    try {
      console.log('Initiating direct download via DOM approach');
      
      // Create the anchor element for download
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = filename; // This is the key attribute that forces download
      downloadLink.type = 'application/pdf';
      downloadLink.style.display = 'none';
      
      // Add to document, trigger click, and remove
      document.body.appendChild(downloadLink);
      console.log('Triggering download click...');
      downloadLink.click();
      
      // Remove the download link after a short delay
      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
        console.log('Download link removed');
      }, 100);
      
      // Clean up the download URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        console.log('Download URL revoked');
      }, 2000);
      
      console.log('PDF download process completed successfully');
      return true;
    } catch (downloadError) {
      console.error('Download approach failed:', downloadError);
      
      // Fallback to file-saver
      console.log('Falling back to file-saver library');
      try {
        saveAs(pdfDocument.blob, filename);
        return true;
      } catch (saveAsError) {
        console.error('file-saver also failed:', saveAsError);
        throw new Error('All download methods failed - cannot download PDF');
      }
    }
  } catch (error) {
    console.error('PDF download process failed:', error);
    throw error;
  }
};

/**
 * Download a calculation document
 * @param {string} documentPath Path to the document
 * @returns {Promise} Promise object with download result
 */
export const downloadCalculationDocument = async (documentPath) => {
  try {
    // In a real app, this would download from storage
    const { data, error } = await supabase.storage.from('documents').download(documentPath);
    
    if (error) throw error;
    
    // Create a download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = documentPath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

/**
 * Get all calculations for an examiner
 * @param {string} examinerId The examiner ID
 * @returns {Promise} Promise object with calculations data
 */
export const getCalculationsByExaminer = async (examinerId) => {
  try {
    console.log('Fetching calculations for examiner:', examinerId);
    
    // First, check if the examiner exists
    const { data: examinerCheck, error: examinerError } = await supabase
      .from('examiners')
      .select('id')
      .eq('id', examinerId)
      .single();
      
    if (examinerError) {
      console.warn('Error checking examiner:', examinerError);
    } else {
      console.log('Examiner check result:', examinerCheck);
    }

    // FIXED: Remove pdf_url from selected columns to avoid 400 error
    let { data, error } = await supabase
      .from('calculation_documents')
      .select(`
        id,
        examiner_id,
        created_at,
        total_papers,
        total_staff,
        base_salary,
        incentive,
        final_amount
      `)
      .eq('examiner_id', examinerId);
      
    if (error) {
      console.error('Error in query:', error);
      throw error;
    }
    
    // Sort the data in memory instead of relying on Supabase's order parameter
    if (data && data.length > 0) {
      // Sort by created_at in descending order (newest first)
      data.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      console.log('Calculations found:', data.length);
      console.log('Sample calculation after sorting:', data[0]);
      
      // Process data to standardize field names for backward compatibility with the UI
      for (const calc of data) {
        // Map the correct column names to what the UI expects
        calc.incentive_amount = calc.incentive;
        calc.total_amount = calc.final_amount;
        
        // Generate a calculation_name if it doesn't exist
        if (!calc.calculation_name) {
            calc.calculation_name = `Calculation ${formatDate(calc.created_at)}`;
          }
        }
        
      // Now fetch PDF URLs from pdf_documents table for each calculation
      try {
        // Get all PDFs related to these calculations
        const calculationIds = data.map(calc => calc.id);
        const { data: pdfDocs, error: pdfError } = await supabase
          .from('pdf_documents')
          .select('id, calculation_id, pdf_url')
          .in('calculation_id', calculationIds)
          .eq('report_type', 'individual report');
          
        if (pdfError) {
          console.warn('Error fetching PDF documents:', pdfError);
        } else if (pdfDocs && pdfDocs.length > 0) {
          console.log(`Found ${pdfDocs.length} related PDF documents`);
          
          // Create a map of calculation_id to pdf_url for faster lookup
          const pdfMap = {};
          pdfDocs.forEach(pdf => {
            if (pdf.calculation_id) {
              pdfMap[pdf.calculation_id] = pdf.pdf_url;
            }
          });
          
          // Add pdf_url to each calculation if available
          data.forEach(calc => {
            calc.pdf_url = pdfMap[calc.id] || null;
            if (calc.pdf_url) {
          console.log(`Found PDF URL for calculation ${calc.id}: ${calc.pdf_url}`);
              // Update calculation_name to indicate it has a PDF if not already set
              if (!calc.calculation_name || calc.calculation_name.startsWith('Calculation ')) {
                calc.calculation_name = `PDF Report ${formatDate(calc.created_at)}`;
              }
            }
          });
        } else {
          console.log('No related PDF documents found');
          // Set pdf_url to null for all calculations
          data.forEach(calc => {
            calc.pdf_url = null;
          });
        }
      } catch (pdfFetchError) {
        console.error('Error fetching related PDFs:', pdfFetchError);
        // Continue without PDF URLs
        data.forEach(calc => {
          calc.pdf_url = null;
        });
      }
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching calculations:', error);
    throw error;
  }
};

/**
 * Delete a calculation and all related data
 * @param {string} calculationId The calculation ID
 * @returns {Promise} Promise object with delete confirmation
 */
export const deleteCalculation = async (calculationId) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { data, error } = await supabase
      .from('calculation_documents')
      .delete()
      .eq('id', calculationId);

    if (error) {
      console.error('Error deleting calculation:', error);
      throw error;
    }

    console.log('Calculation deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteCalculation:', error);
    throw error;
  }
};

/**
 * Fallback local calculation function when edge function is not available
 * @param {Object} calculationData The data required for calculation
 * @returns {Object} Calculation results
 */
export const calculateSalaryLocally = async (calculationData) => {
  try {
    console.log('Performing local calculation as fallback with data:', calculationData);
    
    // Constants for calculation (similar to edge function)
    const RATE = 20; // Same rate as in the edge function
    
    // Calculate total papers and staff from all evaluation days
    let totalPapers = 0;
    let totalStaff = 0;
    let baseSalary = 0;
    
    // Check if we have valid evaluation days
    if (Array.isArray(calculationData.evaluation_days) && calculationData.evaluation_days.length > 0) {
      // Loop through all evaluation days
      for (const day of calculationData.evaluation_days) {
        // If the day has staff entries, use them for calculation
        if (Array.isArray(day.staff) && day.staff.length > 0) {
          const staffCount = day.staff.length;
          const dayPapers = day.staff.reduce(
            (sum, staff) => sum + (parseInt(staff.papers) || 0), 
            0
          );
          
          totalPapers += dayPapers;
          // Calculate staff contribution directly
          baseSalary += day.staff.reduce(
            (sum, staff) => sum + ((parseInt(staff.papers) || 0) * RATE), 
            0
          );
          totalStaff += staffCount;
        }
      }
    }
    
    // Calculate incentive (10% of total papers * rate)
    const incentive = totalPapers * RATE * 0.1;
    
    // Calculate total salary (final_amount in the schema)
    const finalAmount = baseSalary + incentive;
    
    console.log('Local calculation result:', {
      totalPapers,
      totalStaff,
      baseSalary,
      incentive,
      finalAmount
    });
    
    // Insert result into calculation_documents and get the id
    let calculationId = null;
    try {
      console.log('Saving local calculation to database');
      
      if (calculationData.examiner_id) {
        const { data: savedData, error: saveError } = await supabase
          .from('calculation_documents')
          .insert({
            examiner_id: calculationData.examiner_id,
            total_papers: totalPapers,
            total_staff: totalStaff,
            base_salary: baseSalary,
            incentive: incentive,
            final_amount: finalAmount
          })
          .select();
          
        if (saveError) {
          console.error('Error saving local calculation to database:', saveError);
        } else if (savedData && savedData.length > 0) {
          calculationId = savedData[0].id;
          console.log('Successfully saved local calculation to database with ID:', calculationId);
        }
      }
    } catch (dbError) {
      console.error('Database error in local calculation:', dbError);
    }
    
    // Convert all values to numbers to ensure proper parsing
    // Use the frontend field names in the return object
    return {
      baseSalary: Number(baseSalary),
      incentiveAmount: Number(incentive),
      totalSalary: Number(finalAmount),
      totalPapers: Number(totalPapers),
      totalStaff: Number(totalStaff),
      calculatedLocally: true,
      status: 'local',
      calculation_id: calculationId
    };
  } catch (error) {
    console.error('Error in local calculation:', error);
    
    // Return default values in case of error
    return {
      baseSalary: 0,
      incentiveAmount: 0,
      totalSalary: 0,
      totalPapers: 0,
      totalStaff: 0,
      calculatedLocally: true,
      status: 'error',
      calculation_id: null
    };
  }
};

/**
 * Calculate salary using Supabase edge function
 * @param {Object} calculationData The data required for calculation
 * @returns {Promise} Promise object with calculation results
 */
export const calculateSalaryWithEdgeFunction = async (calculationData) => {
  try {
    console.log('Calling Supabase Edge Function for salary calculation');
    
    // Validate the evaluation_days to ensure they all have evaluation_day_id
    if (!calculationData.evaluation_days || !Array.isArray(calculationData.evaluation_days)) {
      throw new Error('evaluation_days must be a valid array');
    }
    
    const invalidDays = calculationData.evaluation_days.filter(day => !day.evaluation_day_id);
    if (invalidDays.length > 0) {
      console.error('Found evaluation days without IDs:', invalidDays);
      throw new Error(`${invalidDays.length} evaluation days are missing evaluation_day_id`);
    }

    // Check if we're updating an existing calculation
    const isUpdate = !!calculationData.calculation_id;
    console.log(`${isUpdate ? 'Updating existing' : 'Creating new'} calculation ${isUpdate ? calculationData.calculation_id : ''}`);
    
    // The payload is now already in the correct format, no need to transform it
    console.log('Edge function payload:', JSON.stringify(calculationData));
    
    // Call the edge function directly with the new endpoint URL
    const response = await fetch('https://zampawknbmlrnhsaacqm.supabase.co/functions/v1/calculate-salary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify(calculationData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Edge function error: ${response.status} - ${errorText}`);
      throw new Error(`Edge function failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Raw edge function response:', data);
    
    if (!data) {
      throw new Error('Edge function returned empty response');
    }
    
    // Debug log each field to see what we're getting
    console.log('Edge function fields:', {
      base_salary: data.base_salary,
      incentive: data.incentive,
      final_amount: data.final_amount,
      total_papers: data.total_papers,
      total_staff: data.total_staff,
      id: data.id,
      calculation_id: data.calculation_id,
      pdf_id: data.pdf_id // New field returned from updated edge function
    });
    
    // Calculate total staff from evaluation days if not provided by edge function
    const totalStaff = data.total_staff || calculationData.evaluation_days.reduce(
      (sum, day) => sum + (day.staff ? day.staff.length : 0), 0
    );
    
    // IMPORTANT: The edge function already inserts into calculation_documents
    // DO NOT insert again to avoid duplicate entries
    
    // Extract the calculation_id from the response - if we were updating, reuse the input ID
    const calculationId = isUpdate ? calculationData.calculation_id : 
                         (data.calculation_id || data.id || data.calculationId || null);
    
    // Extract the pdf_id from the response (NEW - from updated edge function)
    const pdfId = data.pdf_id || null;
    
    // Format the response to match the expected structure in the frontend
    // Ensure we have valid numbers by using explicit conversion methods
    const result = {
      baseSalary: parseFloat(data.base_salary) || 0,
      incentiveAmount: parseFloat(data.incentive) || 0,
      totalSalary: parseFloat(data.final_amount) || 0,
      totalPapers: parseInt(data.total_papers) || 0,
      totalStaff: parseInt(data.total_staff) || parseInt(totalStaff) || 0,
      calculatedLocally: false,
      status: data.status || 'completed',
      calculation_id: calculationId,  // Include the calculation ID from the edge function
      pdf_id: pdfId  // NEW: Include the PDF ID from the edge function
    };
    
    console.log('Formatted edge function result with calculation_id and pdf_id:', result);
    return result;
  } catch (error) {
    console.error('Failed to calculate using edge function:', error);
    console.log('Falling back to local calculation');
    return calculateSalaryLocally(calculationData);
  }
};

/**
 * Save calculation results directly to the calculation_documents table
 * @param {string} examinerId The examiner ID
 * @param {Object} calculationData The calculation data to save
 * @returns {Promise} Promise object with saved document data
 */
export const saveDirectToCalculationDocuments = async (examinerId, calculationData) => {
  try {
    console.log('Saving calculation directly to documents with data:', calculationData);
    
    // First, check the document schema
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('calculation_documents')
      .select('*')
      .limit(1);
      
    if (schemaError) {
      console.error('Error checking calculation_documents schema:', schemaError);
      throw schemaError;
    }
    
    console.log('Schema check result:', schemaCheck);
    
    // Get actual columns from the table
    const actualColumns = schemaCheck && schemaCheck.length > 0 ? Object.keys(schemaCheck[0]) : [];
    console.log('Actual columns in calculation_documents:', actualColumns);
    
    const timestamp = new Date().getTime();
    const fileName = `direct_calculation_${examinerId}_${timestamp}.json`;
    
    // Create a document with only columns that exist in the table
    const insertData = {};
    
    if (actualColumns.includes('file_name')) {
      insertData.file_name = fileName;
    }
    
    if (actualColumns.includes('file_path')) {
      insertData.file_path = `/direct_calculations/${examinerId}/${timestamp}`;
    }
    
    if (actualColumns.includes('metadata')) {
      insertData.metadata = JSON.stringify({
        examiner_id: examinerId,
        total_papers: parseInt(calculationData.totalPapers) || 0,
        base_salary: parseFloat(calculationData.baseSalary) || 0,
        incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
        total_amount: parseFloat(calculationData.totalSalary) || 0,
        calculation_date: new Date().toISOString()
      });
    }
    
    // Skip insertion if there are no valid columns
    if (Object.keys(insertData).length === 0) {
      console.error('No valid columns found to insert into calculation_documents');
      throw new Error('No valid columns found to insert into calculation_documents');
    }
    
    console.log('Attempting to insert with data:', insertData);
    
    // Now do the insert
    const { data, error } = await supabase
      .from('calculation_documents')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.error('Error saving calculation document:', error);
      throw error;
    }
    
    console.log('Successfully saved calculation document:', data);
    return data;
  } catch (error) {
    console.error('Error in saveDirectToCalculationDocuments:', error);
    throw error;
  }
};

/**
 * Function to debug the calculation_documents table structure
 * This function will query the table and expose its actual structure
 */
export const debugCalculationDocumentsTable = async () => {
  try {
    console.log('Debugging calculation_documents table structure');
    
    // Method 1: Direct query to get a sample record
    const { data: sampleData, error: sampleError } = await supabase
      .from('calculation_documents')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('Error querying calculation_documents:', sampleError);
    } else {
      console.log('Sample data from calculation_documents:', sampleData);
      if (sampleData && sampleData.length > 0) {
        console.log('Available columns:', Object.keys(sampleData[0]));
      } else {
        console.log('calculation_documents table appears to be empty');
      }
    }
    
    // Method 2: Try to get table information using SQL
    try {
      const { data: tableData, error: tableError } = await supabase.rpc(
        'debug_table_info',
        { table_name: 'calculation_documents' }
      );
      
      if (tableError) {
        console.error('Error getting table info:', tableError);
      } else {
        console.log('Table structure from rpc:', tableData);
      }
    } catch (rpcError) {
      console.error('RPC error:', rpcError);
    }
    
    // Method 3: Execute a simple INSERT with a bare minimum structure
    const testData = {
      debug_note: `Table structure debug test - ${new Date().toISOString()}`
    };
    
    console.log('Trying test insert with:', testData);
    
    const { data: testInsert, error: testError } = await supabase
      .from('calculation_documents')
      .insert(testData)
      .select();
      
    if (testError) {
      console.error('Test insert error:', testError);
      console.log('Error code:', testError.code);
      console.log('Error message:', testError.message);
      
      // If the error mentions column names, extract them
      if (testError.message && testError.message.includes('column')) {
        const columnMatch = testError.message.match(/column "([^"]+)"/);
        if (columnMatch) {
          console.log('Column mentioned in error:', columnMatch[1]);
        }
      }
    } else {
      console.log('Test insert successful:', testInsert);
      console.log('Inserted record structure:', testInsert[0] ? Object.keys(testInsert[0]) : 'No data returned');
    }
    
    return {
      message: 'Debugging completed, check console logs',
      sampleData: sampleData
    };
  } catch (error) {
    console.error('Error in debugCalculationDocumentsTable:', error);
    return {
      error: true,
      message: error.message
    };
  }
};

/**
 * Save calculation data directly to calculation_documents table using multiple approaches
 * @param {Object} calculationData The calculation data to save
 * @returns {Promise} Promise with the result of the save operation
 */
export const saveCalculationToDocuments = async (calculationData) => {
  try {
    console.log('Saving calculation data to calculation_documents with:', calculationData);

    // Attempt multiple different approaches to find the right column structure
    const approaches = [
      // Approach 1: Try with document field
      {
        name: 'document approach',
        data: {
          document: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 2: Try with data field
      {
        name: 'data approach',
        data: {
          data: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 3: Try with content field
      {
        name: 'content approach',
        data: {
          content: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 4: Try with metadata field
      {
        name: 'metadata approach',
        data: {
          metadata: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 5: Try with json field
      {
        name: 'json approach',
        data: {
          json: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 6: Try with text field and describe the calculation
      {
        name: 'text description approach',
        data: {
          text: `Calculation result: Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      },
      
      // Approach 7: Try with note or notes field
      {
        name: 'note approach',
        data: {
          note: `Calculation result: Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      },
      
      // Approach 8: Try with description field
      {
        name: 'description approach',
        data: {
          description: `Calculation result: Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      },
      
      // Approach 9: Try with direct fields
      {
        name: 'direct fields approach',
        data: {
          examiner_id: calculationData.examinerId,
          total_papers: parseInt(calculationData.totalPapers) || 0,
          base_salary: parseFloat(calculationData.baseSalary) || 0,
          incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
          total_amount: parseFloat(calculationData.totalSalary) || 0
        }
      },
      
      // Approach 10: Try with name and type fields
      {
        name: 'name type approach',
        data: {
          name: `Calculation for examiner ${calculationData.examinerId}`,
          type: 'calculation',
          value: `Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      }
    ];
    
    // Try each approach until one works
    for (let i = 0; i < approaches.length; i++) {
      const approach = approaches[i];
      console.log(`Trying approach ${i+1} (${approach.name}):`, approach.data);
      
      try {
        const { data, error } = await supabase
          .from('calculation_documents')
          .insert(approach.data)
          .select();
          
        if (error) {
          console.error(`Error with approach ${i+1} (${approach.name}):`, error);
        } else {
          console.log(`✅ Success with approach ${i+1} (${approach.name}):`, data);
          return {
            success: true,
            approach: approach.name,
            data
          };
        }
      } catch (approachError) {
        console.error(`Exception with approach ${i+1} (${approach.name}):`, approachError);
      }
    }
    
    // If we get here, all approaches failed
    return {
      success: false,
      message: 'All approaches failed. Check console for details.'
    };
  } catch (error) {
    console.error('Error in saveCalculationToDocuments:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete a document by ID
 * @param {string} documentId The document ID
 * @returns {Promise} Promise object with deletion result
 */
export const deleteDocument = async (documentId) => {
  try {
    const { error } = await supabase
      .from('calculation_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Rename a document
 * @param {string} documentId The document ID
 * @param {string} newName The new document name
 * @returns {Promise} Promise object with update result
 */
export const renameDocument = async (documentId, newName) => {
  try {
    const { data, error } = await supabase
      .from('calculation_documents')
      .update({ file_name: newName })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error renaming document:', error);
    throw error;
  }
};

/**
 * Download multiple PDFs as a ZIP file
 * @param {Array} params Array of document IDs or URLs to download
 * @param {boolean} useDirectUrls Whether to use direct URLs or file paths
 * @returns {Promise} Promise with download result
 */
export const downloadDocumentsAsZip = async (params, useDirectUrls = false) => {
  try {
    // If we're using direct URLs (for pdf_documents)
    if (useDirectUrls) {
      const { documentIds, documentUrls } = params;
      
      // If document IDs are provided, fetch URLs from pdf_documents
      let urlsToDownload = documentUrls || [];
      
      if (documentIds && documentIds.length > 0) {
        console.log('Fetching PDF documents by IDs:', documentIds);
        
        const { data: pdfDocs, error } = await supabase
          .from('pdf_documents')
          .select('id, pdf_url, report_name')
          .in('id', documentIds);
          
        if (error) {
          console.error('Error fetching PDF documents:', error);
          throw error;
        }
        
        if (pdfDocs && pdfDocs.length > 0) {
          // Use the PDF URLs from the database
          urlsToDownload = pdfDocs.map(doc => ({
            url: doc.pdf_url,
            filename: doc.report_name || `report_${doc.id}.pdf`
          }));
        }
      }
      
      if (urlsToDownload.length === 0) {
        throw new Error('No URLs to download');
      }
      
      // For now, just download each PDF individually
      // In a real implementation, you would use JSZip to bundle them
      console.log('Downloading PDFs:', urlsToDownload);
      
      for (const doc of urlsToDownload) {
    const link = document.createElement('a');
        link.href = doc.url;
        link.download = doc.filename || 'document.pdf';
    document.body.appendChild(link);
    link.click();
        document.body.removeChild(link);
        
        // Small delay to prevent browser issues
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return true;
    }
    
    // Legacy method using document paths
    const documentPaths = params;
    
    if (!documentPaths || documentPaths.length === 0) {
      throw new Error('No document paths provided');
    }
    
    // In a real app, this would use JSZip to create a ZIP file
    // For now, just download each file separately
    console.log('Downloading documents from paths:', documentPaths);
    
    for (const path of documentPaths) {
      await downloadCalculationDocument(path);
      
      // Small delay to prevent browser issues
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return true;
  } catch (error) {
    console.error('Error downloading documents as ZIP:', error);
    throw error;
  }
};

/**
 * Export calculations as Excel or CSV
 * @param {Array} calculationIds Array of calculation IDs to export
 * @param {string} format Export format ('excel' or 'csv')
 * @returns {Promise} Promise object with export result
 */
export const exportCalculations = async (calculationIds, format = 'excel') => {
  try {
    const timestamp = new Date().getTime();
    const fileName = `calculations_export_${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    // Call the server API to create an export file
    const response = await axios.post('/api/calculations/export', {
      calculationIds,
      format,
      fileName
    }, {
      responseType: 'blob'
    });
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    link.remove();
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting calculations:', error);
    throw error;
  }
};

/**
 * Get all PDF documents from the pdf_documents table
 * @param {Object} filters Optional filters like report_type, examiner_id, etc.
 * @returns {Promise} Promise with array of PDF documents
 */
export const getAllPdfDocuments = async (filters = {}) => {
  try {
    console.log('Fetching PDF documents with filters:', filters);
    
    // Build the query
    let query = supabase
      .from('pdf_documents')
      .select('*');
    
    // Apply filters if provided
    if (filters.report_type) {
      query = query.eq('report_type', filters.report_type);
    }
    
    if (filters.examiner_id) {
      query = query.eq('examiner_id', filters.examiner_id);
    }
    
    if (filters.calculation_id) {
      query = query.eq('calculation_id', filters.calculation_id);
    }
    
    if (filters.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }
    
    if (filters.start_date && filters.end_date) {
      query = query
        .gte('created_at', filters.start_date)
        .lte('created_at', filters.end_date);
    }
    
    // Execute the query
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching PDF documents:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} PDF documents`);
    return data || [];
  } catch (error) {
    console.error('Error in getAllPdfDocuments:', error);
    throw error;
  }
};

/**
 * Get all PDF documents with examiner details
 * @param {Object} filters Optional filters like report_type, examiner_id, etc.
 * @returns {Promise} Promise with array of PDF documents including examiner details
 */
export const getAllPdfDocumentsWithExaminers = async (filters = {}) => {
  try {
    console.log('Fetching PDF documents with examiner info, filters:', filters);
    
    // Build the query with join to examiners table
    let query = supabase
      .from('pdf_documents')
      .select(`
        *,
        examiners:examiner_id (
          id,
          examiner_id,
          full_name,
          department,
          position
        )
      `);
    
    // Apply filters if provided
    if (filters.report_type) {
      query = query.eq('report_type', filters.report_type);
    }
    
    if (filters.examiner_id) {
      query = query.eq('examiner_id', filters.examiner_id);
    }
    
    if (filters.calculation_id) {
      query = query.eq('calculation_id', filters.calculation_id);
    }
    
    if (filters.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }
    
    if (filters.start_date && filters.end_date) {
      query = query
        .gte('created_at', filters.start_date)
        .lte('created_at', filters.end_date);
    }
    
    // Execute the query
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching PDF documents with examiners:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} PDF documents with examiner details`);
    return data || [];
  } catch (error) {
    console.error('Error in getAllPdfDocumentsWithExaminers:', error);
    throw error;
  }
};

/**
 * Toggle the favorite status of a PDF document
 * @param {string} documentId The PDF document ID
 * @param {boolean} isFavorite The new favorite status
 * @returns {Promise} Promise with update confirmation
 */
export const togglePdfDocumentFavorite = async (documentId, isFavorite) => {
  try {
    const { data, error } = await supabase
      .from('pdf_documents')
      .update({ is_favorite: isFavorite })
      .eq('id', documentId)
      .select()
      .single();
      
    if (error) {
      console.error('Error toggling PDF document favorite status:', error);
      throw error;
    }
    
    console.log('Updated PDF document favorite status:', data);
    return data;
  } catch (error) {
    console.error('Error in togglePdfDocumentFavorite:', error);
    throw error;
  }
};

/**
 * Delete a PDF document
 * @param {string} documentId The PDF document ID
 * @returns {Promise} Promise with delete confirmation
 */
export const deletePdfDocument = async (documentId) => {
  try {
    const { error } = await supabase
      .from('pdf_documents')
      .delete()
      .eq('id', documentId);
      
    if (error) {
      console.error('Error deleting PDF document:', error);
      throw error;
    }
    
    console.log('PDF document deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deletePdfDocument:', error);
    throw error;
  }
};

/**
 * Save individual PDF report metadata to pdf_documents table
 * @param {Object} params Parameters for saving the individual PDF report
 * @param {string} params.examinerId The examiner ID
 * @param {string} params.pdfUrl The URL to the generated PDF file
 * @param {string} params.reportName Optional custom report name
 * @param {string} params.calculationId Optional calculation ID to link this PDF to
 * @returns {Promise} Promise with the saved PDF document data
 */
export const saveIndividualPDFMetadata = async (params) => {
  try {
    const { examinerId, pdfUrl, reportName } = params;
    
    if (!examinerId || !pdfUrl) {
      throw new Error('Missing required parameters: examinerId and pdfUrl are required');
    }
    
    // Get examiner information for better report name
    const { data: examiner } = await supabase
      .from('examiners')
      .select('full_name')
      .eq('id', examinerId)
      .single();
    
    const examinerName = examiner?.full_name || 'Unknown';
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // Create the PDF document entry
    const pdfDocumentData = {
      examiner_id: examinerId,
      report_type: 'individual report', // Must be one of the 4 types from the schema
      calculation_id: params.calculationId || null, // UUID of calculation if available
      pdf_url: pdfUrl, // The URL to the PDF file
      filters: null, // No filters needed for individual report
      report_name: reportName || `${examinerName} - Individual Report (${timestamp})`,
      is_favorite: false // Default false
    };
    
    console.log('Saving individual PDF metadata to pdf_documents table:', pdfDocumentData);
    
    const { data: savedPdfDoc, error } = await supabase
      .from('pdf_documents')
      .insert(pdfDocumentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving individual PDF metadata:', error);
      throw error;
    }
    
    console.log('Successfully saved individual PDF metadata:', savedPdfDoc);
    return savedPdfDoc;
  } catch (error) {
    console.error('Error in saveIndividualPDFMetadata:', error);
    throw error;
  }
};

/**
 * Save examiner history PDF report metadata to pdf_documents table
 * @param {Object} params Parameters for saving the examiner history PDF report
 * @param {string} params.examinerId The examiner ID
 * @param {string} params.pdfUrl The URL to the generated PDF file
 * @param {string} params.reportName Optional custom report name
 * @param {Object} params.filters Optional filters used to generate the report
 * @returns {Promise} Promise with the saved PDF document data
 */
export const saveExaminerHistoryPDFMetadata = async (params) => {
  try {
    const { examinerId, pdfUrl, reportName, filters } = params;
    
    if (!examinerId || !pdfUrl) {
      throw new Error('Missing required parameters: examinerId and pdfUrl are required');
    }
    
    // Get examiner information for better report name
    const { data: examiner } = await supabase
      .from('examiners')
      .select('full_name')
      .eq('id', examinerId)
      .single();
    
    const examinerName = examiner?.full_name || 'Unknown';
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // Create the PDF document entry
    const pdfDocumentData = {
      examiner_id: examinerId,
      report_type: 'examiner report', // Must be one of the 4 types from the schema
      calculation_id: null, // Not linked to a specific calculation
      pdf_url: pdfUrl, // The URL to the PDF file
      filters: filters ? JSON.stringify(filters) : null,
      report_name: reportName || `${examinerName} - Full History Report (${timestamp})`,
      is_favorite: false // Default false
    };
    
    console.log('Saving examiner history PDF metadata to pdf_documents table:', pdfDocumentData);
    
    const { data: savedPdfDoc, error } = await supabase
      .from('pdf_documents')
      .insert(pdfDocumentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving examiner history PDF metadata:', error);
      throw error;
    }
    
    console.log('Successfully saved examiner history PDF metadata:', savedPdfDoc);
    return savedPdfDoc;
  } catch (error) {
    console.error('Error in saveExaminerHistoryPDFMetadata:', error);
    throw error;
  }
};

/**
 * Save merged PDF report metadata to pdf_documents table
 * @param {Object} params Parameters for saving the merged PDF report
 * @param {string} params.pdfUrl The URL to the generated PDF file
 * @param {string} params.reportName Optional custom report name
 * @param {Object} params.filters Optional filters used to generate the report
 * @returns {Promise} Promise with the saved PDF document data
 */
export const saveMergedPDFMetadata = async (params) => {
  try {
    const { pdfUrl, reportName, filters } = params;
    
    if (!pdfUrl) {
      throw new Error('Missing required parameter: pdfUrl is required');
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // Create the PDF document entry
    const pdfDocumentData = {
      examiner_id: params.primaryExaminerId || null, // Optional: primary examiner if applicable
      report_type: 'merged report', // Must be one of the 4 types from the schema
      calculation_id: null, // Not linked to a specific calculation
      pdf_url: pdfUrl, // The URL to the PDF file
      filters: filters ? JSON.stringify(filters) : null,
      report_name: reportName || `Merged Examiners Report (${timestamp})`,
      is_favorite: false // Default false
    };
    
    console.log('Saving merged PDF metadata to pdf_documents table:', pdfDocumentData);
    
    const { data: savedPdfDoc, error } = await supabase
      .from('pdf_documents')
      .insert(pdfDocumentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving merged PDF metadata:', error);
      throw error;
    }
    
    console.log('Successfully saved merged PDF metadata:', savedPdfDoc);
    return savedPdfDoc;
  } catch (error) {
    console.error('Error in saveMergedPDFMetadata:', error);
    throw error;
  }
};

/**
 * Save custom PDF report metadata to pdf_documents table
 * @param {Object} params Parameters for saving the custom PDF report
 * @param {string} params.pdfUrl The URL to the generated PDF file
 * @param {string} params.reportName Optional custom report name
 * @param {Object} params.filters Optional filters used to generate the report
 * @returns {Promise} Promise with the saved PDF document data
 */
export const saveCustomPDFMetadata = async (params) => {
  try {
    const { pdfUrl, reportName, filters } = params;
    
    if (!pdfUrl) {
      throw new Error('Missing required parameter: pdfUrl is required');
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // Create the PDF document entry
    const pdfDocumentData = {
      examiner_id: params.examinerId || null, // Optional: examiner ID if relevant to the custom report
      report_type: 'custom report', // Must be one of the 4 types from the schema
      calculation_id: null, // Not linked to a specific calculation
      pdf_url: pdfUrl, // The URL to the PDF file
      filters: filters ? JSON.stringify(filters) : null,
      report_name: reportName || `Custom Report (${timestamp})`,
      is_favorite: false // Default false
    };
    
    console.log('Saving custom PDF metadata to pdf_documents table:', pdfDocumentData);
    
    const { data: savedPdfDoc, error } = await supabase
      .from('pdf_documents')
      .insert(pdfDocumentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving custom PDF metadata:', error);
      throw error;
    }
    
    console.log('Successfully saved custom PDF metadata:', savedPdfDoc);
    return savedPdfDoc;
  } catch (error) {
    console.error('Error in saveCustomPDFMetadata:', error);
    throw error;
  }
};

// Export as default
const calculationService = {
  getExaminerDetails,
  saveCalculation,
  getAllCalculations,
  getCalculationById,
  updateCalculation,
  generateCalculationPDF,
  downloadCalculationDocument,
  downloadCalculationPDF,
  deleteCalculation,
  getCalculationsByExaminer,
  calculateSalaryWithEdgeFunction,
  calculateSalaryLocally,
  saveDirectToCalculationDocuments,
  debugCalculationDocumentsTable,
  saveCalculationToDocuments,
  deleteDocument,
  renameDocument,
  downloadDocumentsAsZip,
  exportCalculations,
  getAllPdfDocuments,
  getAllPdfDocumentsWithExaminers,
  togglePdfDocumentFavorite,
  deletePdfDocument,
  saveIndividualPDFMetadata,
  saveExaminerHistoryPDFMetadata,
  saveMergedPDFMetadata,
  saveCustomPDFMetadata
};

export default calculationService; 
