import axios from 'axios';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/dateUtils';

/**
 * Get examiner details
 * @param {string} examinerId Examiner ID
 * @returns {Promise} Promise object with examiner data
 */
export const getExaminerDetails = async (examinerId) => {
  try {
    const response = await axios.get(`/api/examiners/${examinerId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Save a calculation to the database
 * @param {Object} calculationData The calculation data to save
 * @returns {Promise} Promise object with saved calculation data
 */
export const saveCalculation = async (calculationData) => {
  try {
    console.log('Saving calculation with data:', {
      examinerId: calculationData.examinerId,
      name: calculationData.name,
      dailyRate: calculationData.dailyRate,
      paperRate: calculationData.paperRate,
      totalDays: calculationData.evaluationDays?.length,
      totalPapers: calculationData.totalPapers,
      baseSalary: calculationData.baseSalary,
      incentiveAmount: calculationData.incentiveAmount,
      totalSalary: calculationData.totalSalary
    });
    
    // Ensure we have valid numbers (parse strings, handle nulls)
    const saveData = {
      examiner_id: calculationData.examinerId,
      calculation_name: calculationData.name || `Calculation ${formatDate(new Date())}`,
      daily_rate: parseFloat(calculationData.dailyRate) || 0,
      paper_rate: parseFloat(calculationData.paperRate) || 0,
      total_days: parseInt(calculationData.evaluationDays?.length) || 0,
      total_papers: parseInt(calculationData.totalPapers) || 0,
      base_salary: parseFloat(calculationData.baseSalary) || 0,
      incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
      total_amount: parseFloat(calculationData.totalSalary) || 0,
      notes: calculationData.notes || '',
      status: 'completed'
    };
    
    console.log('Formatted data for insert:', saveData);
    
    // Create the salary calculation record
    const { data: calculation, error: calculationError } = await supabase
      .from('calculation_documents')
      .insert(saveData)
      .select()
      .single();

    if (calculationError) {
      console.error('Error inserting calculation:', calculationError);
      throw calculationError;
    }

    console.log('Successfully saved calculation:', calculation);

    // Link evaluation days to the calculation
    if (calculationData.evaluationDays && calculationData.evaluationDays.length > 0) {
      const calculationDaysData = calculationData.evaluationDays
        .filter(day => day.id) // Only include days with IDs
        .map(day => ({
          calculation_id: calculation.id,
          evaluation_day_id: day.id
        }));

      if (calculationDaysData.length > 0) {
        const { error: linkError } = await supabase
          .from('calculation_days')
          .insert(calculationDaysData);

        if (linkError) throw linkError;
      }
    }

    // Also save calculation information to calculation_documents for reference
    try {
      // First, check table schema 
      const { data: schemaCheck, error: schemaError } = await supabase
        .from('calculation_documents')
        .select('*')
        .limit(1);
        
      if (schemaError) {
        console.error('Error checking calculation_documents schema:', schemaError);
        // Continue even if we can't check schema
      } else {
        // Get the actual columns
        const actualColumns = schemaCheck && schemaCheck.length > 0 ? Object.keys(schemaCheck[0]) : [];
        console.log('Actual columns in calculation_documents:', actualColumns);
        
        // Create insert data with only columns that exist
        const insertData = {};
        
        if (actualColumns.includes('file_name')) {
          insertData.file_name = `calculation_${calculation.id}_${new Date().getTime()}.json`;
        }
        
        if (actualColumns.includes('file_path')) {
          insertData.file_path = `/calculations/${calculationData.examinerId}/${calculation.id}`;
        }
        
        if (actualColumns.includes('salary_calculation_id')) {
          insertData.salary_calculation_id = calculation.id;
        } else if (actualColumns.includes('calculation_id')) {
          insertData.calculation_id = calculation.id;
        }
        
        if (actualColumns.includes('examiner_id')) {
          insertData.examiner_id = calculationData.examinerId;
        }
        
        if (actualColumns.includes('metadata')) {
          insertData.metadata = JSON.stringify({
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0,
            calculation_date: new Date().toISOString()
          });
        }
        
        // Only insert if we have columns to insert
        if (Object.keys(insertData).length > 0) {
          console.log('Inserting into calculation_documents with data:', insertData);
          
          const { data: docData, error: docError } = await supabase
            .from('calculation_documents')
            .insert(insertData)
            .select();
  
          if (docError) {
            console.error('Warning: Could not save to calculation_documents:', docError);
          } else {
            console.log('Successfully saved document reference:', docData);
          }
        } else {
          console.warn('No valid columns to insert into calculation_documents');
        }
      }
    } catch (docError) {
      console.error('Error saving document reference:', docError);
      // Continue even if document reference fails
    }

    return calculation;
  } catch (error) {
    console.error('Error saving calculation:', error);
    throw error;
  }
};

/**
 * Get all calculations
 * @returns {Promise} Promise object with calculations data
 */
export const getAllCalculations = async () => {
  try {
    // Join with examiners table to get examiner name and details
    const { data, error } = await supabase
      .from('calculation_documents')
      .select(`
        *,
        examiners:examiner_id (
          id,
          full_name,
          examiner_id,
          department
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // Process the data to flatten the examiner properties
    const processedData = data?.map(calc => ({
      ...calc,
      examiner_name: calc.examiners?.full_name || 'Unknown Examiner',
      examiner_id: calc.examiners?.examiner_id || calc.examiner_id || 'N/A',
      department: calc.examiners?.department || 'N/A',
    })) || [];
    
    return processedData;
  } catch (error) {
    console.error('Error fetching calculations:', error);
    throw error;
  }
};

/**
 * Get a calculation by ID with all linked data
 * @param {string} calculationId The calculation ID
 * @returns {Promise} Promise object with calculation data
 */
export const getCalculationById = async (calculationId) => {
  try {
    // Get the calculation with examiner info
    const { data: calculation, error: calculationError } = await supabase
      .from('calculation_documents')
      .select(`
        *,
        examiners:examiner_id (
          id,
          full_name,
          examiner_id,
          department
        )
      `)
      .eq('id', calculationId)
      .single();

    if (calculationError) throw calculationError;
    
    // Process the examiner properties
    const processedCalculation = {
      ...calculation,
      examiner_name: calculation.examiners?.full_name || 'Unknown Examiner',
      examiner_id: calculation.examiners?.examiner_id || calculation.examiner_id || 'N/A',
      department: calculation.examiners?.department || 'N/A',
    };

    // Get linked evaluation days
    const { data: calculationDays, error: daysError } = await supabase
      .from('calculation_days')
      .select(`
        evaluation_day_id
      `)
      .eq('calculation_id', calculationId);

    if (daysError) throw daysError;

    // Get details for each evaluation day
    const evaluationDayIds = calculationDays.map(day => day.evaluation_day_id);
    
    let evaluationDays = [];
    if (evaluationDayIds.length > 0) {
      // Get basic evaluation day info
      const { data: days, error: evaluationDaysError } = await supabase
        .from('evaluation_days')
        .select('id, evaluation_date')
        .in('id', evaluationDayIds);

      if (evaluationDaysError) throw evaluationDaysError;
      
      // Enhance with staff evaluations data
      evaluationDays = await Promise.all(days.map(async day => {
        const { data: staffEvaluations, error: staffError } = await supabase
          .from('staff_evaluations')
          .select('*')
          .eq('evaluation_day_id', day.id);
          
        if (staffError) throw staffError;
        
        const totalPapers = staffEvaluations?.reduce((sum, staff) => sum + staff.papers_evaluated, 0) || 0;
        
        return {
          ...day,
          staff_count: staffEvaluations?.length || 0,
          total_papers: totalPapers,
          staffDetails: staffEvaluations?.map(staff => ({
            id: staff.id,
            name: staff.staff_name,
            papersEvaluated: staff.papers_evaluated
          })) || []
        };
      }));
    }

    // Get document history - using proper relationship
    // The main document is already fetched above as 'calculation'
    // If we need related documents, we should handle that differently
    // For now, just include the main document in the documents array
    const documents = processedCalculation ? [processedCalculation] : [];

    return {
      ...processedCalculation,
      evaluationDays,
      documents: documents || []
    };
  } catch (error) {
    console.error('Error fetching calculation details:', error);
    throw error;
  }
};

/**
 * Update a calculation
 * @param {string} calculationId The calculation ID
 * @param {Object} updates The updates to apply
 * @returns {Promise} Promise object with updated calculation
 */
export const updateCalculation = async (calculationId, updates) => {
  try {
    const { data, error } = await supabase
      .from('calculation_documents')
      .update(updates)
      .eq('id', calculationId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating calculation:', error);
    throw error;
  }
};

/**
 * Generate and save a PDF document for a calculation
 * @param {string} calculationId The calculation ID
 * @param {string} fileName The file name
 * @returns {Promise} Promise object with document data
 */
export const generateCalculationPDF = async (calculationId, fileName) => {
  try {
    // Get the calculation data to include in the document metadata
    const { data: calcData, error: calcError } = await supabase
      .from('calculation_documents')
      .select('*')
      .eq('id', calculationId)
      .single();
      
    if (calcError) throw calcError;
    
    console.log('Creating PDF document for calculation:', calculationId, 'with data:', calcData);
    
    // Generate a mock PDF URL
    // In a real app, this would generate a real PDF and upload it to storage
    const mockPdfUrl = `https://example.com/pdfs/${fileName}`;
    
    // Update the calculation record with the PDF URL
    const { data: updatedCalc, error: updateError } = await supabase
      .from('calculation_documents')
      .update({ 
        pdf_url: mockPdfUrl 
      })
      .eq('id', calculationId)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating calculation with PDF URL:', updateError);
      throw updateError;
    }
    
    console.log('Successfully updated calculation with PDF URL:', updatedCalc);
    return updatedCalc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Download a calculation document
 * @param {string} documentPath Path to the document
 * @returns {Promise} Promise object with download result
 */
export const downloadCalculationDocument = async (documentPath) => {
  try {
    // In a real app, this would download from storage
    const { data, error } = await supabase.storage.from('documents').download(documentPath);
    
    if (error) throw error;
    
    // Create a download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = documentPath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

/**
 * Generate and download a PDF for a calculation
 * @param {Object} params Calculation parameters
 * @returns {Promise} Promise object with download result
 */
export const downloadCalculationPDF = async (params) => {
  try {
    // Generate PDF first
    const document = await generateCalculationPDF(params.calculationId, params.fileName);
    
    // Then download it
    if (document && document.file_path) {
      return await downloadCalculationDocument(document.file_path);
    }
    
    throw new Error('Failed to generate PDF document');
  } catch (error) {
    console.error('Error downloading calculation PDF:', error);
    throw error;
  }
};

/**
 * Get all calculations for an examiner
 * @param {string} examinerId The examiner ID
 * @returns {Promise} Promise object with calculations data
 */
export const getCalculationsByExaminer = async (examinerId) => {
  try {
    console.log('Fetching calculations for examiner:', examinerId);
    
    // First, check if the examiner exists
    const { data: examinerCheck, error: examinerError } = await supabase
      .from('examiners')
      .select('id')
      .eq('id', examinerId)
      .single();
      
    if (examinerError) {
      console.warn('Error checking examiner:', examinerError);
    } else {
      console.log('Examiner check result:', examinerCheck);
    }

    // Use only columns that exist in the table according to the schema
    let { data, error } = await supabase
      .from('calculation_documents')
      .select(`
        id,
        examiner_id,
        created_at,
        total_papers,
        total_staff,
        base_salary,
        incentive,
        final_amount,
        pdf_url
      `)
      .eq('examiner_id', examinerId);
      
    if (error) {
      console.error('Error in query:', error);
      throw error;
    }
    
    // Sort the data in memory instead of relying on Supabase's order parameter
    if (data && data.length > 0) {
      // Sort by created_at in descending order (newest first)
      data.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      console.log('Calculations found:', data.length);
      console.log('Sample calculation after sorting:', data[0]);
      
      // Process data to standardize field names for backward compatibility with the UI
      data.forEach(calc => {
        // Map the correct column names to what the UI expects
        calc.incentive_amount = calc.incentive;
        calc.total_amount = calc.final_amount;
        
        // Generate a calculation_name if it doesn't exist
        if (!calc.calculation_name) {
          // Include PDF info in the name if available
          if (calc.pdf_url) {
            calc.calculation_name = `PDF Report ${formatDate(calc.created_at)}`;
          } else {
            calc.calculation_name = `Calculation ${formatDate(calc.created_at)}`;
          }
        }
        
        // Make sure null PDF URLs don't cause issues
        if (!calc.pdf_url) {
          calc.pdf_url = null;
        } else {
          console.log(`Found PDF URL for calculation ${calc.id}: ${calc.pdf_url}`);
        }
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching calculations:', error);
    throw error;
  }
};

/**
 * Delete a calculation and all related data
 * @param {string} calculationId The calculation ID
 * @returns {Promise} Promise object with delete confirmation
 */
export const deleteCalculation = async (calculationId) => {
  try {
    // eslint-disable-next-line no-unused-vars
    const { data, error } = await supabase
      .from('calculation_documents')
      .delete()
      .eq('id', calculationId);

    if (error) {
      console.error('Error deleting calculation:', error);
      throw error;
    }

    console.log('Calculation deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteCalculation:', error);
    throw error;
  }
};

/**
 * Fallback local calculation function when edge function is not available
 * @param {Object} calculationData The data required for calculation
 * @returns {Object} Calculation results
 */
export const calculateSalaryLocally = async (calculationData) => {
  try {
    console.log('Performing local calculation as fallback with data:', calculationData);
    
    // Constants for calculation (similar to edge function)
    const RATE = 20; // Same rate as in the edge function
    
    // Calculate total papers and staff from all evaluation days
    let totalPapers = 0;
    let totalStaff = 0;
    let baseSalary = 0;
    
    // Check if we have valid evaluation days
    if (Array.isArray(calculationData.evaluation_days) && calculationData.evaluation_days.length > 0) {
      // Loop through all evaluation days
      for (const day of calculationData.evaluation_days) {
        // If the day has staff entries, use them for calculation
        if (Array.isArray(day.staff) && day.staff.length > 0) {
          const staffCount = day.staff.length;
          const dayPapers = day.staff.reduce(
            (sum, staff) => sum + (parseInt(staff.papers) || 0), 
            0
          );
          
          totalPapers += dayPapers;
          // Calculate staff contribution directly
          baseSalary += day.staff.reduce(
            (sum, staff) => sum + ((parseInt(staff.papers) || 0) * RATE), 
            0
          );
          totalStaff += staffCount;
        }
      }
    }
    
    // Calculate incentive (10% of total papers * rate)
    const incentive = totalPapers * RATE * 0.1;
    
    // Calculate total salary (final_amount in the schema)
    const finalAmount = baseSalary + incentive;
    
    console.log('Local calculation result:', {
      totalPapers,
      totalStaff,
      baseSalary,
      incentive,
      finalAmount
    });
    
    // Insert result into calculation_documents and get the id
    let calculationId = null;
    try {
      console.log('Saving local calculation to database');
      
      if (calculationData.examiner_id) {
        const { data: savedData, error: saveError } = await supabase
          .from('calculation_documents')
          .insert({
            examiner_id: calculationData.examiner_id,
            total_papers: totalPapers,
            total_staff: totalStaff,
            base_salary: baseSalary,
            incentive: incentive,
            final_amount: finalAmount
          })
          .select();
          
        if (saveError) {
          console.error('Error saving local calculation to database:', saveError);
        } else if (savedData && savedData.length > 0) {
          calculationId = savedData[0].id;
          console.log('Successfully saved local calculation to database with ID:', calculationId);
        }
      }
    } catch (dbError) {
      console.error('Database error in local calculation:', dbError);
    }
    
    // Convert all values to numbers to ensure proper parsing
    // Use the frontend field names in the return object
    return {
      baseSalary: Number(baseSalary),
      incentiveAmount: Number(incentive),
      totalSalary: Number(finalAmount),
      totalPapers: Number(totalPapers),
      totalStaff: Number(totalStaff),
      calculatedLocally: true,
      status: 'local',
      calculation_id: calculationId
    };
  } catch (error) {
    console.error('Error in local calculation:', error);
    
    // Return default values in case of error
    return {
      baseSalary: 0,
      incentiveAmount: 0,
      totalSalary: 0,
      totalPapers: 0,
      totalStaff: 0,
      calculatedLocally: true,
      status: 'error',
      calculation_id: null
    };
  }
};

/**
 * Calculate salary using Supabase edge function
 * @param {Object} calculationData The data required for calculation
 * @returns {Promise} Promise object with calculation results
 */
export const calculateSalaryWithEdgeFunction = async (calculationData) => {
  try {
    console.log('Calling Supabase Edge Function for salary calculation');
    
    // Validate the evaluation_days to ensure they all have evaluation_day_id
    if (!calculationData.evaluation_days || !Array.isArray(calculationData.evaluation_days)) {
      throw new Error('evaluation_days must be a valid array');
    }
    
    const invalidDays = calculationData.evaluation_days.filter(day => !day.evaluation_day_id);
    if (invalidDays.length > 0) {
      console.error('Found evaluation days without IDs:', invalidDays);
      throw new Error(`${invalidDays.length} evaluation days are missing evaluation_day_id`);
    }
    
    // The payload is now already in the correct format, no need to transform it
    console.log('Edge function payload:', JSON.stringify(calculationData));
    
    // Call the edge function directly with the new endpoint URL
    const response = await fetch('https://zampawknbmlrnhsaacqm.supabase.co/functions/v1/calculate-salary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify(calculationData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Edge function error: ${response.status} - ${errorText}`);
      throw new Error(`Edge function failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Raw edge function response:', data);
    
    if (!data) {
      throw new Error('Edge function returned empty response');
    }
    
    // Debug log each field to see what we're getting
    console.log('Edge function fields:', {
      base_salary: data.base_salary,
      incentive: data.incentive,
      final_amount: data.final_amount,
      total_papers: data.total_papers,
      total_staff: data.total_staff,
      id: data.id,
      calculation_id: data.calculation_id
    });
    
    // Calculate total staff from evaluation days if not provided by edge function
    const totalStaff = data.total_staff || calculationData.evaluation_days.reduce(
      (sum, day) => sum + (day.staff ? day.staff.length : 0), 0
    );
    
    // IMPORTANT: The edge function already inserts into calculation_documents
    // DO NOT insert again to avoid duplicate entries
    
    // Extract the calculation_id from the response
    // Look in different possible locations since the edge function may return it in different formats
    const calculationId = data.calculation_id || data.id || data.calculationId || null;
    
    // Format the response to match the expected structure in the frontend
    // Ensure we have valid numbers by using explicit conversion methods
    const result = {
      baseSalary: parseFloat(data.base_salary) || 0,
      incentiveAmount: parseFloat(data.incentive) || 0,
      totalSalary: parseFloat(data.final_amount) || 0,
      totalPapers: parseInt(data.total_papers) || 0,
      totalStaff: parseInt(data.total_staff) || parseInt(totalStaff) || 0,
      calculatedLocally: false,
      status: data.status || 'completed',
      calculation_id: calculationId  // Include the calculation ID from the edge function
    };
    
    console.log('Formatted edge function result with calculation_id:', result);
    return result;
  } catch (error) {
    console.error('Failed to calculate using edge function:', error);
    console.log('Falling back to local calculation');
    return calculateSalaryLocally(calculationData);
  }
};

/**
 * Save calculation results directly to the calculation_documents table
 * @param {string} examinerId The examiner ID
 * @param {Object} calculationData The calculation data to save
 * @returns {Promise} Promise object with saved document data
 */
export const saveDirectToCalculationDocuments = async (examinerId, calculationData) => {
  try {
    console.log('Saving calculation directly to documents with data:', calculationData);
    
    // First, check the document schema
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('calculation_documents')
      .select('*')
      .limit(1);
      
    if (schemaError) {
      console.error('Error checking calculation_documents schema:', schemaError);
      throw schemaError;
    }
    
    console.log('Schema check result:', schemaCheck);
    
    // Get actual columns from the table
    const actualColumns = schemaCheck && schemaCheck.length > 0 ? Object.keys(schemaCheck[0]) : [];
    console.log('Actual columns in calculation_documents:', actualColumns);
    
    const timestamp = new Date().getTime();
    const fileName = `direct_calculation_${examinerId}_${timestamp}.json`;
    
    // Create a document with only columns that exist in the table
    const insertData = {};
    
    if (actualColumns.includes('file_name')) {
      insertData.file_name = fileName;
    }
    
    if (actualColumns.includes('file_path')) {
      insertData.file_path = `/direct_calculations/${examinerId}/${timestamp}`;
    }
    
    if (actualColumns.includes('metadata')) {
      insertData.metadata = JSON.stringify({
        examiner_id: examinerId,
        total_papers: parseInt(calculationData.totalPapers) || 0,
        base_salary: parseFloat(calculationData.baseSalary) || 0,
        incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
        total_amount: parseFloat(calculationData.totalSalary) || 0,
        calculation_date: new Date().toISOString()
      });
    }
    
    // Skip insertion if there are no valid columns
    if (Object.keys(insertData).length === 0) {
      console.error('No valid columns found to insert into calculation_documents');
      throw new Error('No valid columns found to insert into calculation_documents');
    }
    
    console.log('Attempting to insert with data:', insertData);
    
    // Now do the insert
    const { data, error } = await supabase
      .from('calculation_documents')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.error('Error saving calculation document:', error);
      throw error;
    }
    
    console.log('Successfully saved calculation document:', data);
    return data;
  } catch (error) {
    console.error('Error in saveDirectToCalculationDocuments:', error);
    throw error;
  }
};

/**
 * Function to debug the calculation_documents table structure
 * This function will query the table and expose its actual structure
 */
export const debugCalculationDocumentsTable = async () => {
  try {
    console.log('Debugging calculation_documents table structure');
    
    // Method 1: Direct query to get a sample record
    const { data: sampleData, error: sampleError } = await supabase
      .from('calculation_documents')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('Error querying calculation_documents:', sampleError);
    } else {
      console.log('Sample data from calculation_documents:', sampleData);
      if (sampleData && sampleData.length > 0) {
        console.log('Available columns:', Object.keys(sampleData[0]));
      } else {
        console.log('calculation_documents table appears to be empty');
      }
    }
    
    // Method 2: Try to get table information using SQL
    try {
      const { data: tableData, error: tableError } = await supabase.rpc(
        'debug_table_info',
        { table_name: 'calculation_documents' }
      );
      
      if (tableError) {
        console.error('Error getting table info:', tableError);
      } else {
        console.log('Table structure from rpc:', tableData);
      }
    } catch (rpcError) {
      console.error('RPC error:', rpcError);
    }
    
    // Method 3: Execute a simple INSERT with a bare minimum structure
    const testData = {
      debug_note: `Table structure debug test - ${new Date().toISOString()}`
    };
    
    console.log('Trying test insert with:', testData);
    
    const { data: testInsert, error: testError } = await supabase
      .from('calculation_documents')
      .insert(testData)
      .select();
      
    if (testError) {
      console.error('Test insert error:', testError);
      console.log('Error code:', testError.code);
      console.log('Error message:', testError.message);
      
      // If the error mentions column names, extract them
      if (testError.message && testError.message.includes('column')) {
        const columnMatch = testError.message.match(/column "([^"]+)"/);
        if (columnMatch) {
          console.log('Column mentioned in error:', columnMatch[1]);
        }
      }
    } else {
      console.log('Test insert successful:', testInsert);
      console.log('Inserted record structure:', testInsert[0] ? Object.keys(testInsert[0]) : 'No data returned');
    }
    
    return {
      message: 'Debugging completed, check console logs',
      sampleData: sampleData
    };
  } catch (error) {
    console.error('Error in debugCalculationDocumentsTable:', error);
    return {
      error: true,
      message: error.message
    };
  }
};

/**
 * Save calculation data directly to calculation_documents table using multiple approaches
 * @param {Object} calculationData The calculation data to save
 * @returns {Promise} Promise with the result of the save operation
 */
export const saveCalculationToDocuments = async (calculationData) => {
  try {
    console.log('Saving calculation data to calculation_documents with:', calculationData);

    // Attempt multiple different approaches to find the right column structure
    const approaches = [
      // Approach 1: Try with document field
      {
        name: 'document approach',
        data: {
          document: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 2: Try with data field
      {
        name: 'data approach',
        data: {
          data: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 3: Try with content field
      {
        name: 'content approach',
        data: {
          content: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 4: Try with metadata field
      {
        name: 'metadata approach',
        data: {
          metadata: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 5: Try with json field
      {
        name: 'json approach',
        data: {
          json: JSON.stringify({
            type: 'calculation',
            examiner_id: calculationData.examinerId,
            total_papers: parseInt(calculationData.totalPapers) || 0,
            base_salary: parseFloat(calculationData.baseSalary) || 0,
            incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
            total_amount: parseFloat(calculationData.totalSalary) || 0
          })
        }
      },
      
      // Approach 6: Try with text field and describe the calculation
      {
        name: 'text description approach',
        data: {
          text: `Calculation result: Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      },
      
      // Approach 7: Try with note or notes field
      {
        name: 'note approach',
        data: {
          note: `Calculation result: Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      },
      
      // Approach 8: Try with description field
      {
        name: 'description approach',
        data: {
          description: `Calculation result: Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      },
      
      // Approach 9: Try with direct fields
      {
        name: 'direct fields approach',
        data: {
          examiner_id: calculationData.examinerId,
          total_papers: parseInt(calculationData.totalPapers) || 0,
          base_salary: parseFloat(calculationData.baseSalary) || 0,
          incentive_amount: parseFloat(calculationData.incentiveAmount) || 0,
          total_amount: parseFloat(calculationData.totalSalary) || 0
        }
      },
      
      // Approach 10: Try with name and type fields
      {
        name: 'name type approach',
        data: {
          name: `Calculation for examiner ${calculationData.examinerId}`,
          type: 'calculation',
          value: `Papers=${calculationData.totalPapers}, Base=${calculationData.baseSalary}, Incentive=${calculationData.incentiveAmount}, Total=${calculationData.totalSalary}`
        }
      }
    ];
    
    // Try each approach until one works
    for (let i = 0; i < approaches.length; i++) {
      const approach = approaches[i];
      console.log(`Trying approach ${i+1} (${approach.name}):`, approach.data);
      
      try {
        const { data, error } = await supabase
          .from('calculation_documents')
          .insert(approach.data)
          .select();
          
        if (error) {
          console.error(`Error with approach ${i+1} (${approach.name}):`, error);
        } else {
          console.log(`✅ Success with approach ${i+1} (${approach.name}):`, data);
          return {
            success: true,
            approach: approach.name,
            data
          };
        }
      } catch (approachError) {
        console.error(`Exception with approach ${i+1} (${approach.name}):`, approachError);
      }
    }
    
    // If we get here, all approaches failed
    return {
      success: false,
      message: 'All approaches failed. Check console for details.'
    };
  } catch (error) {
    console.error('Error in saveCalculationToDocuments:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete a document by ID
 * @param {string} documentId The document ID
 * @returns {Promise} Promise object with deletion result
 */
export const deleteDocument = async (documentId) => {
  try {
    const { error } = await supabase
      .from('calculation_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Rename a document
 * @param {string} documentId The document ID
 * @param {string} newName The new document name
 * @returns {Promise} Promise object with update result
 */
export const renameDocument = async (documentId, newName) => {
  try {
    const { data, error } = await supabase
      .from('calculation_documents')
      .update({ file_name: newName })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error renaming document:', error);
    throw error;
  }
};

/**
 * Download multiple documents as a ZIP file
 * @param {Array} documentPaths Array of document paths
 * @returns {Promise} Promise object with download result
 */
export const downloadDocumentsAsZip = async (documentPaths) => {
  try {
    const timestamp = new Date().getTime();
    const fileName = `documents_${timestamp}.zip`;
    
    // Call the server API to create a ZIP file
    const response = await axios.post('/api/calculations/download-zip', {
      documentPaths,
      fileName
    }, {
      responseType: 'blob'
    });
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    link.remove();
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error downloading documents as ZIP:', error);
    throw error;
  }
};

/**
 * Export calculations as Excel or CSV
 * @param {Array} calculationIds Array of calculation IDs to export
 * @param {string} format Export format ('excel' or 'csv')
 * @returns {Promise} Promise object with export result
 */
export const exportCalculations = async (calculationIds, format = 'excel') => {
  try {
    const timestamp = new Date().getTime();
    const fileName = `calculations_export_${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    // Call the server API to create an export file
    const response = await axios.post('/api/calculations/export', {
      calculationIds,
      format,
      fileName
    }, {
      responseType: 'blob'
    });
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    link.remove();
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting calculations:', error);
    throw error;
  }
};

// Export as default
const calculationService = {
  getExaminerDetails,
  saveCalculation,
  getAllCalculations,
  getCalculationById,
  updateCalculation,
  generateCalculationPDF,
  downloadCalculationDocument,
  downloadCalculationPDF,
  deleteCalculation,
  getCalculationsByExaminer,
  calculateSalaryWithEdgeFunction,
  calculateSalaryLocally,
  saveDirectToCalculationDocuments,
  debugCalculationDocumentsTable,
  saveCalculationToDocuments,
  deleteDocument,
  renameDocument,
  downloadDocumentsAsZip,
  exportCalculations
};

export default calculationService; 