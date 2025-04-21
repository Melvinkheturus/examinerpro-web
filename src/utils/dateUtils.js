/**
 * Format a date using a standard locale and format options
 * @param {Date|string} date Date object or ISO string
 * @param {Object} options Additional formatting options to override defaults
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Default formatting options
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    // Merge default options with any overrides
    const formattingOptions = { ...defaultOptions, ...options };
    
    // Use en-IN locale for consistency
    return dateObj.toLocaleDateString('en-IN', formattingOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}; 