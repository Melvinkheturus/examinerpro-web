import React from 'react';
import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';

// PDF Component for Individual Examiner Report (Per Calculation)
const IndividualExaminerReportPDF = ({ examiner, calculation, staffDetails = [] }) => (
  <Document>
    <Page size="A4" style={PDFStyles.page}>
      {/* Header */}
      <View style={PDFStyles.header}>
        <Image 
          src="/images/logo_gnc.png" 
          style={PDFStyles.headerLogo} 
        />
        <View style={PDFStyles.headerText}>
          <Text style={PDFStyles.headerTitle}>Individual Examiner Calculation Report</Text>
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
        <Text style={PDFStyles.heading}>Calculation Summary</Text>
        <View style={PDFStyles.summaryBox}>
          <View style={PDFStyles.summaryItem}>
            <Text style={PDFStyles.summaryLabel}>Calculation Date:</Text>
            <Text style={PDFStyles.summaryValue}>
              {calculation?.created_at ? new Date(calculation.created_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={PDFStyles.summaryItem}>
            <Text style={PDFStyles.summaryLabel}>Total Papers:</Text>
            <Text style={PDFStyles.summaryValue}>{calculation?.total_papers || 0}</Text>
          </View>
          <View style={PDFStyles.summaryItem}>
            <Text style={PDFStyles.summaryLabel}>Total Staff:</Text>
            <Text style={PDFStyles.summaryValue}>{calculation?.total_staff || 0}</Text>
          </View>
          <View style={PDFStyles.summaryItem}>
            <Text style={PDFStyles.summaryLabel}>Base Salary:</Text>
            <Text style={PDFStyles.summaryValue}>₹{calculation?.base_salary || 0}</Text>
          </View>
          <View style={PDFStyles.summaryItem}>
            <Text style={PDFStyles.summaryLabel}>Incentive:</Text>
            <Text style={PDFStyles.summaryValue}>₹{calculation?.incentive || calculation?.incentive_amount || 0}</Text>
          </View>
          <View style={PDFStyles.summaryItem}>
            <Text style={PDFStyles.summaryLabel}>Final Amount:</Text>
            <Text style={PDFStyles.summaryValue}>₹{calculation?.final_amount || calculation?.total_amount || 0}</Text>
          </View>
        </View>
      </View>

      {/* Staff Breakdown Table (if staffDetails are provided) */}
      {staffDetails && staffDetails.length > 0 && (
        <View style={PDFStyles.section}>
          <Text style={PDFStyles.heading}>Staff Breakdown</Text>
          
          {/* Table Headers */}
          <View style={PDFStyles.tableHeader}>
            <Text style={{...PDFStyles.tableCell, flex: 2}}>Staff Name</Text>
            <Text style={PDFStyles.tableCell}>Papers Evaluated</Text>
            <Text style={PDFStyles.tableCell}>Amount</Text>
          </View>
          
          {/* Table Rows */}
          {staffDetails.map((staff, index) => (
            <View 
              key={`staff-${index}`} 
              style={[
                PDFStyles.tableRow, 
                index % 2 === 0 ? PDFStyles.tableRowEven : PDFStyles.tableRowOdd
              ]}
            >
              <Text style={{...PDFStyles.tableCellLeft, flex: 2}}>{staff.name || 'Unknown'}</Text>
              <Text style={PDFStyles.tableCell}>{staff.papersEvaluated || 0}</Text>
              <Text style={PDFStyles.tableCellRight}>
                ₹{(staff.papersEvaluated || 0) * 20} {/* Assuming ₹20 per paper */}
              </Text>
            </View>
          ))}
          
          {/* Total Row */}
          <View style={PDFStyles.totalRow}>
            <Text style={{...PDFStyles.tableCellLeft, flex: 2}}>Total</Text>
            <Text style={PDFStyles.tableCell}>
              {staffDetails.reduce((sum, staff) => sum + (staff.papersEvaluated || 0), 0)}
            </Text>
            <Text style={PDFStyles.tableCellRight}>
              ₹{calculation?.base_salary || 0}
            </Text>
          </View>
        </View>
      )}
      
      {/* Footer */}
      <View style={PDFStyles.footer} fixed>
        <Text>Generated by ExaminerPro | Page 1 of 1</Text>
        <Text>GURU NANAK COLLEGE (AUTONOMOUS) - CONTROLLER OF EXAMINATIONS</Text>
      </View>
    </Page>
  </Document>
);

export default IndividualExaminerReportPDF; 