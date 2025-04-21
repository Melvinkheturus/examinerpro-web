const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/examiners');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'examiner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

/**
 * @route   GET /api/examiners
 * @desc    Get all examiners
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('examiners')
      .select('*');
      
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching examiners:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/examiners/:id
 * @desc    Get examiner by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Examiner not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching examiner:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/examiners
 * @desc    Create a new examiner
 * @access  Private
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { fullname, examinerid, department, email, phone } = req.body;
    
    if (!fullname || !examinerid) {
      return res.status(400).json({ message: 'Name and ID are required' });
    }
    
    // Prepare examiner data
    const examinerData = {
      fullname,
      examinerid,
      department: department || null,
      email: email || null,
      phone: phone || null,
      image_path: req.file ? req.file.path : null,
      user_id: req.user.id,
      created_at: new Date()
    };
    
    // Insert examiner
    const { data, error } = await supabase
      .from('examiners')
      .insert(examinerData)
      .select();
      
    if (error) throw error;
    
    res.status(201).json({ 
      message: 'Examiner created successfully',
      examiner: data[0]
    });
  } catch (error) {
    console.error('Error creating examiner:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/examiners/:id
 * @desc    Update examiner
 * @access  Private
 */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { fullname, examinerid, department, email, phone } = req.body;
    
    if (!fullname || !examinerid) {
      return res.status(400).json({ message: 'Name and ID are required' });
    }
    
    // Get current examiner to check if image needs to be updated
    const { data: currentExaminer, error: fetchError } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (fetchError) throw fetchError;
    
    if (!currentExaminer) {
      return res.status(404).json({ message: 'Examiner not found' });
    }
    
    // Prepare examiner data for update
    const examinerData = {
      fullname,
      examinerid,
      department: department || null,
      email: email || null,
      phone: phone || null,
      updated_at: new Date()
    };
    
    // Update image path if new image uploaded
    if (req.file) {
      examinerData.image_path = req.file.path;
      
      // Delete old image if it exists
      if (currentExaminer.image_path && fs.existsSync(currentExaminer.image_path)) {
        fs.unlinkSync(currentExaminer.image_path);
      }
    }
    
    // Update examiner
    const { data, error } = await supabase
      .from('examiners')
      .update(examinerData)
      .eq('id', req.params.id)
      .select();
      
    if (error) throw error;
    
    res.json({
      message: 'Examiner updated successfully',
      examiner: data[0]
    });
  } catch (error) {
    console.error('Error updating examiner:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/examiners/:id
 * @desc    Delete examiner
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    // Get examiner to delete their image if it exists
    const { data: examiner, error: fetchError } = await supabase
      .from('examiners')
      .select('*')
      .eq('id', req.params.id)
      .single();
      
    if (fetchError) throw fetchError;
    
    if (!examiner) {
      return res.status(404).json({ message: 'Examiner not found' });
    }
    
    // Delete the examiner
    const { error } = await supabase
      .from('examiners')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    
    // Delete image if it exists
    if (examiner.image_path && fs.existsSync(examiner.image_path)) {
      fs.unlinkSync(examiner.image_path);
    }
    
    res.json({ message: 'Examiner deleted successfully' });
  } catch (error) {
    console.error('Error deleting examiner:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 