import { StyleSheet } from '@react-pdf/renderer';
import { PAGE_LAYOUT } from './PDFUtils';

// Common styles for all PDF reports
const PDFStyles = StyleSheet.create({
  page: { 
    padding: 0,
    paddingTop: PAGE_LAYOUT.MARGINS.TOP,
    paddingBottom: PAGE_LAYOUT.MARGINS.BOTTOM + PAGE_LAYOUT.FOOTER_HEIGHT,
    paddingLeft: PAGE_LAYOUT.MARGINS.LEFT,
    paddingRight: PAGE_LAYOUT.MARGINS.RIGHT,
    fontSize: 11,
    fontFamily: 'Poppins',
    backgroundColor: '#ffffff',
    // Linear gradient background effect (simulated with solid color)
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
  },
  section: { 
    marginBottom: 15,
    paddingHorizontal: 0
  },
  // College header styles
  enhancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLogo: {
    width: 80,
    height: 80,
    marginRight: 15,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: 700,
    fontFamily: 'Poppins',
    color: '#003366',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerAffiliation: {
    fontSize: 11.5,
    fontFamily: 'Poppins',
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13.8,
    fontWeight: 600,
    fontFamily: 'Poppins',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Report title style - generic for backwards compatibility
  centeredHeading: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Poppins',
    marginTop: 8,
    marginBottom: 8,
    color: '#f4f4f4',
    textAlign: 'center',
    padding: 6,
    backgroundColor: '#003366',
    borderRadius: 4,
  },
  // New Report Title Styles with specific colors
  individualReportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#D6E8FF', // Soft Blue
    color: '#1D4ED8', // Primary Blue
    borderRadius: 5,
    textTransform: 'none',
    whiteSpace: 'nowrap', // Prevent line breaks
  },
  examinerReportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#D8F5E5', // Soft Green
    color: '#15803D', // Success Green
    borderRadius: 5,
    textTransform: 'none',
    whiteSpace: 'nowrap', // Prevent line breaks
  },
  mergedReportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#FFF5CC', // Soft Yellow
    color: '#92400E', // Amber Brown
    borderRadius: 5,
    textTransform: 'none',
    whiteSpace: 'nowrap', // Prevent line breaks
  },
  customReportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#F4E8FF', // Soft Lavender
    color: '#7C3AED', // Elegant Purple
    borderRadius: 5,
    textTransform: 'none',
    whiteSpace: 'nowrap', // Prevent line breaks
  },
  // Section headings
  sectionLabel: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Poppins',
    marginBottom: 10,
    color: '#003366',
  },
  // Horizontal divider
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
    marginVertical: 10,
    marginHorizontal: 0,
  },
  // Examiner details container
  detailsContainer: {
    backgroundColor: '#f4f4f4',
    padding: 12,
    borderRadius: 4,
    marginBottom: 15,
  },
  detailsRow: { 
    flexDirection: 'row', 
    marginBottom: 8,
    padding: 4
  },
  detailsLabel: { 
    fontWeight: 700,
    fontFamily: 'Poppins',
    width: '30%',
    color: '#003366',
    fontSize: 11,
  },
  detailsValue: {
    width: '70%',
    color: '#000000',
    fontSize: 11,
    fontFamily: 'Poppins',
  },
  // Calculation summary table
  summaryGrid: {
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  summaryLabel: {
    fontWeight: 500,
    fontFamily: 'Poppins',
    color: '#003366',
    fontSize: 13,
    backgroundColor: '#f4f4f4',
    padding: 8,
    width: '60%',
  },
  summaryValue: {
    fontWeight: 500,
    color: '#000000',
    textAlign: 'right',
    fontSize: 13,
    fontFamily: 'Poppins',
    backgroundColor: '#ffffff',
    padding: 8,
    width: '40%',
  },
  summaryItemFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finalSummaryLabel: {
    fontWeight: 700,
    fontFamily: 'Poppins',
    color: '#003366',
    fontSize: 14,
    backgroundColor: '#f4f4f4',
    padding: 8,
    width: '60%',
  },
  finalSummaryValue: {
    fontWeight: 700,
    fontFamily: 'Poppins',
    color: '#ce4945',
    textAlign: 'right',
    fontSize: 14,
    backgroundColor: '#ffffff',
    padding: 8,
    width: '40%',
  },
  // Detailed breakdown title
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'Poppins',
    color: '#003366',
    letterSpacing: 0.5,
    marginBottom: 15,
    marginTop: 25,
  },
  // Evaluation summary section
  subsectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'Poppins',
    marginBottom: 8,
    color: '#003366',
  },
  subsectionDate: {
    fontSize: 15,
    fontWeight: 500,
    fontFamily: 'Poppins',
    color: '#333333',
  },
  // Tables
  tableContainer: {
    marginTop: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'solid',
  },
  tableHeader: {
    backgroundColor: '#003366',
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'Poppins',
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    minHeight: 28,
    fontFamily: 'Poppins',
  },
  tableRowEven: {
    backgroundColor: '#f4f4f4',
  },
  tableRowOdd: {
    backgroundColor: '#FFFFFF',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    padding: '5px 8px',
  },
  tableCellLeft: {
    flex: 1,
    textAlign: 'left',
    fontSize: 11,
    padding: '5px 8px',
  },
  // Staff evaluation section
  staffSection: {
    marginTop: 10,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'Poppins',
    marginBottom: 8,
    color: '#333333',
  },
  staffSideBar: {
    width: 2,
    backgroundColor: '#a6a6a6',
    marginLeft: 10,
    marginRight: 15,
    height: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  // Container for sidebar to control positioning
  sidebarContainer: {
    width: 27,
    position: 'relative',
    alignSelf: 'stretch',
    minHeight: 50,
  },
  // Subtotal row
  subtotalRow: {
    flexDirection: 'row',
    marginTop: 5,
    marginBottom: 15,
  },
  subtotalLabel: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'Poppins',
    color: '#003366',
  },
  subtotalValue: {
    fontSize: 11,
    fontFamily: 'Poppins',
    color: '#333333',
    marginLeft: 5,
  },
  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    paddingHorizontal: PAGE_LAYOUT.MARGINS.LEFT,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'solid',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  footerTextGenerated: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '22%',
    justifyContent: 'flex-start',
  },
  footerGeneratedText: {
    fontSize: 8,
    color: '#666666',
    marginRight: 3,
    fontFamily: 'Poppins',
  },
  footerExaminerText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 0,
    fontFamily: 'Poppins',
  },
  footerProText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0066cc',
    fontFamily: 'Poppins',
  },
  footerText: {
    fontSize: 5.5,
    color: '#666666',
    textAlign: 'center',
    width: '56%',
    fontFamily: 'Poppins',
  },
  footerPageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '20%',
    justifyContent: 'flex-end',
  },
  footerPageText: {
    fontSize: 8,
    color: '#000000',
    fontFamily: 'Poppins',
  },
  footerBar: {
    height: 12,
    width: 1,
    backgroundColor: '#000000',
    marginHorizontal: 8,
  },
  footerPageNumber: {
    fontSize: 8,
    color: '#000000',
    fontFamily: 'Poppins',
  },
  // Footer spacer to prevent overlap with content
  footerSpacer: {
    height: 30,
    marginTop: 2,
  },
  // Page break component
  pageBreak: {
    height: 0,
    width: '100%',
    pageBreakAfter: 'always',
  },
  // Keep together component
  keepTogether: {
    width: '100%',
  },
  // Table with pagination support
  paginatedTable: {
    width: '100%',
    marginBottom: 0, // Reduced margin for better pagination
  },
  // Section that shouldn't be split across pages
  nonBreakingSection: {
    width: '100%',
    breakInside: 'avoid',
    pageBreakInside: 'avoid', // Redundant property for better compatibility
    marginBottom: 10, // Reduced
  },
  // Table that should never be split (e.g., date-grouped staff tables)
  nonBreakingTable: {
    width: '100%',
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    marginBottom: 3, // Reduced
  },
  // Safe content area (won't overflow into footer)
  safeContentArea: {
    width: '100%',
    minHeight: 1,
    maxHeight: PAGE_LAYOUT.PAGE_SIZE.HEIGHT - PAGE_LAYOUT.MARGINS.TOP - PAGE_LAYOUT.MARGINS.BOTTOM - 40 + 15, // Updated to match new footer height
    overflow: 'hidden',
  },
  // Calculation Detail Summary Box
  calculationDetailSummaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
    maxWidth: '100%',
  },
  calcSummaryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calcSummaryLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#4B5563',
    width: 110,
  },
  calcSummaryValue: {
    fontSize: 12,
    fontWeight: 400,
    color: '#111827',
    flex: 1,
  },
  calcSummaryLabelFinal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    width: 110,
  },
  calcSummaryValueFinal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#DC2626', // Red color for final amount
    flex: 1,
  },
  // Calculation Title
  calculationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 10,
    marginBottom: 5,
    padding: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    textAlign: 'center',
  },
});

export default PDFStyles; 