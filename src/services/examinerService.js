import { supabase } from '../lib/supabase';

// Cache for examiner statistics to prevent repeated API calls
const statisticsCache = new Map();

/**
 * Get all examiners with filtering, sorting and pagination
 * @param {string} searchTerm - Search term for filtering
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort direction (asc or desc)
 * @param {string} filterDepartment - Department to filter by
 * @param {number} page - Page number for pagination
 * @param {number} pageSize - Number of items per page
 * @returns {Promise} Promise object with examiner data
 */
export const getExaminers = async (
  searchTerm = '',
  sortBy = 'full_name',
  sortOrder = 'asc',
  filterDepartment = '',
  page = 1,
  pageSize = 100
) => {
  try {
    // Start building the query
    let query = supabase
      .from('examiners')
      .select('*');
    
    // Apply search filter if provided
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,examiner_id.ilike.%${searchTerm}%`);
    }
    
    // Apply department filter if provided
    if (filterDepartment) {
      query = query.eq('department', filterDepartment);
    }
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination - ensure the page is at least 1 to avoid negative offset
    const validPage = Math.max(1, page);
    const from = (validPage - 1) * pageSize;
    // No need to specify 'to' as Supabase will handle it with the limit
    query = query.range(from, from + pageSize - 1);
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || []; // Return empty array if data is null
  } catch (error) {
    console.error('Error fetching examiners:', error);
    // Return empty array instead of throwing to prevent app crashing
    return [];
  }
};

/**
 * Get examiner by ID
 * @param {string} examinerId - Examiner ID
 * @returns {Promise} Promise object with examiner data
 */
export const getExaminerById = async (examinerId) => {
  try {
    // First try to find by examiner_id
    let { data, error } = await supabase
      .from('examiners')
      .select('*')
      .eq('examiner_id', examinerId);
    
    if (error) throw error;
    
    // If not found by examiner_id, try to find by id
    if (!data || data.length === 0) {
      const { data: dataById, error: errorById } = await supabase
        .from('examiners')
        .select('*')
        .eq('id', examinerId);
      
      if (errorById) throw errorById;
      
      if (!dataById || dataById.length === 0) {
        throw new Error(`No examiner found with ID: ${examinerId}`);
      }
      
      data = dataById;
    }
    
    // If we got multiple rows, just return the first one
    return data[0];
  } catch (error) {
    console.error(`Error fetching examiner with ID ${examinerId}:`, error);
    throw error;
  }
};

/**
 * Create a new examiner
 * @param {Object} examinerData - Examiner data
 * @returns {Promise} Promise object with created examiner
 */
export const createExaminer = async (examinerData) => {
  try {
    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    if (!userData || !userData.user) {
      throw new Error('You must be logged in to create an examiner');
    }
    
    // Add the user_id to the examiner data
    const dataWithUserId = {
      ...examinerData,
      user_id: userData.user.id
    };
    
    const { data, error } = await supabase
      .from('examiners')
      .insert(dataWithUserId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error creating examiner:', error);
    throw error;
  }
};

/**
 * Update an examiner
 * @param {string} examinerId - Examiner ID
 * @param {Object} examinerData - Updated examiner data
 * @returns {Promise} Promise object with updated examiner
 */
export const updateExaminer = async (examinerId, examinerData) => {
  try {
    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    if (!userData || !userData.user) {
      throw new Error('You must be logged in to update an examiner');
    }
    
    // Add the user_id to the examiner data
    const dataWithUserId = {
      ...examinerData,
      user_id: userData.user.id
    };
    
    // First try to find examiner by UUID id (primary key)
    let { data: examinerExists, error: examinerError } = await supabase
      .from('examiners')
      .select('id, examiner_id')
      .eq('id', examinerId)
      .limit(1);
    
    if (examinerError) throw examinerError;
    
    // If not found by id, try by examiner_id field
    if (!examinerExists || examinerExists.length === 0) {
      const { data: dataByExaminerId, error: errorByExaminerId } = await supabase
        .from('examiners')
        .select('id, examiner_id')
        .eq('examiner_id', examinerId)
        .limit(1);
      
      if (errorByExaminerId) throw errorByExaminerId;
      
      if (!dataByExaminerId || dataByExaminerId.length === 0) {
        return { 
          success: false, 
          message: `Examiner with ID ${examinerId} not found` 
        };
      }
      
      examinerExists = dataByExaminerId;
    }
    
    // We found the examiner, proceed with update using the correct ID
    const recordId = examinerExists[0].id;
    
    const { data, error } = await supabase
      .from('examiners')
      .update(dataWithUserId)
      .eq('id', recordId)
      .select();
    
    if (error) throw error;
    
    return { success: true, data: data[0] };
  } catch (error) {
    console.error(`Error updating examiner with ID ${examinerId}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete an examiner
 * @param {string} examinerId - Examiner ID
 * @returns {Promise} Promise object with deleted examiner
 */
export const deleteExaminer = async (examinerId) => {
  try {
    // First check if the examiner exists by examiner_id
    let { data: examinerData, error: examinerError } = await supabase
      .from('examiners')
      .select('examiner_id')
      .eq('examiner_id', examinerId)
      .limit(1);
    
    if (examinerError) throw examinerError;
    
    // If not found by examiner_id, try to find by id
    if (!examinerData || examinerData.length === 0) {
      const { data: dataById, error: errorById } = await supabase
        .from('examiners')
        .select('examiner_id')
        .eq('id', examinerId)
        .limit(1);
      
      if (errorById) throw errorById;
      
      if (!dataById || dataById.length === 0) {
        console.warn(`Examiner with ID ${examinerId} not found, nothing to delete`);
        return { success: true, message: 'Examiner not found, nothing to delete' };
      }
      
      examinerData = dataById;
    }
    
    // Proceed with deletion
    const { data, error } = await supabase
      .from('examiners')
      .delete()
      .eq('examiner_id', examinerData[0].examiner_id)
      .select();
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error(`Error deleting examiner with ID ${examinerId}:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Get statistics for an examiner
 * @param {string} examinerId - Examiner ID
 * @returns {Promise} Promise object with examiner statistics
 */
export const getExaminerStatistics = async (examinerId) => {
  try {
    // Check if we have cached statistics
    if (statisticsCache.has(examinerId)) {
      return statisticsCache.get(examinerId);
    }
    
    // First, get the examiner's ID format (either UUID or examiner_id)
    const { data: examinerData, error: examinerError } = await supabase
      .from('examiners')
      .select('id, examiner_id')
      .or(`id.eq.${examinerId},examiner_id.eq.${examinerId}`)
      .single();
    
    if (examinerError) throw examinerError;
    
    if (!examinerData) {
      throw new Error(`No examiner found with ID: ${examinerId}`);
    }
    
    // Get examiner's UUID (id) - this is what we need to use for all queries
    const examinerUuid = examinerData.id;
    
    // 1. Get staff evaluations with a join to evaluation_days
    const { data: staffEvaluationsData, error: staffError } = await supabase
      .from('staff_evaluations')
      .select('papers_evaluated, evaluation_day:evaluation_days(examiner_id)')
      .eq('evaluation_day.examiner_id', examinerUuid); // Use UUID, not the string ID
    
    if (staffError) throw staffError;
    
    // 2. Get calculation documents to calculate total earnings
    const { data: calculationDocuments, error: calcError } = await supabase
      .from('calculation_documents')
      .select('final_amount')
      .eq('examiner_id', examinerUuid); // Use UUID, not string ID
    
    if (calcError) throw calcError;
    
    // 3. Get evaluation days to calculate total days
    const { data: evaluationDays, error: daysError } = await supabase
      .from('evaluation_days')
      .select('id, evaluation_date')
      .eq('examiner_id', examinerUuid); // Use UUID, not string ID
    
    if (daysError) throw daysError;
    
    // Calculate the statistics using the joined data
    const totalPapers = staffEvaluationsData?.reduce((sum, record) => 
      sum + (record.papers_evaluated || 0), 0) || 0;
    
    const totalEarnings = calculationDocuments?.reduce((sum, c) => 
      sum + (c.final_amount || 0), 0) || 0;
    
    const totalEvaluationDays = evaluationDays?.length || 0;
    
    const avgPapersPerDay = totalEvaluationDays > 0 
      ? Math.round(totalPapers / totalEvaluationDays)
      : 0;
    
    // Create statistics object
    const statistics = {
      total_papers: totalPapers,
      total_earnings: totalEarnings,
      total_staff: totalEvaluationDays,
      average_papers_per_day: avgPapersPerDay
    };
    
    // Cache the statistics
    statisticsCache.set(examinerId, statistics);
    
    return statistics;
  } catch (error) {
    console.error(`Error fetching statistics for examiner with ID ${examinerId}:`, error);
    // Return default statistics instead of throwing
    const defaultStats = {
      total_papers: 0,
      total_earnings: 0,
      total_staff: 0,
      average_papers_per_day: 0
    };
    return defaultStats;
  }
};

/**
 * Upload a profile picture for an examiner
 * @param {string} examinerId - Examiner ID
 * @param {File} file - File object to upload
 * @returns {Promise} Promise object with uploaded file URL
 */
export const uploadProfilePicture = async (examinerId, file) => {
  try {
    // Generate a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `profile-${examinerId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;
    
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('examiner-profiles')  // Updated bucket name
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // Get the public URL for the file
    const { data: publicUrlData } = supabase
      .storage
      .from('examiner-profiles')  // Updated bucket name
      .getPublicUrl(filePath);
    
    // Update the examiner's profile_url field
    const { error: updateError } = await supabase
      .from('examiners')
      .update({ profile_url: publicUrlData.publicUrl })
      .eq('examiner_id', examinerId);
    
    if (updateError) throw updateError;
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading profile picture for examiner with ID ${examinerId}:`, error);
    throw error;
  }
}; 