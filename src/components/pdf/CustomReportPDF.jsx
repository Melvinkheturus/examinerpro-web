import React from 'react';
import { Page, Text, View, Document, Image } from '@react-pdf/renderer';
import PDFStyles from './PDFStyles';

// Helper function to format currency
const formatCurrency = (amount) => {
  return `₹${parseFloat(amount || 0).toFixed(2)}`;
};

// Helper function to calculate examiner totals
const calculateExaminerTotals = (calculations) => {
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

// PDF Component for Custom Report
const CustomReportPDF = ({ 
  title = 'Custom Examiner Report',
  examinersData = [], 
  reportConfig = {
    includeExaminerProfiles: true,
    includeCalculationDetails: true,
    groupByDepartment: false
  },
  filterInfo = {}
}) => {
  // Calculate global totals
  const globalTotals = examinersData.reduce((totals, examinerData) => {
    const examinerTotals = calculateExaminerTotals(examinerData.calculations || []);
    return {
      examiners: totals.examiners + 1,
      calculations: totals.calculations + (examinerData.calculations?.length || 0),
      papers: totals.papers + examinerTotals.papers,
      baseSalary: totals.baseSalary + examinerTotals.baseSalary,
      incentive: totals.incentive + examinerTotals.incentive,
      finalAmount: totals.finalAmount + examinerTotals.finalAmount
    };
  }, { examiners: 0, calculations: 0, papers: 0, baseSalary: 0, incentive: 0, finalAmount: 0 });
  
  // Format the filter info for display
  const formatFilterInfo = () => {
    const parts = [];
    if (filterInfo.department) parts.push(`Department: ${filterInfo.department}`);
    if (filterInfo.dateRange) parts.push(`Period: ${filterInfo.dateRange}`);
    if (filterInfo.customFilters) parts.push(filterInfo.customFilters);
    return parts.join(' | ') || 'Custom Selection';
  };
  
  // Group examiners by department if needed
  const groupedData = reportConfig.groupByDepartment
    ? examinersData.reduce((groups, examinerData) => {
        const dept = examinerData.examiner?.department || 'Unknown Department';
        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(examinerData);
        return groups;
      }, {})
    : { 'All Departments': examinersData };
  
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
            <Text style={PDFStyles.headerTitle}>{title}</Text>
            <Text style={PDFStyles.headerSubtitle}>
              Generated on: {new Date().toLocaleDateString()} | {formatFilterInfo()}
            </Text>
          </View>
        </View>

        {/* Global Summary Section */}
        <View style={PDFStyles.section}>
          <Text style={PDFStyles.heading}>Report Summary</Text>
          <View style={PDFStyles.summaryBox}>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Examiners:</Text>
              <Text style={PDFStyles.summaryValue}>{globalTotals.examiners}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Calculations:</Text>
              <Text style={PDFStyles.summaryValue}>{globalTotals.calculations}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Papers Evaluated:</Text>
              <Text style={PDFStyles.summaryValue}>{globalTotals.papers}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Base Salary:</Text>
              <Text style={PDFStyles.summaryValue}>{formatCurrency(globalTotals.baseSalary)}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Incentives:</Text>
              <Text style={PDFStyles.summaryValue}>{formatCurrency(globalTotals.incentive)}</Text>
            </View>
            <View style={PDFStyles.summaryItem}>
              <Text style={PDFStyles.summaryLabel}>Total Amount Paid:</Text>
              <Text style={PDFStyles.summaryValue}>{formatCurrency(globalTotals.finalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Loop through each department if grouped */}
        {Object.entries(groupedData).map(([department, departmentExaminers], deptIndex) => (
          <View key={`dept-${deptIndex}`} style={PDFStyles.section}>
            {/* Department heading if grouped by department */}
            {reportConfig.groupByDepartment && (
              <Text style={PDFStyles.heading}>{department}</Text>
            )}
            
            {/* Summary Table of Examiners */}
            <View style={PDFStyles.section}>
              <Text style={PDFStyles.subheading}>Examiner Summary</Text>
              
              {/* Table Headers */}
              <View style={PDFStyles.tableHeader}>
                <Text style={{...PDFStyles.tableCell, flex: 2}}>Examiner Name</Text>
                {!reportConfig.groupByDepartment && (
                  <Text style={PDFStyles.tableCell}>Department</Text>
                )}
                <Text style={PDFStyles.tableCell}>Calculations</Text>
                <Text style={PDFStyles.tableCell}>Papers</Text>
                <Text style={PDFStyles.tableCell}>Total Paid</Text>
              </View>
              
              {/* Table Rows - One row per examiner */}
              {departmentExaminers.map((examinerData, index) => {
                const examiner = examinerData.examiner || {};
                const examinerTotals = calculateExaminerTotals(examinerData.calculations || []);
                
                return (
                  <View 
                    key={`examiner-${deptIndex}-${index}`} 
                    style={[
                      PDFStyles.tableRow, 
                      index % 2 === 0 ? PDFStyles.tableRowEven : PDFStyles.tableRowOdd
                    ]}
                  >
                    <Text style={{...PDFStyles.tableCellLeft, flex: 2}}>
                      {examiner.full_name || examiner.name || 'Unknown'}
                    </Text>
                    {!reportConfig.groupByDepartment && (
                      <Text style={PDFStyles.tableCell}>{examiner.department || 'N/A'}</Text>
                    )}
                    <Text style={PDFStyles.tableCell}>{examinerData.calculations?.length || 0}</Text>
                    <Text style={PDFStyles.tableCell}>{examinerTotals.papers}</Text>
                    <Text style={PDFStyles.tableCellRight}>{formatCurrency(examinerTotals.finalAmount)}</Text>
                  </View>
                );
              })}
              
              {/* Department Total Row */}
              <View style={PDFStyles.totalRow}>
                <Text style={{...PDFStyles.tableCellLeft, flex: 2}}>
                  Total ({departmentExaminers.length} Examiners)
                </Text>
                {!reportConfig.groupByDepartment && (
                  <Text style={PDFStyles.tableCell}>-</Text>
                )}
                <Text style={PDFStyles.tableCell}>
                  {departmentExaminers.reduce((sum, data) => sum + (data.calculations?.length || 0), 0)}
                </Text>
                <Text style={PDFStyles.tableCell}>
                  {departmentExaminers.reduce((sum, data) => {
                    const examinerTotals = calculateExaminerTotals(data.calculations || []);
                    return sum + examinerTotals.papers;
                  }, 0)}
                </Text>
                <Text style={PDFStyles.tableCellRight}>
                  {formatCurrency(
                    departmentExaminers.reduce((sum, data) => {
                      const examinerTotals = calculateExaminerTotals(data.calculations || []);
                      return sum + examinerTotals.finalAmount;
                    }, 0)
                  )}
                </Text>
              </View>
            </View>
            
            {/* Include calculation details if configured */}
            {reportConfig.includeCalculationDetails && (
              departmentExaminers.map((examinerData, examinerIndex) => {
                const examiner = examinerData.examiner || {};
                const calculations = examinerData.calculations || [];
                if (calculations.length === 0) return null;
                
                return (
                  <View 
                    key={`examiner-detail-${deptIndex}-${examinerIndex}`} 
                    style={{...PDFStyles.section, marginLeft: 10, marginTop: 5}}
                  >
                    {/* Only show examiner profile if configured */}
                    {reportConfig.includeExaminerProfiles && (
                      <View style={{marginBottom: 10}}>
                        <Text style={PDFStyles.subheading}>
                          {examiner.full_name || examiner.name || 'Unknown'}
                        </Text>
                        <View style={PDFStyles.row}>
                          <Text style={PDFStyles.label}>ID:</Text>
                          <Text style={PDFStyles.value}>{examiner.examiner_id || examiner.id || 'N/A'}</Text>
                        </View>
                        <View style={PDFStyles.row}>
                          <Text style={PDFStyles.label}>Department:</Text>
                          <Text style={PDFStyles.value}>{examiner.department || 'N/A'}</Text>
                        </View>
                      </View>
                    )}
                    
                    {/* Calculation Table for This Examiner */}
                    <View style={PDFStyles.tableHeader}>
                      <Text style={{...PDFStyles.tableCell, flex: 1.5}}>Date</Text>
                      <Text style={PDFStyles.tableCell}>Papers</Text>
                      <Text style={PDFStyles.tableCell}>Base</Text>
                      <Text style={PDFStyles.tableCell}>Incentive</Text>
                      <Text style={PDFStyles.tableCell}>Total</Text>
                    </View>
                    
                    {calculations.map((calc, calcIndex) => (
                      <View 
                        key={`calc-${deptIndex}-${examinerIndex}-${calcIndex}`} 
                        style={[
                          PDFStyles.tableRow, 
                          calcIndex % 2 === 0 ? PDFStyles.tableRowEven : PDFStyles.tableRowOdd
                        ]}
                      >
                        <Text style={{...PDFStyles.tableCellLeft, flex: 1.5}}>
                          {calc.created_at ? new Date(calc.created_at).toLocaleDateString() : 'N/A'}
                        </Text>
                        <Text style={PDFStyles.tableCell}>{calc.total_papers || 0}</Text>
                        <Text style={PDFStyles.tableCellRight}>{formatCurrency(calc.base_salary)}</Text>
                        <Text style={PDFStyles.tableCellRight}>{formatCurrency(calc.incentive || calc.incentive_amount)}</Text>
                        <Text style={PDFStyles.tableCellRight}>{formatCurrency(calc.final_amount || calc.total_amount)}</Text>
                      </View>
                    ))}
                    
                    {/* Examiner Calculations Total Row */}
                    <View style={PDFStyles.totalRow}>
                      <Text style={{...PDFStyles.tableCellLeft, flex: 1.5}}>Total</Text>
                      <Text style={PDFStyles.tableCell}>
                        {calculations.reduce((sum, calc) => sum + (parseInt(calc.total_papers) || 0), 0)}
                      </Text>
                      <Text style={PDFStyles.tableCellRight}>
                        {formatCurrency(
                          calculations.reduce((sum, calc) => sum + (parseFloat(calc.base_salary) || 0), 0)
                        )}
                      </Text>
                      <Text style={PDFStyles.tableCellRight}>
                        {formatCurrency(
                          calculations.reduce((sum, calc) => sum + (parseFloat(calc.incentive || calc.incentive_amount) || 0), 0)
                        )}
                      </Text>
                      <Text style={PDFStyles.tableCellRight}>
                        {formatCurrency(
                          calculations.reduce((sum, calc) => sum + (parseFloat(calc.final_amount || calc.total_amount) || 0), 0)
                        )}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ))}
        
        {/* Footer */}
        <View style={PDFStyles.footer} fixed>
          <Text>Generated by ExaminerPro | Page 1 of 1</Text>
          <Text>GURU NANAK COLLEGE (AUTONOMOUS) - CONTROLLER OF EXAMINATIONS</Text>
        </View>
      </Page>
    </Document>
  );
};

export default CustomReportPDF; 