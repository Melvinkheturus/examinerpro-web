const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Import routes
const authRoutes = require('./routes/auth.routes');
const staffRoutes = require('./routes/staff');
const calculationRoutes = require('./routes/calculations');
const examinerRoutes = require('./routes/examiners');
// Settings are now handled directly via Supabase

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = 'https://zampawknbmlrnhsaacqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbXBhd2tuYm1scm5oc2FhY3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MDYyNDksImV4cCI6MjA1NzA4MjI0OX0.IpNVkj9_ErG77aNbzXPULI4IXM6_iU2DAgFtLMZoUCA';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: 'https://zampawknbmlrnhsaacqm.supabase.co/auth/v1/callback'
  }
});

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON bodies

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    // Add user to request
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', authenticate, staffRoutes);
app.use('/api/calculations', authenticate, calculationRoutes);
app.use('/api/examiners', authenticate, examinerRoutes);
// Settings are now handled directly via Supabase client

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../build')));
  
  // Serve the React app for any other routes
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 