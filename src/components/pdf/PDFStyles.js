import { StyleSheet } from '@react-pdf/renderer';

// Common styles for all PDF reports
const PDFStyles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontSize: 12,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Poppins'
  },
  section: { 
    marginBottom: 20 
  },
  heading: { 
    fontSize: 18, 
    fontWeight: 700, 
    fontFamily: 'Poppins',
    marginBottom: 10,
    color: '#333333'
  },
  subheading: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'Poppins',
    marginBottom: 8,
    color: '#444444'
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 4,
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    height: 24,
    fontFamily: 'Poppins'
  },
  tableRowEven: {
    backgroundColor: '#F9F9F9'
  },
  tableRowOdd: {
    backgroundColor: '#FFFFFF'
  },
  tableHeader: {
    backgroundColor: '#E4E4E4',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    height: 30,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Poppins'
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    padding: '0 5px'
  },
  tableCellLeft: {
    flex: 1,
    textAlign: 'left',
    fontSize: 10,
    padding: '0 5px'
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
    padding: '0 5px'
  },
  label: { 
    fontWeight: 700,
    fontFamily: 'Poppins',
    width: '40%'
  },
  value: {
    width: '60%'
  },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  summaryLabel: {
    fontWeight: 600,
    fontFamily: 'Poppins'
  },
  summaryValue: {
    fontWeight: 400
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666666',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    borderTopStyle: 'solid',
    paddingTop: 10
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginRight: 10
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#EEEEEE',
    borderBottomStyle: 'solid',
    paddingBottom: 10
  },
  headerText: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: 'Poppins',
    color: '#333333'
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#333333',
    borderTopStyle: 'solid',
    paddingTop: 5,
    fontWeight: 700,
    fontFamily: 'Poppins',
    marginTop: 5
  }
});

export default PDFStyles; 