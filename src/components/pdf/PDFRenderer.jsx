import React from 'react';
import { PDFDownloadLink, PDFViewer, pdf, Font } from '@react-pdf/renderer';
import ExaminerReportPDF from './ExaminerReportPDF';
import IndividualExaminerReportPDF from './IndividualExaminerReportPDF';
import ExaminerHistoryReportPDF from './ExaminerHistoryReportPDF';
import AllExaminersReportPDF from './AllExaminersReportPDF';
import CustomReportPDF from './CustomReportPDF';

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
  ALL_EXAMINERS: 'all-examiners',
  CUSTOM: 'custom'
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
    let component;
    
    switch (reportType) {
      case ReportTypes.INDIVIDUAL:
        component = (
          <IndividualExaminerReportPDF 
            examiner={examiner} 
            calculation={calculations[0]} 
            staffDetails={options.staffDetails || []} 
          />
        );
        break;
      
      case ReportTypes.HISTORY:
        component = (
          <ExaminerHistoryReportPDF 
            examiner={examiner} 
            calculations={calculations} 
          />
        );
        break;
      
      case ReportTypes.ALL_EXAMINERS:
        component = (
          <AllExaminersReportPDF 
            examinersData={options.examinersData || []} 
            filterInfo={options.filterInfo || {}}
          />
        );
        break;
      
      case ReportTypes.CUSTOM:
        component = (
          <CustomReportPDF 
            title={options.title || 'Custom Examiner Report'}
            examinersData={options.examinersData || []}
            reportConfig={options.reportConfig || {}}
            filterInfo={options.filterInfo || {}}
          />
        );
        break;
      
      default:
        // Legacy/default behavior - use the original ExaminerReportPDF
        component = <ExaminerReportPDF examiner={examiner} calculations={calculations} />;
    }
    
    const blob = await pdf(component).toBlob();
    
    if (!blob) throw new Error("No blob generated");
    return blob;
  } catch (error) {
    console.error('Error generating PDF blob:', error);
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
    const blob = await generatePDFBlob(examiner, calculations, reportType, options);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
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