const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * @route   GET /api/calculations
 * @desc    Get all calculations
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calculations')
      .select('*');
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching calculations:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/calculations/:id
 * @desc    Get calculation by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Calculation not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching calculation:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/calculations
 * @desc    Create a new calculation
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { 
      examinerId, 
      totalStaff, 
      totalPapers, 
      baseSalary, 
      incentiveAmount, 
      totalSalary, 
      evaluationDays 
    } = req.body;
    
    if (!examinerId || !totalStaff || !totalPapers || !baseSalary || 
        !incentiveAmount || !totalSalary || !evaluationDays) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Insert calculation
    const { data, error } = await supabase
      .from('calculations')
      .insert({
        examiner_id: examinerId,
        date: new Date().toISOString(),
        total_staff: totalStaff,
        total_papers: totalPapers,
        base_salary: baseSalary,
        incentive_amount: incentiveAmount,
        total_salary: totalSalary,
        evaluation_days: JSON.stringify(evaluationDays),
        user_id: req.user.id
      })
      .select();
      
    if (error) throw error;
    
    res.status(201).json({ 
      message: 'Calculation saved successfully',
      calculation: data[0]
    });
  } catch (error) {
    console.error('Error saving calculation:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/calculations/pdf
 * @desc    Generate and download PDF
 * @access  Private
 */
router.post('/pdf', async (req, res) => {
  try {
    const { examiner, evaluationDays, calculations } = req.body;
    
    if (!examiner || !evaluationDays || !calculations) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }
    
    // Create PDF document
    const doc = new PDFDocument();
    const timestamp = new Date().getTime();
    const fileName = `chief_examiner_report_${examiner.examinerid}_${timestamp}.pdf`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add content to PDF
    // First page - Summary
    doc.font('Helvetica-Bold').fontSize(16).text('GURU NANAK COLLEGE (AUTONOMOUS)', { align: 'center' });
    doc.font('Helvetica').fontSize(10).text('Affiliated to University of Madras | Accredited \'A++\' Grade by NAAC', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).text('CONTROLLER OF EXAMINATIONS', { align: 'center' });
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text('OVERALL CHIEF EXAMINER EVALUATION SUMMARY', { align: 'center' });
    doc.font('Helvetica').fontSize(10).text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Summary Table
    doc.rect(72, doc.y, 450, 150).stroke();
    doc.font('Helvetica-Bold').fontSize(12).text('EVALUATION SUMMARY', { continued: false, indent: 10 });
    doc.moveDown();
    
    // Summary Rows
    const buildSummaryRow = (label, value, isBold = false) => {
      const textOptions = { continued: false, indent: 10 };
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
      doc.text(`${label}: ${value}`, textOptions);
      doc.moveDown(0.5);
    };
    
    buildSummaryRow('Total Examiners', evaluationDays.length);
    buildSummaryRow('Total Evaluations', calculations.totalPapers);
    buildSummaryRow('Total Papers Evaluated', calculations.totalPapers);
    buildSummaryRow('Total Staff Involved', evaluationDays.reduce((sum, day) => sum + day.staffCount, 0));
    
    doc.moveTo(72, doc.y).lineTo(522, doc.y).stroke();
    doc.moveDown(0.5);
    
    buildSummaryRow('Total Amount Paid', `Rs.${calculations.totalSalary.toFixed(2)}`, true);
    
    // Add new page for detailed report
    doc.addPage();
    
    // Header Section
    doc.font('Helvetica-Bold').fontSize(16).text('GURU NANAK COLLEGE (AUTONOMOUS)', { align: 'center' });
    doc.font('Helvetica').fontSize(10).text('Affiliated to University of Madras | Accredited \'A++\' Grade by NAAC', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).text('CONTROLLER OF EXAMINATIONS', { align: 'center' });
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text('CHIEF EXAMINER SALARY REPORT', { align: 'center' });
    doc.moveDown(2);
    
    // Chief Examiner Details
    doc.rect(72, doc.y, 450, 120).stroke();
    doc.font('Helvetica-Bold').text('CHIEF EXAMINER DETAILS', { continued: false, indent: 10 });
    doc.moveDown();
    
    const details = [
      { label: 'Name', value: examiner.fullname },
      { label: 'ID', value: examiner.examinerid },
      { label: 'Department', value: examiner.department || 'N/A' },
      { label: 'Staff Count', value: evaluationDays.reduce((sum, day) => sum + day.staffCount, 0) },
      { label: 'Date', value: format(new Date(), 'dd/MM/yyyy') }
    ];
    
    details.forEach(detail => {
      doc.font('Helvetica').text(`${detail.label}: ${detail.value}`, { continued: false, indent: 10 });
      doc.moveDown(0.5);
    });
    
    doc.moveDown();
    
    // Evaluation Summary
    doc.font('Helvetica-Bold').text('EVALUATION SUMMARY');
    doc.moveDown();
    
    // Table headers
    const tableTop = doc.y;
    const tableWidth = 450;
    const colWidths = [150, 150, 150];
    
    doc.rect(72, tableTop, tableWidth, 20).stroke();
    
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Date', 82, tableTop + 7);
    doc.text('Number of Examiners', 82 + colWidths[0], tableTop + 7);
    doc.text('Papers Evaluated', 82 + colWidths[0] + colWidths[1], tableTop + 7);
    
    let tableY = tableTop + 20;
    
    // Table rows
    evaluationDays.forEach(day => {
      doc.rect(72, tableY, tableWidth, 20).stroke();
      
      doc.font('Helvetica').fontSize(10);
      doc.text(day.date, 82, tableY + 7);
      doc.text(day.staffCount.toString(), 82 + colWidths[0], tableY + 7);
      doc.text(day.papersEvaluated.toString(), 82 + colWidths[0] + colWidths[1], tableY + 7);
      
      tableY += 20;
    });
    
    doc.moveDown(2);
    
    // Calculation Results
    doc.rect(72, doc.y, 450, 120).stroke();
    doc.font('Helvetica-Bold').text('CALCULATION RESULTS', { continued: false, indent: 10 });
    doc.moveDown();
    
    // Results rows
    doc.font('Helvetica').text(`Total Papers Evaluated: ${calculations.totalPapers}`, { continued: false, indent: 10 });
    doc.moveDown(0.5);
    doc.text(`Base Salary: Rs.${calculations.baseSalary.toFixed(2)}`, { continued: false, indent: 10 });
    doc.moveDown(0.5);
    doc.text(`Incentive Amount: Rs.${calculations.incentiveAmount.toFixed(2)}`, { continued: false, indent: 10 });
    doc.moveDown(0.5);
    
    doc.moveTo(72, doc.y).lineTo(522, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.font('Helvetica-Bold').text(`Net Amount: Rs.${calculations.totalSalary.toFixed(2)}`, { continued: false, indent: 10 });
    
    // Finalize PDF
    doc.end();
    
    // Create PDF history record in database
    const uploadDir = path.join(__dirname, '../../../uploads/pdfs');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    
    // Save PDF history record
    await supabase
      .from('pdf_history')
      .insert({
        examiner_id: examiner.id,
        file_path: filePath,
        created_at: new Date().toISOString(),
        is_overall_report: 0,
        user_id: req.user.id
      });
      
  } catch (error) {
    console.error('Error generating PDF:', error.message);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
});

/**
 * @route   GET /api/calculations/pdf-history/:examinerId
 * @desc    Get PDF history for an examiner
 * @access  Private
 */
router.get('/pdf-history/:examinerId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history')
      .select('*')
      .eq('examiner_id', req.params.examinerId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching PDF history:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 