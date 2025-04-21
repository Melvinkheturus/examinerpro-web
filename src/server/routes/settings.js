const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Setting = require('../models/Setting');
const { errorHandler } = require('../utils/errorHandler');
const mongoose = require('mongoose');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/backups');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `backup_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Only accept .db files
    if (path.extname(file.originalname) !== '.db') {
      return cb(new Error('Only database backup files are allowed'));
    }
    cb(null, true);
  }
});

// Initialize default settings when the server starts
const initializeSettings = async () => {
  try {
    await Setting.initializeDefaults();
    console.log('Default settings initialized');
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
};

initializeSettings();

/**
 * @route GET /api/settings
 * @desc Get all settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.find();
    const formattedSettings = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    
    res.status(200).json(formattedSettings);
  } catch (error) {
    errorHandler(error, res);
  }
});

/**
 * @route PUT /api/settings/theme
 * @desc Update theme setting
 */
router.put('/theme', async (req, res) => {
  try {
    const { isDarkMode } = req.body;
    
    if (typeof isDarkMode !== 'boolean') {
      return res.status(400).json({ message: 'isDarkMode must be a boolean value' });
    }
    
    const setting = await Setting.findOneAndUpdate(
      { key: 'theme' },
      { value: { isDarkMode } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(setting);
  } catch (error) {
    errorHandler(error, res);
  }
});

/**
 * @route PUT /api/settings/pdf-location
 * @desc Update PDF save location
 */
router.put('/pdf-location', async (req, res) => {
  try {
    const { location } = req.body;
    
    if (!location || typeof location !== 'string') {
      return res.status(400).json({ message: 'Location must be a valid string' });
    }
    
    const setting = await Setting.findOneAndUpdate(
      { key: 'pdfSaveLocation' },
      { value: location },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(setting);
  } catch (error) {
    errorHandler(error, res);
  }
});

/**
 * @route PUT /api/settings/evaluation-rate
 * @desc Update evaluation rate
 */
router.put('/evaluation-rate', async (req, res) => {
  try {
    const { rate } = req.body;
    
    if (isNaN(rate) || rate <= 0) {
      return res.status(400).json({ message: 'Rate must be a positive number' });
    }
    
    const setting = await Setting.findOneAndUpdate(
      { key: 'evaluationRate' },
      { value: parseFloat(rate) },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(setting);
  } catch (error) {
    errorHandler(error, res);
  }
});

/**
 * @route POST /api/settings/backup
 * @desc Backup the database
 */
router.post('/backup', async (req, res) => {
  try {
    // Create a backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../../uploads/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFilename = `chief_examiner_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Use MongoDB's native backup mechanism
    // For a simple approach, we'll just export collections to JSON files
    const collections = mongoose.connection.collections;
    const backup = {};
    
    for (const [name, collection] of Object.entries(collections)) {
      const documents = await collection.find({}).toArray();
      backup[name] = documents;
    }
    
    // Write the backup to a file
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    // Send the file as a download
    res.download(backupPath, backupFilename, (err) => {
      if (err) {
        errorHandler(err, res);
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
});

/**
 * @route POST /api/settings/restore
 * @desc Restore database from backup
 */
router.post('/restore', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No backup file provided' });
    }
    
    const backupFilePath = req.file.path;
    
    // Read and parse the backup file
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    // Clear existing collections and restore from backup
    for (const [collectionName, documents] of Object.entries(backupData)) {
      if (mongoose.connection.collections[collectionName]) {
        await mongoose.connection.collections[collectionName].deleteMany({});
        
        if (documents.length > 0) {
          await mongoose.connection.collections[collectionName].insertMany(
            documents.map(doc => {
              // Convert string IDs back to ObjectIds
              if (doc._id && typeof doc._id === 'string') {
                doc._id = new mongoose.Types.ObjectId(doc._id);
              }
              return doc;
            })
          );
        }
      }
    }
    
    // Clean up - remove the uploaded file
    fs.unlinkSync(backupFilePath);
    
    res.status(200).json({ message: 'Database restored successfully' });
  } catch (error) {
    // Clean up the uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    errorHandler(error, res);
  }
});

/**
 * @route POST /api/settings/clear
 * @desc Clear all application data
 */
router.post('/clear', async (req, res) => {
  try {
    // Get all collections except settings and users
    const collections = mongoose.connection.collections;
    
    for (const [name, collection] of Object.entries(collections)) {
      if (name !== 'settings' && name !== 'users') {
        await collection.deleteMany({});
      }
    }
    
    res.status(200).json({ message: 'All data cleared successfully' });
  } catch (error) {
    errorHandler(error, res);
  }
});

module.exports = router; 