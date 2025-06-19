import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';
import { formatCurrency, formatDate } from './PDFUtils';

// College Header Component - used in all reports
export const CollegeHeader = () => (
  <View style={PDFStyles.section}>
    <View style={PDFStyles.enhancedHeader}>
      <Image 
        src="/images/logo_gnc.png" 
        style={PDFStyles.headerLogo} 
      />
      <View style={PDFStyles.headerText}>
        <Text style={PDFStyles.headerTitle}>GURU NANAK COLLEGE (AUTONOMOUS)</Text>
        <Text style={PDFStyles.headerAffiliation}>
          Affiliated to University of Madras | Accredited 'A++' Grade by NAAC
        </Text>
        <Text style={PDFStyles.headerSubtitle}>
          CONTROLLER OF EXAMINATIONS (COE)
        </Text>
      </View>
    </View>
    <View style={{borderBottomWidth: 1, borderBottomColor: '#000000', borderBottomStyle: 'solid', marginVertical: 5}}></View>
  </View>
);

// Report Title Component
export const ReportTitle = ({ title }) => (
  <Text style={PDFStyles.centeredHeading}>{title}</Text>
);

// Page Footer Component - consistent across all reports
export const PageFooter = ({ reportType, pageNumber, totalPages }) => (
  <View style={PDFStyles.footer} fixed>
    <View style={PDFStyles.footerContent}>
      <View style={PDFStyles.footerTextGenerated}>
        <Text style={PDFStyles.footerGeneratedText}>Generated via</Text>
        <Text style={{...PDFStyles.footerExaminerText, marginLeft: 2}}>examiner</Text>
        <Text style={PDFStyles.footerProText}>pro</Text>
      </View>
      <Text style={PDFStyles.footerText}>
        GURU NANAK COLLEGE • CONTROLLER OF EXAMINATIONS (COE) AUTOMATION SYSTEM
      </Text>
      <View style={PDFStyles.footerPageInfo}>
        <Text style={PDFStyles.footerPageText}>{reportType}</Text>
        <View style={PDFStyles.footerBar} />
        <Text style={PDFStyles.footerPageNumber}>{pageNumber} of {totalPages}</Text>
      </View>
    </View>
  </View>
);

// Examiner Details Block Component
export const ExaminerDetailsBlock = ({ examiner }) => (
  <View style={[PDFStyles.detailsContainer, PDFStyles.nonBreakingSection]}>
    <Text style={PDFStyles.sectionLabel}>{examiner.full_name || examiner.name || 'Unknown'}</Text>
    <View style={PDFStyles.detailsRow}>
      <Text style={PDFStyles.detailsLabel}>ID:</Text>
      <Text style={PDFStyles.detailsValue}>{examiner.examiner_id || examiner.id || 'N/A'}</Text>
    </View>
    <View style={PDFStyles.detailsRow}>
      <Text style={PDFStyles.detailsLabel}>Department:</Text>
      <Text style={PDFStyles.detailsValue}>{examiner.department || 'N/A'}</Text>
    </View>
    {examiner.position && (
      <View style={PDFStyles.detailsRow}>
        <Text style={PDFStyles.detailsLabel}>Position:</Text>
        <Text style={PDFStyles.detailsValue}>{examiner.position}</Text>
      </View>
    )}
  </View>
);

// Calculation Summary Component
export const CalculationSummary = ({ calculation, withBorders = false, style = {} }) => (
  <View style={[PDFStyles.summaryGrid, PDFStyles.nonBreakingSection, withBorders ? style : {}]}>
    <View style={PDFStyles.summaryItem}>
      <Text style={PDFStyles.summaryLabel}>Evaluation Days:</Text>
      <Text style={PDFStyles.summaryValue}>{calculation.calculation_days?.length || 0}</Text>
    </View>
    <View style={PDFStyles.summaryItem}>
      <Text style={PDFStyles.summaryLabel}>Total Staff:</Text>
      <Text style={PDFStyles.summaryValue}>{calculation.total_staff || 0}</Text>
    </View>
    <View style={PDFStyles.summaryItem}>
      <Text style={PDFStyles.summaryLabel}>Total Papers:</Text>
      <Text style={PDFStyles.summaryValue}>{calculation.total_papers || 0}</Text>
    </View>
    <View style={PDFStyles.summaryItem}>
      <Text style={PDFStyles.summaryLabel}>Base Salary:</Text>
      <Text style={PDFStyles.summaryValue}>{formatCurrency(calculation.base_salary)}</Text>
    </View>
    <View style={PDFStyles.summaryItem}>
      <Text style={PDFStyles.summaryLabel}>Incentive:</Text>
      <Text style={PDFStyles.summaryValue}>{formatCurrency(calculation.incentive || calculation.incentive_amount)}</Text>
    </View>
    <View style={PDFStyles.summaryItemFinal}>
      <Text style={PDFStyles.finalSummaryLabel}>Final Amount:</Text>
      <Text style={PDFStyles.finalSummaryValue}>{formatCurrency(calculation.final_amount || calculation.total_amount)}</Text>
    </View>
  </View>
);

// Staff Evaluation Table Component
export const StaffEvaluationTable = ({ 
  staffDetails, 
  showDate = true, 
  maxRowsPerPage = 20,
  keepDateGroupsTogether = true, // New parameter to control date group behavior
  withBorders = false
}) => {
  if (!staffDetails || staffDetails.length === 0) return null;
  
  // Group staff by evaluation date
  const staffByDate = {};
  staffDetails.forEach(staff => {
    const date = staff.evaluationDate;
    if (!staffByDate[date]) {
      staffByDate[date] = [];
    }
    staffByDate[date].push(staff);
  });
  
  // Sort dates for ordered display
  const sortedDates = Object.keys(staffByDate).sort((a, b) => new Date(a) - new Date(b));
  
  // Border styles
  const borderStyle = withBorders ? {
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
  } : {};
  
  const cellWithBorders = withBorders ? {
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
    padding: 5,
  } : {};
  
  return (
    <>
      {sortedDates.map((date, dateIndex) => {
        const staffForDate = staffByDate[date];
        const formattedDate = formatDate(date, 'dateOnly');
        const subtotalPapers = staffForDate.reduce((sum, staff) => sum + (parseInt(staff.papersEvaluated) || 0), 0);
        
        // Use break attribute to allow natural page breaks (no wrap={false} or breakInside:'avoid')
        return (
          <View key={`date-group-${dateIndex}`} style={{marginBottom: 10, width: '100%'}}>
            <Text style={{fontSize: 13, marginBottom: 5, marginTop: dateIndex > 0 ? 15 : 0}}>
              Staff Evaluation Table for {formattedDate}
            </Text>
            
            <View style={{flexDirection: 'row'}}>
              {/* Sidebar container */}
              <View style={PDFStyles.sidebarContainer}>
                <View style={PDFStyles.staffSideBar} />
              </View>
              
              {/* Table content */}
              <View style={{flex: 1}}>
                <View style={[PDFStyles.tableContainer, withBorders ? borderStyle : {}]}>
                  <View style={PDFStyles.tableHeader}>
                    <Text style={{...PDFStyles.tableCell, ...(withBorders ? cellWithBorders : {}), flex: 0.5}}>S.No</Text>
                    <Text style={{...PDFStyles.tableCell, ...(withBorders ? cellWithBorders : {}), flex: 2}}>Staff Name</Text>
                    <Text style={{...PDFStyles.tableCell, ...(withBorders ? cellWithBorders : {}), flex: 1}}>Papers Evaluated</Text>
                  </View>
                  
                  {/* Divide staff entries into chunks to allow page breaks between chunks */}
                  {chunk(staffForDate, 5).map((staffChunk, chunkIndex) => (
                    <View key={`chunk-${dateIndex}-${chunkIndex}`} style={{ width: '100%' }}>
                      {staffChunk.map((staff, staffIndex) => {
                        const actualIndex = chunkIndex * 5 + staffIndex;
                        return (
                          <View 
                            key={`staff-${dateIndex}-${actualIndex}`}
                            style={[
                              PDFStyles.tableRow, 
                              actualIndex % 2 === 0 ? PDFStyles.tableRowEven : PDFStyles.tableRowOdd
                            ]}
                          >
                            <Text style={{...PDFStyles.tableCell, ...(withBorders ? cellWithBorders : {}), flex: 0.5}}>
                              {(actualIndex + 1).toString().padStart(2, '0')}
                            </Text>
                            <Text style={{...PDFStyles.tableCellLeft, ...(withBorders ? cellWithBorders : {}), flex: 2}}>
                              {staff.staffName}
                            </Text>
                            <Text style={{...PDFStyles.tableCell, ...(withBorders ? cellWithBorders : {}), flex: 1}}>
                              {staff.papersEvaluated || '00'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
                
                {/* Subtotal for this date */}
                <View style={PDFStyles.subtotalRow}>
                  <Text style={PDFStyles.subtotalLabel}>
                    Subtotal ({formattedDate}):
                  </Text>
                  <Text style={PDFStyles.subtotalValue}>
                    {subtotalPapers} papers
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
};

// Helper function to divide arrays into chunks for pagination
const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Section Title Component - used to ensure section titles don't break across pages
export const SectionTitle = ({ title }) => (
  <View style={PDFStyles.nonBreakingSection}>
    <Text style={PDFStyles.sectionLabel}>{title}</Text>
  </View>
);

// Report Type Bar - visual separator for all reports
export const ReportTypeBar = () => (
  <View style={{height: 1, backgroundColor: '#000000', marginBottom: 8}} />
);

// Footer Spacer - to prevent content from flowing into footer
export const FooterSpacer = () => (
  <View style={PDFStyles.footerSpacer} fixed />
);

// Page Break Component - explicit page break
export const PageBreak = () => (
  <View style={PDFStyles.pageBreak} />
);

// Creating a new component for calculation summary box
export const CalculationDetailSummary = ({ calculation, withBorders = false }) => {
  // Format the evaluation dates range if available
  const dateRange = 
    calculation.calculation_days && calculation.calculation_days.length > 0 
      ? `${formatDate(calculation.calculation_days[0]?.date, 'dateOnly')}` 
      : 'N/A';

  return (
    <View style={[PDFStyles.calculationDetailSummaryBox, withBorders ? {
      borderWidth: 1, 
      borderColor: '#000000', 
      borderStyle: 'solid'
    } : {}]}>
      <View style={PDFStyles.calcSummaryRow}>
        <Text style={PDFStyles.calcSummaryLabel}>Date Range</Text>
        <Text style={PDFStyles.calcSummaryValue}>: {dateRange}</Text>
      </View>
      <View style={PDFStyles.calcSummaryRow}>
        <Text style={PDFStyles.calcSummaryLabel}>Total Staff</Text>
        <Text style={PDFStyles.calcSummaryValue}>: {calculation.total_staff || 0}</Text>
      </View>
      <View style={PDFStyles.calcSummaryRow}>
        <Text style={PDFStyles.calcSummaryLabel}>Total Papers</Text>
        <Text style={PDFStyles.calcSummaryValue}>: {calculation.total_papers || 0}</Text>
      </View>
      <View style={PDFStyles.calcSummaryRow}>
        <Text style={PDFStyles.calcSummaryLabel}>Base Salary</Text>
        <Text style={PDFStyles.calcSummaryValue}>: {formatCurrency(calculation.base_salary)}</Text>
      </View>
      <View style={PDFStyles.calcSummaryRow}>
        <Text style={PDFStyles.calcSummaryLabel}>Incentive ({calculation.incentive_percentage || 10}%)</Text>
        <Text style={PDFStyles.calcSummaryValue}>: {formatCurrency(calculation.incentive || calculation.incentive_amount)}</Text>
      </View>
      <View style={PDFStyles.calcSummaryRow}>
        <Text style={PDFStyles.calcSummaryLabelFinal}>Final Amount</Text>
        <Text style={PDFStyles.calcSummaryValueFinal}>: {formatCurrency(calculation.final_amount || calculation.total_amount)}</Text>
      </View>
    </View>
  );
}; 