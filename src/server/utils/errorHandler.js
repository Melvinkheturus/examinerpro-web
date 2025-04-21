/**
 * Common error handler for API responses
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 */
const errorHandler = (error, res) => {
  console.error('Error:', error);
  
  // Handle mongoose validation errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ message: 'Validation error', errors });
  }
  
  // Handle mongoose duplicate key errors
  if (error.code === 11000) {
    return res.status(400).json({ 
      message: 'Duplicate key error',
      field: Object.keys(error.keyValue)[0]
    });
  }
  
  // Handle file operation errors
  if (error.code === 'ENOENT') {
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Handle other file system errors
  if (error.code && error.code.startsWith('E')) {
    return res.status(500).json({ message: 'File system error', error: error.message });
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  // Handle multer errors
  if (error.name === 'MulterError') {
    return res.status(400).json({ message: error.message });
  }
  
  // Default error handler
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Something went wrong';
  
  res.status(statusCode).json({ message });
};

module.exports = {
  errorHandler
}; 