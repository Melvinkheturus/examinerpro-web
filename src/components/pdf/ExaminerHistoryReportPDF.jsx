import React from 'react';
import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';

// Helper function to format currency
const formatCurrency = (amount) => {
  return `₹${parseFloat(amount || 0).toFixed(2)}`;
};

// Helper function to calculate totals
const calculateTotals = (calculations) => {
  if (!calculations || !calculations.length) return { papers: 0, baseSalary: 0, incentive: 0, finalAmount: 0 };
  
  return calculations.reduce((totals, calc) => {
    return {
      papers: totals.papers + (parseInt(calc.total_papers) || 0),
      baseSalary: totals.baseSalary + (parseFloat(calc.base_salary) || 0),
      incentive: totals.incentive + (parseFloat(calc.incentive || calc.incentive_amount) || 0),
      finalAmount: totals.finalAmount + (parseFloat(calc.final_amount || calc.total_amount) || 0)
    };
  }, { papers: 0, baseSalary: 0, incentive: 0, finalAmount: 0 });
};

// PDF Component for Examiner Full History Report
const ExaminerHistoryReportPDF = ({ examiner, calculations = [] }) => {
  const totals = calculateTotals(calculations);
  
  return (
    <Document>
      <Page size="A4" style={PDFStyles.page} wrap>
        {/* Header */}
        <View style={PDFStyles.header}>
          <Image 
            src="/images/logo_gnc.png" 
            style={PDFStyles.headerLogo} 
          />
          <View style={PDFStyles.headerText}>
            <Text style={PDFStyles.headerTitle}>Examiner Full Salary History</Text>
            <Text style={PDFStyles.headerSubtitle}>
              Generated on: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Examiner Profile Section */}
        <View style={PDFStyles.section}>
          <Text style={PDFStyles.heading}>Examiner Profile</Text>
          <View style={PDFStyles.row}>
            <Text style={PDFStyles.label}>Name:</Text>
            <Text style={PDFStyles.value}>{examiner?.full_name || examiner?.name || 'N/A'}</Text>
          </View>
          <View style={PDFStyles.row}>
            <Text style={PDFStyles.label}>ID:</Text>
            <Text style={PDFStyles.value}>{examiner?.examiner_id || examiner?.id || 'N/A'}</Text>
          </View>
          <View style={PDFStyles.row}>
            <Text style={PDFStyles.label}>Department:</Text>
            <Text style={PDFStyles.value}>{examiner?.department || 'N/A'}</Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={PDFStyles.section}>
          <Text style={PDFStyles.heading}>Summary of All Calculations</Text>
          <View style={PDFStyles.summaryBox}>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Calculations:</Text>
              <Text style={PDFStyles.summaryValue}>{calculations.length}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Papers Evaluated:</Text>
              <Text style={PDFStyles.summaryValue}>{totals.papers}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Base Salary:</Text>
              <Text style={PDFStyles.summaryValue}>{formatCurrency(totals.baseSalary)}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Incentives:</Text>
              <Text style={PDFStyles.summaryValue}>{formatCurrency(totals.incentive)}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Amount Paid:</Text>
              <Text style={PDFStyles.summaryValue}>{formatCurrency(totals.finalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Calculation History Table */}
        <View style={PDFStyles.section}>
          <Text style={PDFStyles.heading}>Calculation History</Text>
          
          {/* Table Headers */}
          <View style={PDFStyles.tableHeader}>
            <Text style={{...PDFStyles.tableCell, flex: 1.5}}>Date</Text>
            <Text style={PDFStyles.tableCell}>Papers</Text>
            <Text style={PDFStyles.tableCell}>Staff</Text>
            <Text style={PDFStyles.tableCell}>Base Salary</Text>
            <Text style={PDFStyles.tableCell}>Incentive</Text>
            <Text style={PDFStyles.tableCell}>Final Amount</Text>
          </View>
          
          {/* Table Rows */}
          {calculations.map((calc, index) => (
            <View 
              key={`calc-${index}`} 
              style={[
                PDFStyles.tableRow, 
                index % 2 === 0 ? PDFStyles.tableRowEven : PDFStyles.tableRowOdd
              ]}
            >
              <Text style={{...PDFStyles.tableCellLeft, flex: 1.5}}>
                {calc.created_at ? new Date(calc.created_at).toLocaleDateString() : 'N/A'}
              </Text>
              <Text style={PDFStyles.tableCell}>{calc.total_papers || 0}</Text>
              <Text style={PDFStyles.tableCell}>{calc.total_staff || 0}</Text>
              <Text style={PDFStyles.tableCellRight}>{formatCurrency(calc.base_salary)}</Text>
              <Text style={PDFStyles.tableCellRight}>{formatCurrency(calc.incentive || calc.incentive_amount)}</Text>
              <Text style={PDFStyles.tableCellRight}>{formatCurrency(calc.final_amount || calc.total_amount)}</Text>
            </View>
          ))}
          
          {/* Total Row */}
          <View style={PDFStyles.totalRow}>
            <Text style={{...PDFStyles.tableCellLeft, flex: 1.5}}>Total</Text>
            <Text style={PDFStyles.tableCell}>{totals.papers}</Text>
            <Text style={PDFStyles.tableCell}>-</Text>
            <Text style={PDFStyles.tableCellRight}>{formatCurrency(totals.baseSalary)}</Text>
            <Text style={PDFStyles.tableCellRight}>{formatCurrency(totals.incentive)}</Text>
            <Text style={PDFStyles.tableCellRight}>{formatCurrency(totals.finalAmount)}</Text>
          </View>
        </View>
        
        {/* Footer */}
        <View style={PDFStyles.footer} fixed>
          <Text>Generated by ExaminerPro | Page 1 of 1</Text>
          <Text>GURU NANAK COLLEGE (AUTONOMOUS) - CONTROLLER OF EXAMINATIONS</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ExaminerHistoryReportPDF; 