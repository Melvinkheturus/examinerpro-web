const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * @route   GET /api/staff
 * @desc    Get all staff records
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*');
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching staff:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/staff
 * @desc    Create multiple staff records with their paper counts
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const { staffDetails, totalPapers } = req.body;
    
    if (!staffDetails || !Array.isArray(staffDetails) || staffDetails.length === 0) {
      return res.status(400).json({ message: 'Staff details are required and must be an array' });
    }
    
    // Prepare data for insertion
    const staffData = staffDetails.map(staff => ({
      name: staff.name,
      papers_evaluated: parseInt(staff.papers),
      // Add additional fields as needed (e.g., user_id, exam_id, etc.)
      user_id: req.user.id, // Assuming authentication middleware adds user to req
      created_at: new Date()
    }));
    
    // Insert staff data
    const { data, error } = await supabase
      .from('staff')
      .insert(staffData)
      .select();
      
    if (error) throw error;
    
    // Create a summary record if needed
    const { error: summaryError } = await supabase
      .from('evaluation_summary')
      .insert({
        total_papers: totalPapers,
        staff_count: staffDetails.length,
        user_id: req.user.id,
        created_at: new Date()
      });
      
    if (summaryError) throw summaryError;
    
    res.status(201).json({ 
      message: 'Staff details saved successfully',
      staff: data
    });
  } catch (error) {
    console.error('Error saving staff data:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/staff/:id
 * @desc    Get staff record by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching staff:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/staff/:id
 * @desc    Update staff record
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, papers } = req.body;
    
    if (!name || !papers) {
      return res.status(400).json({ message: 'Name and papers are required' });
    }
    
    const { data, error } = await supabase
      .from('staff')
      .update({
        name,
        papers_evaluated: parseInt(papers),
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .select();
      
    if (error) throw error;
    
    res.json({
      message: 'Staff updated successfully',
      staff: data[0]
    });
  } catch (error) {
    console.error('Error updating staff:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/staff/:id
 * @desc    Delete staff record
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 