import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet
} from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontSize: 12,
    backgroundColor: '#FFFFFF'
  },
  section: { 
    marginBottom: 10 
  },
  heading: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10 
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
  label: { 
    fontWeight: 'bold' 
  },
  value: {
    marginLeft: 5
  },
  calculationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 5,
    marginBottom: 5,
    fontWeight: 'bold'
  }
});

// PDF Component
const ExaminerReportPDF = ({ examiner, calculations }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>Examiner Report</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{examiner?.name || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Department:</Text>
          <Text style={styles.value}>{examiner?.department || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Examiner ID:</Text>
          <Text style={styles.value}>{examiner?.id || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Calculations</Text>
        <View style={styles.calculationsHeader}>
          <Text>Date</Text>
          <Text>Papers</Text>
          <Text>Amount</Text>
        </View>
        {calculations?.map((calc, index) => (
          <View key={`calc-${index}`} style={styles.row}>
            <Text>{calc.created_at ? new Date(calc.created_at).toLocaleDateString() : 'N/A'}</Text>
            <Text>{calc.total_papers || 0} papers</Text>
            <Text>₹{calc.final_amount || 0}</Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default ExaminerReportPDF; 