import React from 'react';
import { PDFDownloadLink, PDFViewer, pdf, Font } from '@react-pdf/renderer';
import ExaminerReportPDF from './ExaminerReportPDF';
import IndividualExaminerReportPDF from './IndividualReportPDF';
import ExaminerHistoryReportPDF from './ExaminerReportPDF';
import AllExaminersReportPDF from './MergedReportPDF';

// Buffer polyfill for browser environment
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  window.Buffer = {
    from: (arr) => Uint8Array.from(arr),
    isBuffer: () => false
  };
}

// Register Poppins font family
Font.register({
  family: 'Poppins',
  fonts: [
    {
      src: '/fonts/Poppins-Light.ttf',
      fontWeight: 300,
    },
    {
      src: '/fonts/Poppins-Regular.ttf',
      fontWeight: 400,
    },
    {
      src: '/fonts/Poppins-Medium.ttf',
      fontWeight: 500,
    },
    {
      src: '/fonts/Poppins-SemiBold.ttf',
      fontWeight: 600,
    },
    {
      src: '/fonts/Poppins-Bold.ttf',
      fontWeight: 700,
    },
    {
      src: '/fonts/Poppins-ExtraBold.ttf',
      fontWeight: 800,
    },
    {
      src: '/fonts/Poppins-Black.ttf',
      fontWeight: 900,
    },
    {
      src: '/fonts/Poppins-Italic.ttf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Poppins-BoldItalic.ttf',
      fontWeight: 700,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Poppins-LightItalic.ttf',
      fontWeight: 300,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Poppins-MediumItalic.ttf',
      fontWeight: 500,
      fontStyle: 'italic',
    },
    {
      src: '/fonts/Poppins-SemiBoldItalic.ttf',
      fontWeight: 600,
      fontStyle: 'italic',
    }
  ],
});

// Register hyphenation callback to prevent word breaks
Font.registerHyphenationCallback(word => [word]);

// Set default font for all PDFs
Font.default = {
  family: 'Poppins',
  fontWeight: 400,
};

/**
 * Report Types Enum
 */
export const ReportTypes = {
  INDIVIDUAL: 'individual',
  HISTORY: 'history',
  ALL_EXAMINERS: 'all-examiners'
};

/**
 * Generate a PDF blob directly using the pdf() function
 * @param {Object} examiner - Examiner data
 * @param {Array} calculations - Calculations data
 * @param {String} reportType - Type of report to generate
 * @param {Object} options - Additional options for the report
 * @returns {Promise<Blob>} - PDF blob
 */
export const generatePDFBlob = async (examiner, calculations, reportType = ReportTypes.INDIVIDUAL, options = {}) => {
  try {
    console.log(`Generating PDF blob for report type: ${reportType}`, { 
      hasExaminer: !!examiner, 
      calculationsCount: calculations?.length || 0,
      options: {
        hasExaminersData: !!options.examinersData,
        examinersDataCount: options.examinersData?.length || 0,
        hasFilterInfo: !!options.filterInfo
      }
    });
    
    let component;
    
    switch (reportType) {
      case ReportTypes.INDIVIDUAL:
        console.log('Creating Individual Report component');
        
        // Format staffDetails to ensure day-level breakdown is preserved
        let formattedStaffDetails = options.staffDetails || [];
        const calculation = calculations[0];
        
        // Check if we need to preprocess staffDetails to ensure proper day-wise structure
        if (formattedStaffDetails.length > 0) {
          // Count the number of unique evaluation dates for debugging
          const uniqueDates = new Set(
            formattedStaffDetails.map(s => 
              s.evaluationDate || s.evaluation_date || s.date
            ).filter(Boolean)
          );
          
          console.log('Original staffDetails structure:', 
            formattedStaffDetails.slice(0, 3).map(s => ({
              date: s.evaluationDate || s.evaluation_date || s.date,
              name: s.staffName || s.name || s.staff_name,
              papers: s.papersEvaluated || s.papers_evaluated || s.papers
            }))
          );
          
          console.log(`Staff details contain ${uniqueDates.size} unique evaluation dates:`, 
            Array.from(uniqueDates).sort()
          );
          
          // Make sure each staff entry has the evaluation date
          formattedStaffDetails = formattedStaffDetails.map(staff => {
            // Ensure staff has an evaluation date
            if (!staff.evaluationDate && !staff.evaluation_date && !staff.date) {
              // Try to find the date from calculation days if possible
              if (calculation?.calculation_days?.length > 0) {
                const day = calculation.calculation_days.find(d => 
                  d.id === staff.day_id || 
                  d.evaluation_days?.id === staff.day_id || 
                  d.evaluation_day_id === staff.day_id ||
                  d.evaluation_days?.id === staff.evaluation_day_id
                );
                if (day) {
                  staff.evaluationDate = day.evaluation_date || day.evaluation_days?.evaluation_date;
                }
              }
              
              // If still no date, use a default
              if (!staff.evaluationDate) {
                staff.evaluationDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
              }
            }
            return staff;
          });
          
          // Log the processed staff details
          console.log(`Formatted ${formattedStaffDetails.length} staff details`);
        } 
        // If no staff details provided, try to extract them from calculation
        else if (calculation) {
          console.log('No staffDetails provided, extracting from calculation');
          // Will be handled by the IndividualReportPDF component
        }
        
        // Ensure each staff entry has consistent property naming
        formattedStaffDetails = formattedStaffDetails.map(staff => ({
          evaluationDate: staff.evaluationDate || staff.evaluation_date || staff.date || 'Unknown Date',
          staffName: staff.staffName || staff.staff_name || staff.name || 'Unknown Staff',
          papersEvaluated: staff.papersEvaluated || staff.papers_evaluated || staff.papers || 0
        }));
        
        component = (
          <IndividualExaminerReportPDF 
            examiner={examiner} 
            calculation={calculation} 
            staffDetails={formattedStaffDetails}
          />
        );
        break;
      
      case ReportTypes.HISTORY:
        console.log('Creating History Report component');
        component = (
          <ExaminerHistoryReportPDF 
            examiner={examiner} 
            calculations={calculations} 
          />
        );
        break;
      
      case ReportTypes.ALL_EXAMINERS:
        console.log('Creating Merged Report component with examiners data:', {
          examinersCount: options.examinersData?.length || 0,
          firstExaminerName: options.examinersData?.[0]?.examiner?.full_name || 'Unknown',
          totalCalculations: options.examinersData?.reduce((sum, e) => sum + (e.calculations?.length || 0), 0) || 0,
          hasFilterInfo: Boolean(options.filterInfo)
        });
        component = (
          <AllExaminersReportPDF
            examiners={options.examinersData || []}
            filterInfo={options.filterInfo || {}}
          />
        );
        break;
      
      default:
        console.log('Using default ExaminerReportPDF component');
        // Legacy/default behavior - use the original ExaminerReportPDF
        component = <ExaminerReportPDF examiner={examiner} calculations={calculations} />;
    }
    
    console.log('Starting PDF rendering with @react-pdf/renderer');
    const blob = await pdf(component).toBlob();
    
    if (!blob) {
      console.error('PDF generation failed: No blob was returned from pdf().toBlob()');
      throw new Error("No blob generated");
    }
    
    console.log(`PDF blob successfully created: ${blob.size} bytes`);
    return blob;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Generate a PDF document and return the Blob URL
 * @param {Object} examiner - Examiner data
 * @param {Array} calculations - Calculations data
 * @returns {Promise<string>} - Blob URL for the PDF
 */
export const generatePDFBlobURL = async (examiner, calculations) => {
  try {
    const blob = await generatePDFBlob(examiner, calculations);
    const url = URL.createObjectURL(blob);
    
    if (!url) throw new Error("No blob URL created");
    return url;
  } catch (error) {
    console.error('Error in generatePDFBlobURL:', error);
    throw error;
  }
};

/**
 * Download the PDF directly
 * @param {Object} examiner - Examiner data 
 * @param {Array} calculations - Calculations data
 * @param {String} fileName - File name for download
 * @param {String} reportType - Type of report to generate
 * @param {Object} options - Additional options for the report
 */
export const downloadPDF = async (examiner, calculations, fileName = 'Examiner_Report.pdf', reportType = ReportTypes.INDIVIDUAL, options = {}) => {
  try {
    console.log('Starting PDF generation for download:', { reportType, fileName });
    
    // Generate the PDF blob
    const blob = await generatePDFBlob(examiner, calculations, reportType, options);
    console.log('PDF Blob generated successfully:', blob.size, 'bytes');
    
    // Create a blob URL with explicit PDF mime type
    const blobWithType = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(blobWithType);
    
    // Create download element off-screen
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('type', 'application/pdf');
    link.style.display = 'none';
    document.body.appendChild(link);
    
    console.log('Download link created:', link.href);
    
    // Simulate a click and provide a longer timeout for browser to handle the download
    link.click();
    console.log('Download initiated');
    
    // Clean up with a longer timeout to ensure browser has time to process the download
    return new Promise((resolve) => {
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
        console.log('Download cleanup completed');
        resolve(true);
      }, 2000); // Increased timeout to 2 seconds
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};

/**
 * Open PDF in a new tab
 * @param {Object} examiner - Examiner data 
 * @param {Array} calculations - Calculations data 
 * @param {String} reportType - Type of report to generate
 * @param {Object} options - Additional options for the report
 * @returns {String} - URL of the PDF
 */
export const openPDFInNewTab = async (examiner, calculations, reportType = ReportTypes.INDIVIDUAL, options = {}) => {
  try {
    const blob = await generatePDFBlob(examiner, calculations, reportType, options);
    const url = URL.createObjectURL(blob);
    
    window.open(url, '_blank');
    
    // We don't revoke URL as the tab needs it open
    return url;
  } catch (error) {
    console.error('Error opening PDF in new tab:', error);
    throw error;
  }
};

/**
 * PDF Download Link Component
 */
export const PDFDownloadButton = ({ examiner, calculations, fileName, children }) => (
  <PDFDownloadLink
    document={<ExaminerReportPDF examiner={examiner} calculations={calculations} />}
    fileName={fileName || `Examiner_Report_${examiner?.id || 'Unknown'}.pdf`}
    style={{
      textDecoration: 'none',
      padding: '10px 15px',
      backgroundColor: '#0070f3',
      color: 'white',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'inline-block'
    }}
  >
    {({ blob, url, loading, error }) =>
      loading ? 'Loading document...' : children || 'Download PDF'
    }
  </PDFDownloadLink>
);

/**
 * PDF Viewer Component (for preview)
 */
export const PDFPreviewViewer = ({ examiner, calculations, width, height }) => (
  <PDFViewer width={width || '100%'} height={height || '600px'} style={{ border: '1px solid #ddd' }}>
    <ExaminerReportPDF examiner={examiner} calculations={calculations} />
  </PDFViewer>
);

// Create a named object to export as default
const PDFRenderer = {
  PDFDownloadButton,
  PDFPreviewViewer,
  generatePDFBlobURL,
  generatePDFBlob,
  downloadPDF,
  openPDFInNewTab,
  ReportTypes
};

export default PDFRenderer; 