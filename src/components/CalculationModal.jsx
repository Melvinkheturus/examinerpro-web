import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Modal from './Modal';
import { DocumentIcon } from './IllustratedIcons';
import { formatDate } from '../utils/dateUtils';

/**
 * CalculationModal component - Displays detailed information about a calculation
 * 
 * @param {Object} data - The calculation data to display
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Function to call when the modal is closed
 * @returns {JSX.Element}
 */
const CalculationModal = ({ data, isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  
  if (!data) return null;

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

  // Calculate derived values if not provided
  const baseSalary = data.daily_rate * data.total_days || 0;
  const incentiveAmount = data.total_papers * data.paper_rate || 0;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Calculation Details"
      size="md"
      className={`rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-violet-50'}`}
    >
      <div className="py-2">
        {/* Examiner Info Section */}
        <div className="flex items-center mb-4">
          <img 
            src={data.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.examiner_name || 'Unknown')}&background=${isDarkMode ? '0369a1' : '3b82f6'}&color=ffffff&size=128`}
            alt={data.examiner_name || 'Examiner'} 
            className="w-12 h-12 rounded-full mr-4 object-cover"
          />
          <div>
            <h3 className={`font-medium text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{data.examiner_name || 'Unknown Examiner'}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID: {data.examiner_id || 'N/A'}</p>
          </div>
        </div>

        {/* Calculation Details */}
        <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} mb-4`}>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Calculation Date:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{formatDisplayDate(data.created_at)}</span>

            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Days:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{data.total_days || 0}</span>

            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Papers:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{data.total_papers || 0}</span>

            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Daily Rate:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{formatCurrency(data.daily_rate || 0)}</span>

            <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Paper Rate:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{formatCurrency(data.paper_rate || 0)}</span>
          </div>
        </div>

        {/* Calculation Breakdown */}
        <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} mb-4`}>
          <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Calculation Breakdown</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Base Salary ({data.total_days || 0} days × {formatCurrency(data.daily_rate || 0)})</span>
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(baseSalary)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Incentive ({data.total_papers || 0} papers × {formatCurrency(data.paper_rate || 0)})</span>
              <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatCurrency(incentiveAmount)}</span>
            </div>
            
            <div className="border-t border-dashed mt-2 pt-2">
              <div className="flex justify-between items-center">
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total Amount</span>
                <span className={`text-lg font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>{formatCurrency(data.total_amount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section (if available) */}
        {data.notes && (
          <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-white'} mb-4`}>
            <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notes</h4>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{data.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-4">
          {data.document_url && (
            <a 
              href={data.document_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`flex items-center text-sm font-medium ${isDarkMode ? 'text-purple-300 hover:text-purple-200' : 'text-purple-600 hover:text-purple-700'}`}
            >
              <DocumentIcon className="w-4 h-4 mr-1" />
              Download PDF
            </a>
          )}
          
          <button 
            onClick={onClose}
            className={`text-sm font-medium ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'}`}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CalculationModal; 