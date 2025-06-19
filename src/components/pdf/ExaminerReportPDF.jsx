import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';
import {
  CollegeHeader,
  PageFooter,
  FooterSpacer,
  ReportTypeBar,
  SectionTitle
} from './ReportComponents';
import {
  formatCurrency,
  formatDate,
  getCustomCalcId,
  calculateTotals,
  extractEvaluationData
} from './PDFUtils';
import { processCalculationData } from './MergedReportPDF';

// Create styles for the examiner report
const examinerStyles = StyleSheet.create({
  page: {
    paddingVertical: 30,
    backgroundColor: 'white',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#15803D',
    padding: 8,
    borderRadius: '4pt',
    marginTop: 2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#92400E',
    borderBottom: '1px solid #15803D',
    paddingBottom: 3,
  },
  examinerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
    color: '#15803D',
    backgroundColor: '#D8F5E5',
    padding: 5,
    borderRadius: '4pt',
  },
  detailedBreakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 10,
  },
  horizontalLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#003366',
    borderBottomStyle: 'solid',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    marginVertical: 10,
  },
  calcSummaryTable: {
    border: '1px solid #cccccc',
    borderRadius: '0pt',
  },
  calcSummaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
  },
  calcSummaryLabelCell: {
    padding: 8,
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#cccccc',
    borderRightStyle: 'solid',
    width: '70%',
    fontSize: 12,
  },
  calcSummaryValueCell: {
    padding: 8,
    width: '30%',
    textAlign: 'right',
    fontSize: 12,
  },
  totalFinalRow: {
    backgroundColor: '#fffde7', // light yellow
  },
  totalFinalLabel: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  totalFinalValue: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  examinerOverviewBox: {
    border: '1px solid #cccccc',
    borderRadius: '5pt',
    padding: 10,
    marginBottom: 15,
  },
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
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
  summaryTableHeader: {
    backgroundColor: '#003366',
    color: 'white',
    fontWeight: 'bold',
    padding: '5pt 4pt',  // Reduced padding
    border: '1pt solid #003366',
    fontSize: 10,
    textAlign: 'center',
  },
  calculationBreakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 10,
  },
  calculationIdHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'left',
  },
  calculationDetailsTable: {
    marginTop: 15,
    marginBottom: 20,
    border: '1pt solid #cccccc',
  },
  calculationDetailsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
  },
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
  calculationDetailsValueCell: {
    padding: 8,
    width: '30%',
    textAlign: 'right',
    fontSize: 12,
  },
  detailedBreakdownSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#003366',
    textAlign: 'center',
    marginTop: 25,
    marginBottom: 10,
  },
  calculationFinalRow: {
    backgroundColor: '#fffde7', // light yellow
  },
  calculationFinalLabel: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  calculationFinalValue: {
    color: '#d32f2f', // red
    fontWeight: 'bold',
  },
  evaluationSummaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 10,
    marginBottom: 10,
  },
  staffEvaluationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#003366',
    marginTop: 20,
    marginBottom: 10,
  },
  staffTable: {
    marginBottom: 15,
  },
  staffTableHeader: {
    backgroundColor: '#003366',
    color: 'white',
    padding: 5,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 10,
    border: '1pt solid #003366',
  },
  staffTableCell: {
    padding: 5,
    textAlign: 'center',
    fontSize: 10,
    border: '0.5pt solid #cccccc',
  },
  subtotalRow: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 5,
    marginLeft: 5,
  },
  subtotalDate: {
    color: '#003366',
  },
  subtotalPapers: {
    color: '#92400E',
  },
});

const ExaminerHistoryReportPDF = ({ examiner, calculations = [] }) => {
  const processedCalculations = calculations.map(processCalculationData);
  const sortedCalculations = [...processedCalculations].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const totals = calculateTotals(sortedCalculations);
  const totalPages = 2 + (sortedCalculations.length * 2);

  const customStyles = {
    detailedBreakdownTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#003366',
      textAlign: 'center',
      marginBottom: 10,
    },
    horizontalLine: {
      borderBottomWidth: 1,
      borderBottomColor: '#003366',
      borderBottomStyle: 'solid',
      marginVertical: 10,
    },
  };

  return (
    <Document>
      {/* Page 1 - Overview + Summary */}
      <Page size="A4" style={PDFStyles.page}>
        <CollegeHeader />
        <Text style={PDFStyles.examinerReportTitle}>Individual Examiner Complete Calculation Report</Text>
        <View style={PDFStyles.safeContentArea}>
          <Text style={PDFStyles.sectionTitle}>Examiner Overview:</Text>
          <View style={PDFStyles.detailBox}>
            <Text>Full Name: {examiner.full_name}</Text>
            <Text>Examiner ID: {examiner.examiner_id}</Text>
            <Text>Department: {examiner.department}</Text>
            <Text>Position: {examiner.position || 'N/A'}</Text>
            <Text>Report Generated: {formatDate(new Date(), 'fullDate')}</Text>
          </View>
          <SectionTitle title="Summary of All Calculations" />
          <View style={PDFStyles.summaryGrid}>
            <Text>Total Calculations: {totals.count}</Text>
            <Text>Total Evaluation Days: {totals.evalDays}</Text>
            <Text>Total Staff: {totals.staff}</Text>
            <Text>Total Papers: {totals.papers}</Text>
            <Text>Total Base Salary: {formatCurrency(totals.baseSalary)}</Text>
            <Text>Total Incentive: {formatCurrency(totals.incentive)}</Text>
            <Text>Total Final Amount: {formatCurrency(totals.finalAmount)}</Text>
          </View>
        </View>
        <FooterSpacer />
        <PageFooter reportType="EXAMINER REPORT" pageNumber={1} totalPages={totalPages} />
      </Page>

      {/* Page 2 - Summary Breakdown */}
      <Page size="A4" style={PDFStyles.page}>
        <View style={PDFStyles.safeContentArea}>
          <Text style={customStyles.detailedBreakdownTitle}>Summary breakdown of all calculations</Text>
          <View style={customStyles.horizontalLine} />
          
          <Text style={[PDFStyles.sectionTitle, { marginTop: 15 }]}>Summary Table of All Calculations</Text>
          <View style={PDFStyles.tableContainer}>
            <View style={PDFStyles.tableHeaderRow}>
              <Text style={PDFStyles.tableHeaderCell}>No.</Text>
              <Text style={PDFStyles.tableHeaderCell}>Date</Text>
              <Text style={PDFStyles.tableHeaderCell}>Calc ID</Text>
              <Text style={PDFStyles.tableHeaderCell}>Total Days</Text>
              <Text style={PDFStyles.tableHeaderCell}>Staff</Text>
              <Text style={PDFStyles.tableHeaderCell}>Papers</Text>
              <Text style={PDFStyles.tableHeaderCell}>Amount</Text>
            </View>
            {sortedCalculations.map((calc, index) => {
              const totalDays = calc.total_days || 
                (calc.evaluationDays && Array.isArray(calc.evaluationDays) ? calc.evaluationDays.length : 0) ||
                (calc.calculation_days && Array.isArray(calc.calculation_days) ? calc.calculation_days.length : 0) || 0;
              
              return (
                <View key={index} style={PDFStyles.tableRow}>
                  <Text style={PDFStyles.tableCell}>{index + 1}</Text>
                  <Text style={PDFStyles.tableCell}>{formatDate(calc.created_at, 'dateOnly')}</Text>
                  <Text style={PDFStyles.tableCell}>{getCustomCalcId(calc, index)}</Text>
                  <Text style={PDFStyles.tableCell}>{totalDays}</Text>
                  <Text style={PDFStyles.tableCell}>{calc.total_staff || 0}</Text>
                  <Text style={PDFStyles.tableCell}>{calc.total_papers || 0}</Text>
                  <Text style={PDFStyles.tableCell}>{formatCurrency(calc.final_amount || calc.total_amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <FooterSpacer />
        <PageFooter reportType="EXAMINER REPORT" pageNumber={2} totalPages={totalPages} />
      </Page>

      {/* Calculation Detail Pages */}
      {sortedCalculations.map((calc, index) => {
        const { evaluationSummary, staffDetails } = extractEvaluationData(calc);
        const pageNumber = 3 + index * 2;
        const calcId = getCustomCalcId(calc, index);

        return (
          <React.Fragment key={`calc-${index}`}>
            {/* Calculation Summary Page */}
            <Page size="A4" style={PDFStyles.page}>
              <View style={PDFStyles.safeContentArea}>
                <Text style={customStyles.detailedBreakdownTitle}>Calculation breakdown For each Calculation</Text>
                <View style={customStyles.horizontalLine} />
                <Text style={PDFStyles.sectionTitle}>Calculation {index + 1}: {calcId}</Text>
                <View style={PDFStyles.detailBox}>
                  <Text>Evaluation Days: {
                    calc.total_days || 
                    (calc.evaluationDays && Array.isArray(calc.evaluationDays) ? calc.evaluationDays.length : 0) ||
                    (calc.calculation_days && Array.isArray(calc.calculation_days) ? calc.calculation_days.length : 0) || 0
                  }</Text>
                  <Text>Total Staff: {calc.total_staff || 0}</Text>
                  <Text>Total Papers: {calc.total_papers || 0}</Text>
                  <Text>Base Salary: {formatCurrency(calc.base_salary || 0)}</Text>
                  <Text>Incentive: {formatCurrency(calc.incentive || calc.incentive_amount || 0)}</Text>
                  <Text>Final Amount: {formatCurrency(calc.final_amount || calc.total_amount || 0)}</Text>
                </View>
                <View style={customStyles.horizontalLine} />
                <Text style={PDFStyles.sectionTitle}>A. Evaluation Summary</Text>
                <View style={PDFStyles.tableContainer}>
                  <View style={PDFStyles.tableHeaderRow}>
                    <Text style={PDFStyles.tableHeaderCell}>Date</Text>
                    <Text style={PDFStyles.tableHeaderCell}>Staff Count</Text>
                    <Text style={PDFStyles.tableHeaderCell}>Papers</Text>
                  </View>
                  {evaluationSummary.map((day, i) => (
                    <View key={i} style={PDFStyles.tableRow}>
                      <Text style={PDFStyles.tableCell}>{formatDate(day.date, 'dateOnly')}</Text>
                      <Text style={PDFStyles.tableCell}>{day.staffCount}</Text>
                      <Text style={PDFStyles.tableCell}>{day.totalPapers}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <FooterSpacer />
              <PageFooter reportType="EXAMINER REPORT" pageNumber={pageNumber} totalPages={totalPages} />
            </Page>

            {/* Staff Evaluation Table Page */}
            <Page size="A4" style={PDFStyles.page}>
              <View style={PDFStyles.safeContentArea}>
                <Text style={PDFStyles.sectionTitle}>B. Staff Evaluation Table</Text>
                <View style={PDFStyles.tableContainer}>
                  <View style={PDFStyles.tableHeaderRow}>
                    <Text style={PDFStyles.tableHeaderCell}>Date</Text>
                    <Text style={PDFStyles.tableHeaderCell}>Staff Name</Text>
                    <Text style={PDFStyles.tableHeaderCell}>Papers</Text>
                  </View>
                  {staffDetails.map((staff, i) => (
                    <View key={i} style={PDFStyles.tableRow}>
                      <Text style={PDFStyles.tableCell}>{formatDate(staff.evaluationDate, 'dateOnly')}</Text>
                      <Text style={PDFStyles.tableCell}>{staff.staffName}</Text>
                      <Text style={PDFStyles.tableCell}>{staff.papersEvaluated}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <FooterSpacer />
              <PageFooter reportType="EXAMINER REPORT" pageNumber={pageNumber + 1} totalPages={totalPages} />
            </Page>
          </React.Fragment>
        );
      })}
    </Document>
  );
};

export default ExaminerHistoryReportPDF;
