import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = '/api/staff';

/**
 * Get all staff records
 * @returns {Promise} Promise object with staff data
 */
export const getAllStaff = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get staff by ID
 * @param {string} id Staff ID
 * @returns {Promise} Promise object with staff data
 */
export const getStaffById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create multiple staff records with their paper counts
 * @param {Array} staffDetails Array of staff objects with name and papers properties
 * @param {number} totalPapers Total papers evaluated 
 * @returns {Promise} Promise object with created staff data
 */
export const createStaffRecords = async (staffDetails, totalPapers) => {
  try {
    const response = await axios.post(API_URL, { staffDetails, totalPapers });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update staff record
 * @param {string} id Staff ID
 * @param {Object} staffData Object with updated name and papers
 * @returns {Promise} Promise object with updated staff data
 */
export const updateStaff = async (id, staffData) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, staffData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Delete staff record
 * @param {string} id Staff ID
 * @returns {Promise} Promise object with delete confirmation
 */
export const deleteStaff = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Save staff details to the database
 * @param {Array} staffDetails - Array of staff detail objects
 * @param {string} examinerId - The examiner ID
 * @param {string} evaluationDate - The evaluation date
 * @returns {Promise} Promise with the result
 */
export const saveStaffDetails = async (examinerId, staffDetails) => {
  try {
    const { data, error } = await supabase
      .from('staff_details')
      .insert([
        {
          examiner_id: examinerId,
          staff_details: staffDetails
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving staff details:', error);
    throw error;
  }
};

/**
 * Get staff details for an examiner and evaluation date
 * @param {string} examinerId - The examiner ID
 * @param {string} evaluationDate - The evaluation date
 * @returns {Promise} Promise with the staff details
 */
export const getStaffDetails = async (examinerId) => {
  try {
    const { data, error } = await supabase
      .from('staff_details')
      .select('*')
      .eq('examiner_id', examinerId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting staff details:', error);
    throw error;
  }
};

/**
 * Delete staff details
 * @param {number} id - The staff evaluation ID
 * @returns {Promise} Promise with the result
 */
export const deleteStaffDetail = async (id) => {
  try {
    const { data, error } = await supabase
      .from('staff_evaluations')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error deleting staff detail:', error);
    throw error;
  }
};

/**
 * Create evaluation day record
 * @param {string} examinerId - Examiner UUID
 * @param {Date} evaluationDate - Evaluation date
 * @returns {Promise} Promise with the result
 */
export const createEvaluationDay = async (examinerId, evaluationDate) => {
  try {
    // Get current user
    // eslint-disable-next-line no-unused-vars
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Authentication error:', userError);
      throw userError;
    }

    console.log('Creating evaluation day with:', {
      examiner_id: examinerId,
      evaluation_date: evaluationDate
    });

    // Format date correctly if it's a string
    let formattedDate = evaluationDate;
    if (typeof evaluationDate === 'string') {
      formattedDate = evaluationDate.trim();
    }

    // Create evaluation day
    const { data, error } = await supabase
      .from('evaluation_days')
      .insert({
        examiner_id: examinerId,
        evaluation_date: formattedDate
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating evaluation day:', error);
      console.error('Error details:', error.details, error.hint, error.message);
      throw error;
    }
    
    console.log('Successfully created evaluation day:', data);
    return data;
  } catch (error) {
    console.error('Error creating evaluation day:', error);
    throw error;
  }
};

/**
 * Get all evaluation days for an examiner
 * @param {string} examinerId - Examiner UUID
 * @returns {Promise} Promise with the result
 */
export const getEvaluationDays = async (examinerId) => {
  try {
    // Get current user
    // eslint-disable-next-line no-unused-vars
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    // Get all evaluation days for the examiner
    const { data: days, error: daysError } = await supabase
      .from('evaluation_days')
      .select(`
        id,
        evaluation_date,
        created_at
      `)
      .eq('examiner_id', examinerId)
      .order('evaluation_date', { ascending: false });

    if (daysError) throw daysError;

    // For each day, get the staff evaluations count and total papers
    const enhancedDays = await Promise.all(days.map(async day => {
      const { data: staffEvaluations, error: staffError } = await supabase
        .from('staff_evaluations')
        .select('papers_evaluated')
        .eq('evaluation_day_id', day.id);

      if (staffError) throw staffError;

      const totalPapers = staffEvaluations?.reduce((sum, s) => sum + s.papers_evaluated, 0) || 0;
      const staffCount = staffEvaluations?.length || 0;

      return {
        ...day,
        total_papers: totalPapers,
        staff_count: staffCount
      };
    }));

    return enhancedDays || [];
  } catch (error) {
    console.error('Error fetching evaluation days:', error);
    throw error;
  }
};

/**
 * Get evaluation day with staff details
 * @param {string} evaluationDayId - Evaluation day UUID
 * @returns {Promise} Promise with the result
 */
export const getEvaluationDayWithStaff = async (evaluationDayId) => {
  try {
    // Get the evaluation day
    const { data: evaluationDay, error: evaluationDayError } = await supabase
      .from('evaluation_days')
      .select('*')
      .eq('id', evaluationDayId)
      .single();

    if (evaluationDayError) throw evaluationDayError;

    // Get the staff evaluations
    const { data: staffEvaluations, error: staffError } = await supabase
      .from('staff_evaluations')
      .select('*')
      .eq('evaluation_day_id', evaluationDayId);

    if (staffError) throw staffError;

    // Calculate total papers and format staff details
    const totalPapers = staffEvaluations?.reduce((sum, s) => sum + s.papers_evaluated, 0) || 0;
    const staffDetails = staffEvaluations?.map(s => ({
      id: s.id,
      name: s.staff_name,
      papersEvaluated: s.papers_evaluated
    })) || [];

    return {
      ...evaluationDay,
      total_papers: totalPapers,
      staff_count: staffDetails.length,
      staffDetails
    };
  } catch (error) {
    console.error('Error fetching evaluation day with staff:', error);
    throw error;
  }
};

/**
 * Save staff evaluations for an evaluation day
 * @param {string} evaluationDayId - Evaluation day UUID
 * @param {Array} staffDetails - Array of staff detail objects
 * @returns {Promise} Promise with the result
 */
export const saveStaffEvaluations = async (evaluationDayId, staffDetails) => {
  try {
    // Get current user - still need this for logging purposes
    // eslint-disable-next-line no-unused-vars
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    console.log(`User ${user.id} saving staff evaluations for evaluation day ${evaluationDayId}`);

    // Get existing staff evaluations to handle updates vs inserts
    const { data: existingEvaluations, error: existingError } = await supabase
      .from('staff_evaluations')
      .select('id')
      .eq('evaluation_day_id', evaluationDayId);
      
    if (existingError) {
      console.error('Error fetching existing staff evaluations:', existingError);
      throw existingError;
    }
    
    // Create maps to track which records to update, insert, or delete
    const existingIds = new Set(existingEvaluations?.map(e => e.id) || []);
    const providedIds = new Set(staffDetails.filter(s => s.id).map(s => s.id));
    
    // IDs that exist in the database but not in the provided data should be deleted
    const idsToDelete = [...existingIds].filter(id => !providedIds.has(id));
    
    // Format records for update or insert
    const recordsToUpsert = staffDetails.map(staff => {
      // Create a base record without an ID field
      const record = {
        evaluation_day_id: evaluationDayId,
        staff_name: staff.name,
        papers_evaluated: staff.papersEvaluated
      };
      
      // Only add id if it's an existing record with a valid ID
      if (staff.id && typeof staff.id === 'string' && staff.id.trim() !== '') {
        record.id = staff.id;
      }
      
      return record;
    });
    
    console.log(`Processing staff evaluations: ${recordsToUpsert.length} to upsert, ${idsToDelete.length} to delete`);
    
    // Delete records that are no longer needed
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('staff_evaluations')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) {
        console.error('Error deleting staff evaluations:', deleteError);
        throw deleteError;
      }
    }
    
    // Upsert records (will update if id is provided, insert if not)
    const { data, error } = await supabase
      .from('staff_evaluations')
      .upsert(recordsToUpsert)
      .select();
      
    if (error) {
      console.error('Error upserting staff evaluations:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error saving staff evaluations:', error);
    throw error;
  }
};

/**
 * Update an evaluation day
 * @param {string} evaluationDayId - Evaluation day UUID
 * @param {object} updates - Fields to update
 * @returns {Promise} Promise with the result
 */
export const updateEvaluationDay = async (evaluationDayId, updates) => {
  try {
    // Get current user
    // eslint-disable-next-line no-unused-vars
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('evaluation_days')
      .update(updates)
      .eq('id', evaluationDayId)
      .select()
      .single();

    if (error) {
      console.error('Error updating evaluation day:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating evaluation day:', error);
    throw error;
  }
};

/**
 * Delete an evaluation day and its staff evaluations
 * @param {string} evaluationDayId - Evaluation day UUID
 * @returns {Promise} Promise with the result
 */
export const deleteEvaluationDay = async (evaluationDayId) => {
  try {
    // Get current user
    // eslint-disable-next-line no-unused-vars
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    // Due to CASCADE delete, we only need to delete the evaluation day
    const { data, error } = await supabase
      .from('evaluation_days')
      .delete()
      .eq('id', evaluationDayId);

    if (error) {
      console.error('Error deleting evaluation day:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error deleting evaluation day:', error);
    throw error;
  }
};

/**
 * Delete a staff evaluation
 * @param {string} staffEvaluationId - Staff evaluation UUID
 * @returns {Promise} Promise with the result
 */
export const deleteStaffEvaluation = async (staffEvaluationId) => {
  try {
    const { data, error } = await supabase
      .from('staff_evaluations')
      .delete()
      .eq('id', staffEvaluationId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting staff evaluation:', error);
    throw error;
  }
};

/**
 * Get staff evaluations for an evaluation day
 * @param {string} evaluationDayId - Evaluation day UUID
 * @returns {Promise} Promise with the staff evaluations
 */
export const getStaffEvaluations = async (evaluationDayId) => {
  try {
    console.log(`Fetching staff evaluations for evaluation day ${evaluationDayId}`);
    
    // Get the staff evaluations
    const { data: staffEvaluations, error: staffError } = await supabase
      .from('staff_evaluations')
      .select('*')
      .eq('evaluation_day_id', evaluationDayId);

    if (staffError) {
      console.error('Error fetching staff evaluations:', staffError);
      throw staffError;
    }

    console.log(`Found ${staffEvaluations?.length || 0} staff evaluations`);
    return staffEvaluations || [];
  } catch (error) {
    console.error('Error fetching staff evaluations:', error);
    throw error;
  }
};

// Export as service object
const staffService = {
  createEvaluationDay,
  getEvaluationDays,
  getEvaluationDayWithStaff,
  saveStaffEvaluations,
  updateEvaluationDay,
  deleteEvaluationDay,
  deleteStaffEvaluation,
  getStaffEvaluations
};

export default staffService; 