import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';
import { 
  CollegeHeader, 
  PageFooter, 
  ReportTypeBar,
  FooterSpacer
} from './ReportComponents';
import { 
  formatDate, 
  formatCurrency,
  extractEvaluationData
} from './PDFUtils';

// Create dynamic page background style
const pageBackground = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    position: 'relative',
  }
});

// Create custom styles for this report
const customStyles = StyleSheet.create({
  examinerOverviewTitle: {
    color: '#003366',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  examinerDetailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    border: '1px solid #e0e0e0',
  },
  examinerDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  examinerDetailLabel: {
    color: '#003366',
    fontSize: 13,
    fontWeight: 'bold',
    width: '40%',
    whiteSpace: 'nowrap',
  },
  examinerDetailValue: {
    fontSize: 13,
    flex: 1,
    paddingLeft: 20,
  },
  evalSummaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
  },
  evalSummaryDate: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#000000',
  },
  calculationSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 15,
    marginBottom: 10,
  },
  summaryTable: {
    width: '100%',
    marginBottom: 20,
    border: '1px solid #000000',
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
  },
  summaryLabelCell: {
    backgroundColor: '#f4f4f4',
    padding: 8,
    width: '60%',
    fontWeight: 'bold',
    color: '#003366',
    fontSize: 13,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    borderRightStyle: 'solid',
  },
  summaryValueCell: {
    padding: 8,
    width: '40%',
    textAlign: 'right',
    fontSize: 13,
  },
  finalAmountRow: {
    flexDirection: 'row',
    borderBottomWidth: 0,
  },
  finalAmountLabel: {
    backgroundColor: '#f4f4f4',
    padding: 8,
    width: '60%',
    fontWeight: 'bold',
    color: '#003366',
    fontSize: 14,
    borderRightWidth: 1,
    borderRightColor: '#000000',
    borderRightStyle: 'solid',
  },
  finalAmountValue: {
    padding: 8,
    width: '40%',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#e53935', // red color
    fontSize: 14,
  },
  detailTableContainer: {
    width: '100%',
    marginBottom: 15,
  },
  fixedWidthTable: {
    width: '100%',
    marginTop: 5,
    tableLayout: 'fixed',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#003366',
    color: 'white',
    borderWidth: 0.5,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  tableHeaderCell: {
    color: 'white',
    fontWeight: 'bold',
    padding: 5,
    fontSize: 11,
    textAlign: 'center',
    borderWidth: 0.5,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f9f9f9',
  },
  tableCell: {
    padding: 5,
    fontSize: 11,
    borderWidth: 0.5,
    borderColor: '#000000',
    borderStyle: 'solid',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginVertical: 10,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
    marginVertical: 15,
  },
  staffTableTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 10,
    marginBottom: 5,
  },
  subtotalText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 5,
    marginBottom: 15,
  }
});

// PDF Component for Individual Examiner Report (Per Calculation)
const IndividualExaminerReportPDF = ({ examiner, calculation, staffDetails = [] }) => {
  // Process staff details from calculation if not provided directly
  const processedStaffDetails = staffDetails.length > 0 
    ? staffDetails 
    : extractEvaluationData(calculation).staffDetails;
  
  // Group staff by evaluation date for the table
  const staffByDate = {};
    processedStaffDetails.forEach(staff => {
    const date = staff.evaluationDate;
    if (!staffByDate[date]) {
      staffByDate[date] = [];
    }
    staffByDate[date].push(staff);
  });
  
  // Sort dates for ordered display
  const sortedDates = Object.keys(staffByDate).sort((a, b) => new Date(a) - new Date(b));

  // Create evaluation summary for Section A
  const evaluationSummary = sortedDates.map(date => {
    const staffForDate = staffByDate[date];
    return {
      date: date,
      staffCount: staffForDate.length,
      totalPapers: staffForDate.reduce((sum, staff) => sum + (parseInt(staff.papersEvaluated) || 0), 0)
    };
  });

  // Get evaluation days count from the actual dates processed
  const evaluationDaysCount = sortedDates.length;

  // Calculate total pages needed (dynamically based on content)
  // First page is for overview, second page for evaluation summary, and additional pages for staff tables
  const totalPages = 2 + sortedDates.length; // Approximate - one page per date's staff table

  // Function to render staff table for specific date
  const renderStaffTableForDate = (date, staff) => {
    const totalPapers = staff.reduce((sum, s) => sum + (parseInt(s.papersEvaluated) || 0), 0);
    
    return (
      <View style={{ width: '100%', marginBottom: 20 }} wrap={false}>
        <Text style={customStyles.staffTableTitle}>Staff Evaluation Table for {formatDate(date, 'dateOnly')}</Text>
        <View style={customStyles.fixedWidthTable}>
          <View style={customStyles.tableHeader}>
            <Text style={[customStyles.tableHeaderCell, { width: '10%' }]}>S.No</Text>
            <Text style={[customStyles.tableHeaderCell, { width: '60%' }]}>Staff Name</Text>
            <Text style={[customStyles.tableHeaderCell, { width: '30%' }]}>Papers Evaluated</Text>
          </View>
          {staff.map((s, idx) => (
            <View 
              key={`staff-${date}-${idx}`}
              style={[
                customStyles.tableRow,
                idx % 2 === 0 ? customStyles.tableRowEven : customStyles.tableRowOdd
              ]}
            >
              <Text style={[customStyles.tableCell, { width: '10%' }]}>
                {(idx + 1).toString().padStart(2, '0')}
              </Text>
              <Text style={[customStyles.tableCell, { width: '60%', textAlign: 'left', paddingLeft: 10 }]}>
                {s.staffName}
              </Text>
              <Text style={[customStyles.tableCell, { width: '30%' }]}>
                {s.papersEvaluated || 0}
              </Text>
            </View>
          ))}
        </View>
        <Text style={customStyles.subtotalText}>
          Subtotal ({formatDate(date, 'dateOnly')}): {totalPapers} papers
        </Text>
      </View>
    );
  };

  // Main document rendering
  return (
    <Document>
      {/* First Page - Examiner Overview and Calculation Summary */}
      <Page size="A4" style={[pageBackground.page, PDFStyles.page]}>
        {/* College Header */}
        <CollegeHeader />

        {/* Report Type Bar */}
        <ReportTypeBar />

        {/* Report Title */}
        <Text style={PDFStyles.individualReportTitle}>Individual Examiner Calculation Report</Text>
        
        {/* Examiner Details Section */}
        <View style={PDFStyles.safeContentArea}>
          {/* Examiner Overview Section */}
          <Text style={customStyles.examinerOverviewTitle}>Examiner Overview:</Text>
          
          <View style={customStyles.examinerDetailsContainer}>
            <View style={customStyles.examinerDetailRow}>
              <Text style={customStyles.examinerDetailLabel}>Full Name:</Text>
              <Text style={customStyles.examinerDetailValue}>{examiner.full_name || examiner.name || 'Unknown'}</Text>
            </View>
            
            <View style={customStyles.examinerDetailRow}>
              <Text style={customStyles.examinerDetailLabel}>Examiner ID:</Text>
              <Text style={customStyles.examinerDetailValue}>{examiner.examiner_id || examiner.id || 'N/A'}</Text>
            </View>
            
            <View style={customStyles.examinerDetailRow}>
              <Text style={customStyles.examinerDetailLabel}>Department:</Text>
              <Text style={customStyles.examinerDetailValue}>{examiner.department || 'N/A'}</Text>
            </View>
            
            <View style={customStyles.examinerDetailRow}>
              <Text style={customStyles.examinerDetailLabel}>Position:</Text>
              <Text style={customStyles.examinerDetailValue}>{examiner.position || 'N/A'}</Text>
            </View>
            
            <View style={customStyles.examinerDetailRow}>
              <Text style={customStyles.examinerDetailLabel}>Report Generated:</Text>
              <Text style={customStyles.examinerDetailValue}>{new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              }) + " at " + new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</Text>
            </View>
          </View>

          {/* Calculation Summary Section */}
          <Text style={customStyles.calculationSummaryTitle}>Calculation Summary</Text>
          <View style={customStyles.summaryTable}>
            <View style={customStyles.summaryRow}>
              <Text style={customStyles.summaryLabelCell}>Evaluation Days:</Text>
              <Text style={customStyles.summaryValueCell}>{evaluationDaysCount}</Text>
            </View>
            <View style={customStyles.summaryRow}>
              <Text style={customStyles.summaryLabelCell}>Total Staff:</Text>
              <Text style={customStyles.summaryValueCell}>{calculation.total_staff || processedStaffDetails.length || 0}</Text>
            </View>
            <View style={customStyles.summaryRow}>
              <Text style={customStyles.summaryLabelCell}>Total Papers:</Text>
              <Text style={customStyles.summaryValueCell}>{calculation.total_papers || evaluationSummary.reduce((sum, day) => sum + (day.totalPapers || 0), 0)}</Text>
            </View>
            <View style={customStyles.summaryRow}>
              <Text style={customStyles.summaryLabelCell}>Base Salary:</Text>
              <Text style={customStyles.summaryValueCell}>{formatCurrency(calculation.base_salary)}</Text>
            </View>
            <View style={customStyles.summaryRow}>
              <Text style={customStyles.summaryLabelCell}>Incentive:</Text>
              <Text style={customStyles.summaryValueCell}>{formatCurrency(calculation.incentive || calculation.incentive_amount)}</Text>
            </View>
            <View style={customStyles.finalAmountRow}>
              <Text style={customStyles.finalAmountLabel}>Final Amount:</Text>
              <Text style={customStyles.finalAmountValue}>{formatCurrency(calculation.final_amount || calculation.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Footer Spacer to prevent overlap */}
        <FooterSpacer />

        {/* Page Footer */}
        <PageFooter 
          reportType="INDIVIDUAL REPORT" 
          pageNumber={1} 
          totalPages={totalPages} 
        />
      </Page>

      {/* Second Page - Evaluation Summary */}
      <Page size="A4" style={[pageBackground.page, PDFStyles.page]}>
        <View style={PDFStyles.safeContentArea}>
          {/* Calculation Breakdown Title */}
          <Text style={{
            fontSize: 20,
            color: '#003366',
            fontWeight: 'bold',
            textAlign: 'center',
            marginVertical: 15,
          }}>
            Detailed Calculation Breakdown
          </Text>
          
          <View style={customStyles.sectionDivider} />
          
          {/* Section A: Evaluation Summary */}
          <View style={{width: '100%'}}>
            {/* Evaluation period dates */}
            {sortedDates.length > 0 && (
              <View style={{ flexDirection: 'row', marginVertical: 10 }}>
                <Text style={customStyles.evalSummaryLabel}>
                  A. Evaluation Summary:{' '}
                </Text>
                <Text style={customStyles.evalSummaryDate}>
                  {formatDate(sortedDates[0], 'monthDay')} - {formatDate(sortedDates[sortedDates.length - 1], 'withYear')}
              </Text>
              </View>
            )}
            
            {evaluationSummary.length > 0 ? (
              <View style={customStyles.detailTableContainer}>
                <View style={customStyles.fixedWidthTable}>
                  <View style={customStyles.tableHeader}>
                    <Text style={[customStyles.tableHeaderCell, { width: '33.33%' }]}>DATE</Text>
                    <Text style={[customStyles.tableHeaderCell, { width: '33.33%' }]}>TOTAL STAFFS</Text>
                    <Text style={[customStyles.tableHeaderCell, { width: '33.33%' }]}>TOTAL PAPERS</Text>
                </View>
                
                {evaluationSummary.map((day, idx) => (
                  <View 
                    key={`eval-day-${idx}`}
                    style={[
                        customStyles.tableRow,
                        idx % 2 === 0 ? customStyles.tableRowEven : customStyles.tableRowOdd
                    ]}
                  >
                      <Text style={[customStyles.tableCell, { width: '33.33%' }]}>
                      {formatDate(day.date, 'dateOnly')}
                    </Text>
                      <Text style={[customStyles.tableCell, { width: '33.33%' }]}>
                      {day.staffCount || 0}
                    </Text>
                      <Text style={[customStyles.tableCell, { width: '33.33%' }]}>
                      {day.totalPapers || 0}
                    </Text>
                  </View>
                ))}
                </View>
              </View>
            ) : (
              <Text>No evaluation data available</Text>
            )}
          </View>
          
          <View style={customStyles.sectionDivider} />
          
          {/* Section B: Staff Evaluation details */}
          <View style={{width: '100%'}}>
            <Text style={customStyles.sectionTitle}>
              B. Staff Evaluation details
            </Text>
          </View>
          
          {/* Render the first staff table if available */}
          {sortedDates.length > 0 && (
            renderStaffTableForDate(sortedDates[0], staffByDate[sortedDates[0]])
          )}
        </View>

        {/* Footer Spacer to prevent overlap */}
        <FooterSpacer />

        {/* Page Footer */}
        <PageFooter 
          reportType="INDIVIDUAL REPORT" 
          pageNumber={2} 
          totalPages={totalPages} 
        />
      </Page>

      {/* Additional pages for remaining staff tables */}
      {sortedDates.slice(1).map((date, index) => (
        <Page 
          key={`staff-page-${index + 1}`} 
          size="A4" 
          style={[pageBackground.page, PDFStyles.page]}
        >
          <View style={PDFStyles.safeContentArea}>
            {/* Continue Staff Evaluation details */}
            {renderStaffTableForDate(date, staffByDate[date])}
          </View>
          
          {/* Footer Spacer to prevent overlap */}
          <FooterSpacer />
          
          {/* Page Footer */}
          <PageFooter 
            reportType="INDIVIDUAL REPORT" 
            pageNumber={index + 3} 
            totalPages={totalPages} 
          />
        </Page>
      ))}
    </Document>
  );
};

export default IndividualExaminerReportPDF; 