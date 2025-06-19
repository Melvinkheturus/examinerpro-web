import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CalculatorIcon } from './IllustratedIcons';
import { formatDate } from '../utils/dateUtils';

/**
 * Helper function to get evaluation days count with improved fallback logic
 * @param {Object} data - Calculation data
 * @returns {number} - The number of evaluation days
 */
const getEvaluationDaysCount = (data) => {
  // Check direct total_days property first
  if (data.total_days && typeof data.total_days === 'number') {
    return data.total_days;
  }
  
  // Check calculation_days array length
  if (data.calculation_days && Array.isArray(data.calculation_days)) {
    return data.calculation_days.length;
  }
  
  // Check evaluationDays array length 
  if (data.evaluationDays && Array.isArray(data.evaluationDays)) {
    return data.evaluationDays.length;
  }
  
  // Check days property as fallback
  if (data.days && typeof data.days === 'number') {
    return data.days;
  }
  
  // If we've exhausted options, use staff as last resort or return 0
  return data.total_staff || 0;
};

/**
 * CalculationCard component - Displays a summary of a calculation record
 * 
 * @param {Object} data - The calculation data
 * @param {Function} onClick - Click handler for the card
 * @returns {JSX.Element}
 */
const CalculationCard = ({ data, onClick }) => {
  const { isDarkMode } = useTheme();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount).replace('₹', 'rs');
  };

  // Format the display date
  const formatDisplayDate = (date) => {
    if (!date) return 'N/A';
    
    return formatDate(date, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get avatar URL for the examiner
  const getAvatarUrl = (name) => {
    if (data.image_url) {
      return data.image_url;
    }
    
    // Generate placeholder with initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Unknown')}&background=${isDarkMode ? '0369a1' : '3b82f6'}&color=ffffff&size=128`;
  };

  return (
    <div 
      onClick={onClick}
      className={`${
        isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
      } rounded-lg shadow-md overflow-hidden transition-all duration-200 cursor-pointer border ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center">
          {/* Profile Image */}
          <div className="mr-4">
            <img 
              src={getAvatarUrl(data.examiner_name)} 
              alt={data.examiner_name || 'Examiner'} 
              className="w-12 h-12 rounded-full object-cover"
            />
          </div>
          
          {/* Calculation Info */}
          <div className="flex-1">
            <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.examiner_name || 'Unknown Examiner'}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ID: {data.examiner_id || 'N/A'}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {formatDisplayDate(data.created_at)}
            </p>
          </div>
          
          {/* Amount */}
          <div className="text-right">
            <p className={`text-lg font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
              {formatCurrency(data.total_amount || 0)}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {data.total_papers || 0} papers
            </p>
          </div>
        </div>
        
        {/* Additional Info / Tags Section */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
          <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full px-2 py-1 flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <CalculatorIcon className="w-3 h-3 mr-1" />
            <span>{getEvaluationDaysCount(data)} days</span>
          </div>
          
          <div className={`${
            data.status === 'completed' 
              ? isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'
              : isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
          } rounded-full px-2 py-1`}>
            {data.status === 'completed' ? 'Completed' : 'Draft'}
          </div>
          
          <button className={`text-sm ${isDarkMode ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-700'}`} onClick={(e) => {
            e.stopPropagation();
            // Handle view details or download functionality
            onClick();
          }}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalculationCard; 