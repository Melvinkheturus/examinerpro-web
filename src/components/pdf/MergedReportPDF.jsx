import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';
import { 
  CollegeHeader, 
  PageFooter, 
  // eslint-disable-next-line no-unused-vars
  ExaminerDetailsBlock,
  // eslint-disable-next-line no-unused-vars
  CalculationSummary,
  // eslint-disable-next-line no-unused-vars
  CalculationDetailSummary,
  // eslint-disable-next-line no-unused-vars
  StaffEvaluationTable,
  ReportTypeBar,
  FooterSpacer,
  SectionTitle,
  // eslint-disable-next-line no-unused-vars
  PageBreak
} from './ReportComponents';
import { 
  formatCurrency, 
  formatIndianCurrency,
  formatDate, 
  getCustomCalcId,
  extractEvaluationData
} from './PDFUtils';

// Create styles for the merged report
const mergedStyles = StyleSheet.create({
  // Page container style
  // Sets vertical padding and white background for all pages
  page: {
    paddingVertical: 30,
    backgroundColor: 'white',
  },
  
  // Main section header
  // Bold white text on brown background with rounded corners
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#92400E',
    padding: 8,
    borderRadius: '4pt',
    marginTop: 2,
    marginBottom: 10,
  },
  
  // Secondary section title
  // Bold brown text with bottom border
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#92400E',
    borderBottom: '1px solid #92400E',
    paddingBottom: 3,
  },
  
  // Examiner title style
  // Bold text on light teal background with rounded corners
  examinerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
    color: '#004d40',
    backgroundColor: '#e0f2f1',
    padding: 5,
    borderRadius: '4pt',
  },
  
  // Overview data container
  // Flex layout with light border and rounded corners
  overviewTable: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    borderRadius: '4pt',
    border: '1px solid #e0e0e0',
    padding: 8,
  },
  
  // Standard overview item (half width)
  // Used for displaying key-value pairs in the overview
  overviewItem: {
    width: '50%',
    marginBottom: 8,
    flexDirection: 'row',
  },
  
  // Full width overview item
  // For items that need to span the entire container
  overviewItemWide: {
    width: '100%',
    marginBottom: 8,
    flexDirection: 'row',
  },
  
  // Overview label style
  // Bold blue text for property names
  overviewLabel: {
    width: '30%',
    fontWeight: 'bold',
    color: '#003366',
    fontSize: 12,
  },
  
  // Overview value style
  // Standard text for property values
  overviewValue: {
    flex: 1,
    fontSize: 12,
  },
  
  // Section divider line
  // Thin blue horizontal line with opacity
  sectionDivider: {
    height: 1,
    backgroundColor: '#003366',
    marginTop: 15,
    marginBottom: 15,
    opacity: 0.5,
  },
  
  // Report summary container
  // Flex grid layout with light border and padding
  reportSummaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderRadius: '4pt',
    border: '1px solid #e0e0e0',
    padding: 8,
  },
  
  // Individual summary statistic container
  // Centered content with fixed width
  reportSummaryItem: {
    width: '33.33%',
    marginBottom: 10,
    padding: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Summary statistic label
  // Small gray text for metric names
  reportSummaryLabel: {
    fontSize: 10,
    color: '#424242',
    marginBottom: 2,
    textAlign: 'center',
  },
  
  // Summary statistic value
  // Bold blue larger text for metric values
  reportSummaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
  },
  
  // Generic table container
  // Flex column layout for tables
  tableContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Table header row
  // Flex row with space between cells
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
  },
  
  // Standard table row
  // Flex row with padding
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
  },
  
  // Even row background style
  // Light gray background for zebra striping
  tableRowEven: {
    backgroundColor: '#f0f0f0',
  },
  
  // Odd row background style
  // White background for zebra striping
  tableRowOdd: {
    backgroundColor: '#ffffff',
  },
  
  // Standard table cell
  // Flex 1 to distribute space evenly
  tableCell: {
    flex: 1,
  },
  
  // Left-aligned table cell
  // Flex 1 with left padding
  tableCellLeft: {
    flex: 1,
    paddingLeft: 4,
  },
  
  // Total row style
  // Bold text for summary rows
  totalRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
    fontWeight: 'bold',
  },
  
  // Main breakdown title
  // Large bold blue centered text
  detailedBreakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  // Horizontal divider line
  // Blue line for visual separation
  horizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#003366',
    borderBottomStyle: 'solid',
    marginVertical: 10,
  },
  
  // Examiner ID heading
  // Bold text for examiner identification
  examinerIdHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  
  // Examiner ID number style
  // Brown color for ID values
  examinerIdNumber: {
    color: '#92400E', // orange-brown color
  },
  
  // Section title
  // Bold blue text for section headers
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginVertical: 10,
  },
  
  // Calculation summary table
  // Light gray border for the table container
  calcSummaryTable: {
    border: '1px solid #cccccc',
    borderRadius: '0pt',
  },
  
  // Calculation summary row
  // Horizontal flex layout with bottom border
  calcSummaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
  },
  
  // Calculation summary label cell
  // Bold text with right border, 70% width
  calcSummaryLabelCell: {
    padding: 8,
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
    borderRightStyle: 'solid',
    width: '70%',
    fontSize: 12,
  },
  
  // Calculation summary value cell
  // Right-aligned text, 30% width
  calcSummaryValueCell: {
    padding: 8,
    width: '30%',
    textAlign: 'right',
    fontSize: 12,
  },
  
  // Final total row highlight
  // Light yellow background for the final amount row
  totalFinalRow: {
    backgroundColor: '#fffde7', // light yellow
  },
  
  // Final total label style
  // Bold red text for the total label
  totalFinalLabel: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  
  // Final total value style
  // Bold red text for the total amount
  totalFinalValue: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  
  // Examiner overview container
  // Box with light border and rounded corners
  examinerOverviewBox: {
    border: '1px solid #cccccc',
    borderRadius: '5pt',
    padding: 10,
    marginBottom: 15,
  },
  
  // Overview row layout
  // Horizontal flex layout for key-value pairs
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  
  // Table header style for main tables
  // Blue background with white text and borders
  tableHeaderStyle: {
    backgroundColor: '#003366', // Dark blue background
    color: 'white',
    fontWeight: 'bold',
    padding: '8pt 6pt',  // Increased vertical padding for better alignment
    borderWidth: 1,
    borderColor: '#003366',
    borderStyle: 'solid',
    textAlign: 'center',
    fontSize: 11,
    verticalAlign: 'middle', // Ensure vertical centering
  },
  
  // Table header for summary tables
  // Similar to regular header but with reduced padding
  summaryTableHeader: {
    backgroundColor: '#003366',
    color: 'white',
    fontWeight: 'bold',
    padding: '5pt 4pt',  // Reduced padding
    border: '1pt solid #003366',
    fontSize: 10,
    textAlign: 'center',
  },
  
  // Calculation breakdown title
  // Blue centered text for calculation section
  calculationBreakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  // Calculation ID heading
  // Bold text for calculation identifiers
  calculationIdHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'left',
  },
  
  // Calculation details table
  // Light gray border for calculation details
  calculationDetailsTable: {
    marginTop: 15,
    marginBottom: 20,
    border: '1pt solid #cccccc',
  },
  
  // Calculation details row
  // Horizontal layout with bottom border
  calculationDetailsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
  },
  
  // Calculation details label cell
  // Bold blue text on light gray background
  calculationDetailsLabelCell: {
    padding: 8,
    fontWeight: 'bold',
    color: '#003366',
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
    borderRightStyle: 'solid',
    width: '70%',
    fontSize: 12,
    backgroundColor: '#f5f5f5',
  },
  
  // Calculation details value cell
  // Right-aligned text for values
  calculationDetailsValueCell: {
    padding: 8,
    width: '30%',
    textAlign: 'right',
    fontSize: 12,
  },
  
  // Detailed breakdown subtitle
  // Blue centered text with top margin
  detailedBreakdownSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 10,
  },
  
  // Calculation final row highlight
  // Light yellow background for final calculation row
  calculationFinalRow: {
    backgroundColor: '#fffde7', // light yellow
  },
  
  // Calculation final label style
  // Bold red text for final label
  calculationFinalLabel: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  
  // Calculation final value style
  // Bold red text for final amount
  calculationFinalValue: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  
  // Evaluation summary title
  // Bold blue text for evaluation section
  evaluationSummaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 10,
    marginBottom: 10,
  },
  
  // Staff evaluation title
  // Bold blue text for staff evaluation section
  staffEvaluationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 20,
    marginBottom: 10,
  },
  
  // Staff table container
  // Bottom margin for staff evaluation tables
  staffTable: {
    marginBottom: 15,
  },
  
  // Staff table header
  // Blue background with white text
  staffTableHeader: {
    backgroundColor: '#003366',
    color: 'white',
    padding: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 10,
    border: '1pt solid #003366',
  },
  
  // Staff table cell
  // Centered text with light border
  staffTableCell: {
    padding: 5,
    textAlign: 'center',
    fontSize: 10,
    border: '0.5pt solid #cccccc',
  },
  
  // Subtotal row for staff evaluations
  // Bold text with margins
  subtotalRow: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 5,
    marginLeft: 5,
  },
  
  // Subtotal date text
  // Blue color for date in subtotal
  subtotalDate: {
    color: '#003366',
  },
  
  // Subtotal papers count
  // Brown color for paper count in subtotal
  subtotalPapers: {
    color: '#92400E',
  },
});

// Helper function to calculate report summary totals
const calculateReportSummary = (examiners) => {
  return examiners.reduce((summary, examiner) => {
    const examinerCalculations = examiner.calculations || [];
    const totalCalculations = examinerCalculations.length;
    
    let totalEvalDays = 0;
    let totalStaff = 0;
    let totalPapers = 0;
    let totalAmount = 0;
    
    examinerCalculations.forEach(calc => {
      totalEvalDays += calc.calculation_days?.length || calc.total_days || 0;
      totalStaff += parseInt(calc.total_staff || 0);
      totalPapers += parseInt(calc.total_papers || 0);
      totalAmount += parseFloat(calc.final_amount || calc.total_amount || 0);
    });
    
    return {
      totalExaminers: summary.totalExaminers + 1,
      totalCalculations: summary.totalCalculations + totalCalculations,
      totalEvalDays: summary.totalEvalDays + totalEvalDays,
      totalStaff: summary.totalStaff + totalStaff,
      totalPapers: summary.totalPapers + totalPapers,
      totalAmount: summary.totalAmount + totalAmount
    };
  }, {
    totalExaminers: 0,
    totalCalculations: 0,
    totalEvalDays: 0,
    totalStaff: 0,
    totalPapers: 0,
    totalAmount: 0
  });
};

/**
 * Process calculation data to ensure consistent handling of evaluation days
 */
export const processCalculationData = (calculation) => {
  console.log(`Processing calculation ${calculation.id}:`, {
    hasCalculationDays: Boolean(calculation.calculation_days?.length),
    calculationDaysCount: calculation.calculation_days?.length || 0,
    hasEvaluationDays: Boolean(calculation.evaluationDays?.length),
    evaluationDaysCount: calculation.evaluationDays?.length || 0,
    firstDayStructure: calculation.calculation_days?.[0] ? 
      {
        hasEvaluationDays: Boolean(calculation.calculation_days[0].evaluation_days),
        hasStaffEvals: Boolean(calculation.calculation_days[0].evaluation_days?.staff_evaluations?.length),
        staffEvalsCount: calculation.calculation_days[0].evaluation_days?.staff_evaluations?.length || 0
      } : 'No days'
  });

  // If evaluationDays is already formatted properly, use it
  if (calculation.evaluationDays && calculation.evaluationDays.length > 0) {
    console.log(`Using pre-transformed evaluationDays for ${calculation.id} (${calculation.evaluationDays.length} days)`);
    
    // Extract staff details from the pre-transformed structure
    const staffDetails = [];
    calculation.evaluationDays.forEach(day => {
      if (day.staff_evaluations && day.staff_evaluations.length > 0) {
        console.log(`Staff evaluations for day ${day.id}:`, {
          count: day.staff_evaluations.length,
          firstStaff: day.staff_evaluations[0],
          hasPapersEvaluated: Boolean(day.staff_evaluations[0].papers_evaluated),
          actualPapersValue: day.staff_evaluations[0].papers_evaluated,
          staffNames: day.staff_evaluations.map(s => s.staff_name).join(', ')
        });
        
        day.staff_evaluations.forEach(staff => {
          staffDetails.push({
            evaluationDate: day.evaluation_date,
            staffName: staff.staff_name || 'Unknown Staff',
            papersEvaluated: staff.papers_evaluated || 0
          });
        });
      } else {
        console.log(`No staff evaluations found for day ${day.id}`);
      }
    });
    
    console.log(`Extracted ${staffDetails.length} staff details for calculation ${calculation.id}`);
    return {
      ...calculation,
      processedStaffDetails: staffDetails
    };
  }
  
  // Otherwise use extractEvaluationData (fallback)
  const { staffDetails } = extractEvaluationData(calculation);
  console.log(`Extracted ${staffDetails.length} staff details using fallback for calculation ${calculation.id}`);
  
  return {
    ...calculation,
    processedStaffDetails: staffDetails
  };
};

// Helper function to estimate content height for pagination
// eslint-disable-next-line no-unused-vars
const estimateContentHeight = (items, itemHeight = 30, headerHeight = 40, footerHeight = 40) => {
  return (items.length * itemHeight) + headerHeight + footerHeight;
};

// PDF Component for the Merged Report
const MergedReportPDF = ({ examiners = [] }) => {
  // Data validation - ensure we have valid examiner data
  if (!examiners || examiners.length === 0) {
    console.error('No examiners data provided to MergedReportPDF');
    // Return minimal document to avoid rendering errors
    return (
      <Document>
        <Page size="A4" style={[mergedStyles.page, PDFStyles.page]}>
          <CollegeHeader />
          <View style={PDFStyles.safeContentArea}>
            <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 100 }}>
              No examiner data found. Please try again.
            </Text>
          </View>
          <PageFooter reportType="ERROR" pageNumber={1} totalPages={1} />
        </Page>
      </Document>
    );
  }
  
  // Log examiners data for debugging
  console.log(`MergedReportPDF received ${examiners.length} examiners:`, {
    firstExaminerName: examiners[0]?.examiner?.full_name || 'Unknown',
    totalCalculations: examiners.reduce((sum, e) => sum + (e.calculations?.length || 0), 0)
  });
  
  // Pre-process all calculations to ensure proper staff details extraction
  examiners.forEach(examiner => {
    if (examiner.calculations && examiner.calculations.length > 0) {
      examiner.calculations = examiner.calculations.map(processCalculationData);
    }
  });
  
  // Calculate overall report summary
  const summary = calculateReportSummary(examiners);
  
  // Calculate total number of pages
  let totalPages = 1; // Start with cover page
  
  examiners.forEach(examiner => {
    totalPages += 1; // Examiner overview page
    totalPages += 1; // Calculations summary page
    
    // For each calculation, add two pages - one for summary and one for staff details
    const calculations = examiner.calculations || [];
    totalPages += calculations.length * 2; // Each calculation now has 2 pages
  });
  
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={[mergedStyles.page, PDFStyles.page]}>
        {/* College Header */}
        <CollegeHeader />

        {/* Report Type Bar */}
        <ReportTypeBar />

        {/* Report Title */}
        <Text style={PDFStyles.mergedReportTitle}>Examiners Consolidated Calculation Report</Text>
        
        {/* Safe content area */}
        <View style={PDFStyles.safeContentArea}>
          {/* Report Summary Grid */}
          <View style={[mergedStyles.reportSummaryGrid, PDFStyles.nonBreakingSection]}>
            <View style={mergedStyles.reportSummaryItem}>
              <Text style={mergedStyles.reportSummaryLabel}>Total Examiners</Text>
              <Text style={mergedStyles.reportSummaryValue}>{summary.totalExaminers}</Text>
            </View>
            <View style={mergedStyles.reportSummaryItem}>
              <Text style={mergedStyles.reportSummaryLabel}>Total Calculations</Text>
              <Text style={mergedStyles.reportSummaryValue}>{summary.totalCalculations}</Text>
            </View>
            <View style={mergedStyles.reportSummaryItem}>
              <Text style={mergedStyles.reportSummaryLabel}>Total Evaluation Days</Text>
              <Text style={mergedStyles.reportSummaryValue}>{summary.totalEvalDays}</Text>
            </View>
            <View style={mergedStyles.reportSummaryItem}>
              <Text style={mergedStyles.reportSummaryLabel}>Total Staff</Text>
              <Text style={mergedStyles.reportSummaryValue}>{summary.totalStaff}</Text>
            </View>
            <View style={mergedStyles.reportSummaryItem}>
              <Text style={mergedStyles.reportSummaryLabel}>Total Papers</Text>
              <Text style={mergedStyles.reportSummaryValue}>{summary.totalPapers}</Text>
            </View>
            <View style={mergedStyles.reportSummaryItem}>
              <Text style={mergedStyles.reportSummaryLabel}>Total Amount</Text>
              <Text style={mergedStyles.reportSummaryValue}>{formatIndianCurrency(summary.totalAmount)}</Text>
            </View>
          </View>
          
          {/* Examiners Table with date on right */}
          <View style={PDFStyles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionTitle title="Examiners Summary" />
              <Text style={{ fontSize: 12, position: 'absolute', right: '15pt' }}>Generated at {formatDate(new Date(), 'fullDate')}</Text>
            </View>
            <ExaminerSummaryTable examiners={examiners} />
          </View>
        </View>

        {/* Footer Spacer */}
        <FooterSpacer />
        
        {/* Page Footer */}
        <PageFooter
          reportType="MERGED REPORT"
          pageNumber={1}
          totalPages={totalPages}
        />
      </Page>
      
      {/* Examiner Pages */}
      {examiners.map((examiner, examinerIndex) => {
        const pageNumber = examinerIndex + 2;
        const calculations = examiner.calculations || [];
        
        // Calculate examiner totals
        const totalEvalDays = calculations.reduce((sum, calc) => 
          sum + (calc.total_days || calc.evaluationDays?.length || 0), 0);
        const totalStaff = calculations.reduce((sum, calc) => 
          sum + (parseInt(calc.total_staff || 0)), 0);
        const totalPapers = calculations.reduce((sum, calc) => 
          sum + (parseInt(calc.total_papers || 0)), 0);
        const totalAmount = calculations.reduce((sum, calc) => 
          sum + (parseFloat(calc.final_amount || calc.total_amount || 0)), 0);
        const baseSalary = totalAmount * 0.9; // Assuming 90% is base salary
        const incentiveAmount = totalAmount * 0.1; // Assuming 10% is incentive
        
        // Get examiner custom ID (format: MECR-YYYY-001)
        const getExaminerCustomId = () => {
          const examinerObj = examiner.examiner || examiner;
          if (examinerObj.custom_id) return examinerObj.custom_id;
          
          const year = new Date().getFullYear();
          const paddedNumber = String(examinerIndex + 1).padStart(3, '0');
          return `MECR-${year}-${paddedNumber}`;
        };
        
        return (
          <React.Fragment key={`examiner-page-${examinerIndex}`}>
            {/* Examiner Overview Page - New Layout */}
            <Page size="A4" style={[mergedStyles.page, PDFStyles.page]}>
              {/* Report Type Bar */}
              <ReportTypeBar />
              
              {/* Safe content area */}
              <View style={PDFStyles.safeContentArea}>
                {/* Detailed breakdown title */}
                <Text style={mergedStyles.detailedBreakdownTitle}>
                  Detailed breakdown of all Examiners
                </Text>
                <View style={mergedStyles.horizontalLine} />
                
                {/* Examiner ID Heading */}
                <Text style={mergedStyles.examinerIdHeading}>
                  <Text style={{ color: '#003366' }}>Examiner {examinerIndex + 1}: </Text>
                  <Text style={mergedStyles.examinerIdNumber}>{getExaminerCustomId()}</Text>
                </Text>
                
                {/* Examiner Overview Box */}
                <Text style={mergedStyles.sectionTitle}>Examiner Overview:</Text>
                <View style={[mergedStyles.examinerOverviewBox, { marginBottom: 25 }]}>
                  <View style={mergedStyles.overviewRow}>
                    <Text style={mergedStyles.overviewLabel}>Full Name:</Text>
                    <Text style={mergedStyles.overviewValue}>
                      {examiner.examiner?.full_name || examiner.examiner?.name || 'Unknown'}
                    </Text>
          </View>
          
                  <View style={mergedStyles.overviewRow}>
                    <Text style={mergedStyles.overviewLabel}>Examiner ID:</Text>
                    <Text style={mergedStyles.overviewValue}>
                      {examiner.examiner?.examiner_id || examiner.examiner_id || 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={mergedStyles.overviewRow}>
                    <Text style={mergedStyles.overviewLabel}>Department:</Text>
                    <Text style={mergedStyles.overviewValue}>
                      {examiner.examiner?.department || examiner.department || 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={mergedStyles.overviewRow}>
                    <Text style={mergedStyles.overviewLabel}>Position:</Text>
                    <Text style={mergedStyles.overviewValue}>
                      {examiner.examiner?.position || 'General Secretary'}
                    </Text>
                  </View>
                </View>
                
                <View style={[mergedStyles.horizontalLine, { marginBottom: 25 }]} />
                
                {/* Calculation Summary */}
                <Text style={mergedStyles.sectionTitle}>Calculation Summary:</Text>
                <View style={[mergedStyles.calcSummaryTable, { marginBottom: 30 }]}>
                  {/* Total Calculations */}
                  <View style={mergedStyles.calcSummaryRow}>
                    <Text style={mergedStyles.calcSummaryLabelCell}>Total Calculations</Text>
                    <Text style={mergedStyles.calcSummaryValueCell}>{calculations.length}</Text>
                  </View>
                  
                  {/* Total Evaluation Days */}
                  <View style={mergedStyles.calcSummaryRow}>
                    <Text style={mergedStyles.calcSummaryLabelCell}>Total Evaluation Days</Text>
                    <Text style={mergedStyles.calcSummaryValueCell}>{totalEvalDays}</Text>
                  </View>
                  
                  {/* Total Staffs */}
                  <View style={mergedStyles.calcSummaryRow}>
                    <Text style={mergedStyles.calcSummaryLabelCell}>Total Staffs</Text>
                    <Text style={mergedStyles.calcSummaryValueCell}>{totalStaff}</Text>
                  </View>
                  
                  {/* Total Papers */}
                  <View style={mergedStyles.calcSummaryRow}>
                    <Text style={mergedStyles.calcSummaryLabelCell}>Total Papers</Text>
                    <Text style={mergedStyles.calcSummaryValueCell}>{totalPapers}</Text>
                  </View>
                  
                  {/* Base Salary */}
                  <View style={mergedStyles.calcSummaryRow}>
                    <Text style={mergedStyles.calcSummaryLabelCell}>Total Base Salary</Text>
                    <Text style={mergedStyles.calcSummaryValueCell}>
                      {formatIndianCurrency(baseSalary)}
                    </Text>
                  </View>
                  
                  {/* Incentive */}
                  <View style={mergedStyles.calcSummaryRow}>
                    <Text style={mergedStyles.calcSummaryLabelCell}>
                      Total Incentive (10%)
                    </Text>
                    <Text style={mergedStyles.calcSummaryValueCell}>
                      {formatIndianCurrency(incentiveAmount)}
                    </Text>
                  </View>
                  
                  {/* Total Final Amount */}
                  <View style={[mergedStyles.calcSummaryRow, mergedStyles.totalFinalRow, { borderBottomWidth: 0 }]}>
                    <Text style={[mergedStyles.calcSummaryLabelCell, mergedStyles.totalFinalLabel]}>
                      Total Final Amount
                    </Text>
                    <Text style={[mergedStyles.calcSummaryValueCell, mergedStyles.totalFinalValue]}>
                      {formatIndianCurrency(totalAmount)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Footer Spacer */}
              <FooterSpacer />
              
              {/* Page Footer */}
              <PageFooter
                reportType="MERGED REPORT"
                pageNumber={pageNumber}
                totalPages={totalPages}
              />
            </Page>
            
            {/* Add Calculations Details on a new page */}
            {calculations.length > 0 && (
              <Page 
                size="A4" 
                style={[mergedStyles.page, PDFStyles.page]}
              >
                {/* Report Type Bar */}
                <ReportTypeBar />
                
                {/* Safe content area */}
                <View style={PDFStyles.safeContentArea}>
                  {/* New centered title */}
                  <Text style={[mergedStyles.detailedBreakdownTitle, { textAlign: 'center', fontSize: 16 }]}>
                    Summary breakdown of all calculations
                  </Text>
                  <View style={mergedStyles.horizontalLine} />
                  
                  {/* Changed subtitle */}
                  <Text style={[mergedStyles.sectionTitle, { marginTop: 15 }]}>
                    Summary Table of All Calculations
                  </Text>
                  
                  {/* Table with blue headers */}
                  <View style={[PDFStyles.tableContainer, { border: '1pt solid #cccccc', marginTop: 10 }]}>
                    {/* Updated table header with blue background and Total Days column */}
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '8%'}}>No.</Text>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '18%'}}>Date</Text>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '18%'}}>Calc ID</Text>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '12%'}}>Total Days</Text>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '12%'}}>Staff</Text>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '12%'}}>Papers</Text>
                      <Text style={{...mergedStyles.summaryTableHeader, width: '20%'}}>Amount</Text>
                  </View>
                  
                    {calculations.map((calc, calcIndex) => (
              <View 
                        key={`calc-row-${calcIndex}`} 
                style={[
                          { flexDirection: 'row' },
                          calcIndex % 2 === 0 ? { backgroundColor: '#f9f9f9' } : { backgroundColor: 'white' }
                ]}
              >
                        <Text style={{width: '8%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>{calcIndex + 1}</Text>
                        <Text style={{width: '18%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>
                          {formatDate(calc.created_at, 'dateOnly')}
                      </Text>
                        <Text style={{width: '18%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>
                          {getCustomCalcId(calc, calcIndex)}
                      </Text>
                        <Text style={{width: '12%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>
                          {calc.total_days || calc.evaluationDays?.length || 0}
                        </Text>
                        <Text style={{width: '12%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>{calc.total_staff || 0}</Text>
                        <Text style={{width: '12%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>{calc.total_papers || 0}</Text>
                        <Text style={{width: '20%', padding: '5pt', textAlign: 'center', border: '0.5pt solid #cccccc'}}>
                        {formatCurrency(calc.final_amount || calc.total_amount)}
                </Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Footer Spacer */}
              <FooterSpacer />
              
              {/* Page Footer */}
              <PageFooter
                reportType="MERGED REPORT"
                  pageNumber={pageNumber + 1}
                  totalPages={totalPages + 1}  // Increment total pages to account for the new page
              />
            </Page>
            )}
            
            {/* Calculation Detail Pages */}
            {calculations.map((calculation, calcIndex) => {
              const detailPageNumber = pageNumber + calcIndex + 1;
              // Use pre-processed staff details from the calculation
              const staffDetails = calculation.processedStaffDetails || [];
              
              // Sort staff details by date
              const sortedStaffDetails = [...staffDetails].sort((a, b) => 
                new Date(a.evaluationDate) - new Date(b.evaluationDate)
              );
              
                      // Group staff by evaluation date
                      const staffByDate = {};
              sortedStaffDetails.forEach(staff => {
                        const date = staff.evaluationDate;
                        if (!staffByDate[date]) {
                          staffByDate[date] = [];
                        }
                        staffByDate[date].push(staff);
                      });
                      
                      // Sort dates for ordered display
                      const sortedDates = Object.keys(staffByDate).sort((a, b) => new Date(a) - new Date(b));
                      
                      // Create evaluation summary
                      const evaluationSummary = sortedDates.map(date => {
                        const staffForDate = staffByDate[date];
                        return {
                          date: date,
                          staffCount: staffForDate.length,
                  totalPapers: staffForDate.reduce((sum, staff) => 
                    sum + (parseInt(staff.papersEvaluated) || 0), 0)
                        };
                      });
                      
              // Calculate totals
              const totalDays = evaluationSummary.length;
              const totalStaff = calculation.total_staff || 0;
              const totalPapers = calculation.total_papers || 0;
              const totalAmount = parseFloat(calculation.final_amount || calculation.total_amount || 0);
              const baseSalary = totalAmount * 0.9; // 90% base salary
              const incentive = totalAmount * 0.1; // 10% incentive
              
              // Fix dateRange unused variable
              // eslint-disable-next-line no-unused-vars
              const dateRange = sortedDates.length > 0 ? 
                `${formatDate(sortedDates[0], 'dateOnly')} - ${formatDate(sortedDates[sortedDates.length-1], 'dateOnly')}` : 
                'N/A';
              
              return (
                <React.Fragment key={`calc-pages-${examinerIndex}-${calcIndex}`}>
                  {/* First page with Evaluation Summary */}
                  <Page 
                    key={`calc-detail-page-${examinerIndex}-${calcIndex}`} 
                    size="A4" 
                    style={[mergedStyles.page, PDFStyles.page]}
                  >
                    {/* Report Type Bar */}
                    <ReportTypeBar />
                    
                    {/* Safe content area */}
                    <View style={PDFStyles.safeContentArea}>
                      {/* Main title */}
                      <Text style={mergedStyles.calculationBreakdownTitle}>
                        Calculation breakdown For each Calculation
                      </Text>
                      <View style={mergedStyles.horizontalLine} />
                      
                      {/* Calculation ID Heading */}
                      <Text style={mergedStyles.calculationIdHeading}>
                        <Text style={{ color: '#003366' }}>Calculation {calcIndex + 1}: </Text>
                        <Text style={{ color: '#92400E' }}>{getCustomCalcId(calculation, calcIndex)}</Text>
                      </Text>
                      
                      {/* Calculation Details */}
                      <Text style={mergedStyles.sectionTitle}>Calculation Details</Text>
                      
                      {/* Details table */}
                      <View style={mergedStyles.calculationDetailsTable}>
                        {/* Evaluation Days */}
                        <View style={mergedStyles.calculationDetailsRow}>
                          <Text style={mergedStyles.calculationDetailsLabelCell}>Evaluation Days:</Text>
                          <Text style={mergedStyles.calculationDetailsValueCell}>{totalDays}</Text>
                        </View>
                        
                        {/* Total Staff */}
                        <View style={mergedStyles.calculationDetailsRow}>
                          <Text style={mergedStyles.calculationDetailsLabelCell}>Total Staff:</Text>
                          <Text style={mergedStyles.calculationDetailsValueCell}>{totalStaff}</Text>
                        </View>
                        
                        {/* Total Papers */}
                        <View style={mergedStyles.calculationDetailsRow}>
                          <Text style={mergedStyles.calculationDetailsLabelCell}>Total Papers:</Text>
                          <Text style={mergedStyles.calculationDetailsValueCell}>{totalPapers}</Text>
                        </View>
                        
                        {/* Base Salary */}
                        <View style={mergedStyles.calculationDetailsRow}>
                          <Text style={mergedStyles.calculationDetailsLabelCell}>Base Salary:</Text>
                          <Text style={mergedStyles.calculationDetailsValueCell}>
                            {formatIndianCurrency(baseSalary)}
                          </Text>
                        </View>
                        
                        {/* Incentive */}
                        <View style={mergedStyles.calculationDetailsRow}>
                          <Text style={mergedStyles.calculationDetailsLabelCell}>Incentive:</Text>
                          <Text style={mergedStyles.calculationDetailsValueCell}>
                            {formatIndianCurrency(incentive)}
                          </Text>
                        </View>
                        
                        {/* Final Amount */}
                        <View style={[mergedStyles.calculationDetailsRow, mergedStyles.calculationFinalRow, { borderBottomWidth: 0 }]}>
                          <Text style={[mergedStyles.calculationDetailsLabelCell, mergedStyles.calculationFinalLabel]}>
                            Final Amount:
                          </Text>
                          <Text style={[mergedStyles.calculationDetailsValueCell, mergedStyles.calculationFinalValue]}>
                            {formatIndianCurrency(totalAmount)}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Horizontal Divider */}
                      <View style={mergedStyles.horizontalLine} />
                      
                      {/* Detailed Calculation Breakdown */}
                      <Text style={mergedStyles.detailedBreakdownSubtitle}>
                        Detailed Calculation Breakdown
                      </Text>
                      
                      {/* Horizontal Divider */}
                      <View style={mergedStyles.horizontalLine} />
                      
                      {/* Evaluation Summary */}
                      <Text style={mergedStyles.evaluationSummaryTitle}>
                        <Text style={{ color: '#003366' }}>A. Evaluation Summary: </Text>
                        <Text style={{ color: '#92400E' }}>{sortedDates.length > 0 ? 
                          `${formatDate(sortedDates[0], 'monthDayYear')} - ${formatDate(sortedDates[sortedDates.length-1], 'monthDayYear')}` : 
                          'N/A'}
                        </Text>
                      </Text>
                      
                      {/* Evaluation Summary Table */}
                      <View style={[PDFStyles.tableContainer, { border: '1pt solid #003366', marginBottom: 20 }]}>
                        <View style={{ flexDirection: 'row' }}>
                          <Text style={{
                            backgroundColor: '#003366',
                            color: 'white',
                            padding: 5,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: 10,
                            width: '33.33%',
                            border: '1pt solid #003366'
                          }}>DATE</Text>
                          <Text style={{
                            backgroundColor: '#003366',
                            color: 'white',
                            padding: 5,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: 10,
                            width: '33.33%',
                            border: '1pt solid #003366'
                          }}>TOTAL STAFFS</Text>
                          <Text style={{
                            backgroundColor: '#003366',
                            color: 'white',
                            padding: 5,
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: 10,
                            width: '33.33%',
                            border: '1pt solid #003366'
                          }}>TOTAL PAPERS</Text>
                        </View>
                        
                        {/* Evaluation Days Detail */}
                        {evaluationSummary.map((day, idx) => (
                          <View 
                            key={`eval-day-${idx}`}
                            style={[
                              { flexDirection: 'row' },
                              idx % 2 === 0 ? { backgroundColor: '#ffffff' } : { backgroundColor: '#f9f9f9' }
                            ]}
                          >
                            <Text style={{
                              width: '33.33%',
                              padding: 5,
                              textAlign: 'center',
                              fontSize: 10,
                              border: '0.5pt solid #cccccc'
                            }}>
                              {formatDate(day.date, 'dateOnly')}
                            </Text>
                            <Text style={{
                              width: '33.33%',
                              padding: 5,
                              textAlign: 'center',
                              fontSize: 10,
                              border: '0.5pt solid #cccccc'
                            }}>
                              {day.staffCount || 0}
                            </Text>
                            <Text style={{
                              width: '33.33%',
                              padding: 5,
                              textAlign: 'center',
                              fontSize: 10,
                              border: '0.5pt solid #cccccc'
                            }}>
                              {day.totalPapers || 0}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    
                    {/* Footer Spacer */}
                    <FooterSpacer />
                
                    {/* Page Footer */}
                    <PageFooter
                      reportType="MERGED REPORT"
                      pageNumber={detailPageNumber}
                      totalPages={totalPages}
                    />
                  </Page>
                  
                  {/* Staff Evaluation Details on a new page */}
                  <Page 
                    key={`calc-detail-staff-page-${examinerIndex}-${calcIndex}`} 
                    size="A4" 
                    style={[mergedStyles.page, PDFStyles.page]}
                  >
                    {/* Report Type Bar */}
                    <ReportTypeBar />
                    
                    {/* Safe content area */}
                    <View style={PDFStyles.safeContentArea}>
                      {/* Staff Evaluation Details Section */}
                      <Text style={mergedStyles.staffEvaluationTitle}>
                        <Text style={{ color: '#003366' }}>B. Staff Evaluation details</Text>
                      </Text>
                      
                      {/* Staff Evaluation Tables for each day */}
                      {sortedDates.map((date, dateIndex) => {
                        const staffForDate = staffByDate[date] || [];
                        const totalPapersForDay = staffForDate.reduce((sum, staff) => 
                          sum + (parseInt(staff.papersEvaluated) || 0), 0);
                          
                        return (
                          <View key={`staff-day-${dateIndex}`} style={{ marginBottom: 20 }}>
                            {/* Title for each day */}
                            <Text style={{ fontSize: 10, marginBottom: 5, marginLeft: 5 }}>
                              Staff Evaluation Table for {formatDate(date, 'monthDayYear')}
                            </Text>
                            
                            {/* Staff Table */}
                            <View style={mergedStyles.staffTable}>
                              {/* Table Header */}
                              <View style={{ flexDirection: 'row' }}>
                                <Text style={{...mergedStyles.staffTableHeader, width: '20%'}}>S.No</Text>
                                <Text style={{...mergedStyles.staffTableHeader, width: '50%'}}>Staff Name</Text>
                                <Text style={{...mergedStyles.staffTableHeader, width: '30%'}}>Papers Evaluated</Text>
                              </View>
                              
                              {/* Table Rows */}
                              {staffForDate.map((staff, staffIndex) => (
                                <View 
                                  key={`staff-${dateIndex}-${staffIndex}`} 
                                  style={{ flexDirection: 'row' }}
                                >
                                  <Text style={{...mergedStyles.staffTableCell, width: '20%'}}>{String(staffIndex + 1).padStart(2, '0')}</Text>
                                  <Text style={{...mergedStyles.staffTableCell, width: '50%', textAlign: 'left', paddingLeft: 10}}>
                                    {staff.staffName}
                                  </Text>
                                  <Text style={{...mergedStyles.staffTableCell, width: '30%'}}>
                                    {staff.papersEvaluated || '00'}
                                  </Text>
                                </View>
                              ))}
                            </View>
                            
                            {/* Subtotal */}
                            <Text style={mergedStyles.subtotalRow}>
                              <Text style={mergedStyles.subtotalDate}>Subtotal ({formatDate(date, 'monthDay')}): </Text>
                              <Text style={mergedStyles.subtotalPapers}>{totalPapersForDay} papers</Text>
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    
                    {/* Footer Spacer */}
                    <FooterSpacer />
                
                    {/* Page Footer */}
                    <PageFooter
                      reportType="MERGED REPORT"
                      pageNumber={detailPageNumber + 1}
                      totalPages={totalPages}
                    />
                  </Page>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </Document>
  );
};

// ExaminerSummaryTable Component with pagination
const ExaminerSummaryTable = ({ examiners }) => {
  if (!examiners || examiners.length === 0) return null;
  
  // Display all examiners in a single view - don't limit rows per page
  // We will let the PDF automatically handle page breaks as needed
  const allExaminers = examiners;
  
  // Table header style with blue background like in image 2
  const tableHeaderStyle = {
    backgroundColor: '#003366', // Dark blue background
    color: 'white',
    fontWeight: 'bold',
    padding: '8pt 6pt',  // Increased vertical padding for better alignment
    borderWidth: 1,
    borderColor: '#003366',
    borderStyle: 'solid',
    textAlign: 'center',
    fontSize: 11,
    verticalAlign: 'middle', // Ensure vertical centering
  };
  
  // Regular cell style with borders
  const tableCellStyle = {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderStyle: 'solid',
    padding: 6,
    fontSize: 11,
  };
  
  return (
    <View style={mergedStyles.tableContainer}>
      {/* Table header with new styling */}
      <View style={{ flexDirection: 'row', backgroundColor: '#003366' }}>
        <Text style={{...tableHeaderStyle, width: '8%'}}>S.No</Text>
        <Text style={{...tableHeaderStyle, width: '22%', textAlign: 'left'}}>Examiners</Text>
        <Text style={{...tableHeaderStyle, width: '20%', textAlign: 'left'}}>Department</Text>
        <Text style={{...tableHeaderStyle, width: '10%'}}>Calc.</Text>
        <Text style={{...tableHeaderStyle, width: '10%'}}>Staffs</Text>
        <Text style={{...tableHeaderStyle, width: '10%'}}>Papers</Text>
        <Text style={{...tableHeaderStyle, width: '20%'}}>Total Amount</Text>
          </View>
          
      {/* Table body - show all examiners */}
      {allExaminers.map((examiner, index) => {
        // Make sure we have the right examiner data structure
        const examinerObj = examiner.examiner || examiner;
        const examinerName = examinerObj.full_name || examinerObj.name || "Unknown";
        const examinerDept = examinerObj.department || "N/A";
        
            const totalPapers = examiner.calculations.reduce((sum, calc) => 
              sum + (parseInt(calc.total_papers) || 0), 0);
            
        const totalStaff = examiner.calculations.reduce((sum, calc) => 
          sum + (parseInt(calc.total_staff) || 0), 0);
        
            const totalAmount = examiner.calculations.reduce((sum, calc) => 
          sum + (parseFloat(calc.final_amount || calc.total_amount) || 0), 0);
            
            return (
              <View 
            key={`examiner-row-${index}`} 
                style={[
              { flexDirection: 'row' }, 
              index % 2 === 0 ? { backgroundColor: '#f9f9f9' } : { backgroundColor: 'white' }
                ]}
              >
            <Text style={{...tableCellStyle, width: '8%', textAlign: 'center'}}>
              {index + 1}
                </Text>
            <Text style={{...tableCellStyle, width: '22%', textAlign: 'left'}}>
              {examinerName}
                </Text>
            <Text style={{...tableCellStyle, width: '20%', textAlign: 'left'}}>
              {examinerDept}
                </Text>
            <Text style={{...tableCellStyle, width: '10%', textAlign: 'center'}}>
                  {examiner.calculations.length}
                </Text>
            <Text style={{...tableCellStyle, width: '10%', textAlign: 'center'}}>
              {totalStaff}
            </Text>
            <Text style={{...tableCellStyle, width: '10%', textAlign: 'center'}}>
                  {totalPapers}
                </Text>
            <Text style={{...tableCellStyle, width: '20%', textAlign: 'center'}}>
                  {formatCurrency(totalAmount)}
                </Text>
              </View>
            );
          })}
          
      {/* Total row */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5' }}>
        <Text style={{...tableCellStyle, width: '8%', textAlign: 'center', fontWeight: 'bold'}}>
                Total
              </Text>
        <Text style={{...tableCellStyle, width: '22%', textAlign: 'left'}}></Text>
        <Text style={{...tableCellStyle, width: '20%', textAlign: 'left'}}></Text>
        <Text style={{...tableCellStyle, width: '10%', textAlign: 'center', fontWeight: 'bold'}}>
                {examiners.reduce((sum, examiner) => sum + examiner.calculations.length, 0)}
              </Text>
        <Text style={{...tableCellStyle, width: '10%', textAlign: 'center', fontWeight: 'bold'}}>
          {examiners.reduce((sum, examiner) => 
            sum + examiner.calculations.reduce((calcSum, calc) => 
              calcSum + (parseInt(calc.total_staff) || 0), 0), 0)
          }
        </Text>
        <Text style={{...tableCellStyle, width: '10%', textAlign: 'center', fontWeight: 'bold'}}>
                {examiners.reduce((sum, examiner) => 
                  sum + examiner.calculations.reduce((calcSum, calc) => 
                    calcSum + (parseInt(calc.total_papers) || 0), 0), 0)
                }
              </Text>
        <Text style={{...tableCellStyle, width: '20%', textAlign: 'center', fontWeight: 'bold'}}>
                {formatCurrency(
                  examiners.reduce((sum, examiner) => 
                    sum + examiner.calculations.reduce((calcSum, calc) => 
                calcSum + (parseFloat(calc.final_amount || calc.total_amount) || 0), 0), 0)
                )}
              </Text>
            </View>
    </View>
  );
};

export default MergedReportPDF; 