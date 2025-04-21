import React, { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '../contexts/ThemeContext';

const CustomDatePicker = ({ selectedDate, onChange, placeholder }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  
  // Update inputValue when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setInputValue(`${day}-${month}-${year}`);
    } else {
      setInputValue('');
    }
  }, [selectedDate]);

  // Add custom styles to head once on component mount
  useEffect(() => {
    // Create a style element if it doesn't exist
    const styleId = 'react-datepicker-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = getCustomStyles(isDarkMode);
      document.head.appendChild(styleEl);
      
      // Clean up on unmount
      return () => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
      };
    } else {
      // Update existing styles if theme changes
      const existingStyle = document.getElementById(styleId);
      existingStyle.textContent = getCustomStyles(isDarkMode);
    }
  }, [isDarkMode]);
  
  // Handle direct input from the user with auto-formatting
  const handleInputChange = (e) => {
    const rawValue = e.target.value;
    
    // First, just update the displayed value to whatever the user typed
    setInputValue(rawValue);
    
    // If the input is empty, clear the date
    if (!rawValue.trim()) {
      onChange(null);
      return;
    }
    
    // If the input has a valid date format (dd-mm-yyyy), attempt to parse it
    const datePattern = /^(\d{2})-(\d{2})-(\d{1,4})$/;
    const match = rawValue.match(datePattern);
    
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
      const year = parseInt(match[3], 10);
      
      const parsedDate = new Date(year, month, day);
      
      // Check if the date is valid
      if (!isNaN(parsedDate.getTime())) {
        onChange(parsedDate);
      }
    } else {
      // Not a complete date yet - try to auto-format
      
      // Remove any non-digits for auto-formatting
      const digitsOnly = rawValue.replace(/\D/g, '');
      
      // Limit the total number of digits to 8 (dd-mm-yyyy format)
      const limitedDigits = digitsOnly.substring(0, 8);
      
      // Auto-insert hyphens
      if (limitedDigits.length > 2 && limitedDigits.length <= 4) {
        // Format: dd-mm
        const day = limitedDigits.substring(0, 2);
        const month = limitedDigits.substring(2);
        const formatted = `${day}-${month}`;
        
        if (formatted !== rawValue) {
          setInputValue(formatted);
        }
      } else if (limitedDigits.length > 4 && limitedDigits.length <= 8) {
        // Format: dd-mm-yyyy
        const day = limitedDigits.substring(0, 2);
        const month = limitedDigits.substring(2, 4);
        
        // Get only up to 4 digits for year
        const year = limitedDigits.substring(4, 8);
        
        const formatted = `${day}-${month}-${year}`;
        
        if (formatted !== rawValue) {
          setInputValue(formatted);
        }
        
        // If we have a full date, try to parse as a date
        if (limitedDigits.length >= 6) {
          const fullDay = parseInt(day, 10);
          const fullMonth = parseInt(month, 10) - 1; // JS months are 0-indexed
          const fullYear = parseInt(year, 10);
          
          const parsedDate = new Date(fullYear, fullMonth, fullDay);
          
          // Check if the date is valid
          if (!isNaN(parsedDate.getTime())) {
            onChange(parsedDate);
          }
        }
      }
    }
  };
  
  // Handle calendar icon click
  const handleCalendarClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };
  
  // Clear the date
  const handleClear = (e) => {
    e.stopPropagation();
    setInputValue('');
    onChange(null);
  };
  
  // Handle date selection from the picker
  const handleDateSelected = (date) => {
    onChange(date);
    setIsOpen(false);
  };

  // Handle clear button click from the calendar footer
  const handleClearFromCalendar = () => {
    setInputValue('');
    onChange(null);
    setIsOpen(false);
  };

  // Handle today button click from the calendar footer
  const handleTodayClick = () => {
    const today = new Date();
    onChange(today);
    setIsOpen(false);
  };
  
  // Helper function to generate styles based on theme
  const getCustomStyles = (isDark) => `
    .react-datepicker-wrapper {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    
    .react-datepicker__input-container {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    
    .react-datepicker {
      font-family: 'Inter', system-ui, sans-serif;
      border-radius: 0.5rem;
      border: 1px solid ${isDark ? '#4B5563' : '#E5E7EB'};
      box-shadow: 0px 4px 14px rgba(0,0,0,0.1);
      background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
      z-index: 30;
    }
    
    .react-datepicker__header {
      background-color: ${isDark ? '#374151' : '#EFF6FF'};
      border-bottom: 1px solid ${isDark ? '#4B5563' : '#E5E7EB'};
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
    }
    
    .react-datepicker__current-month, 
    .react-datepicker__day-name {
      color: ${isDark ? '#F3F4F6' : '#1F2937'};
    }
    
    .react-datepicker__day {
      color: ${isDark ? '#D1D5DB' : '#374151'};
    }
    
    .react-datepicker__day--selected, 
    .react-datepicker__day--keyboard-selected {
      background-color: #3B82F6;
      color: white;
      border-radius: 0.25rem;
    }
    
    .react-datepicker__day:hover {
      background-color: ${isDark ? '#6B7280' : '#BFDBFE'};
      border-radius: 0.25rem;
    }
    
    .react-datepicker__triangle {
      display: none;
    }

    .react-datepicker__year-dropdown {
      background-color: ${isDark ? '#374151' : '#FFFFFF'};
      color: ${isDark ? '#F3F4F6' : '#1F2937'};
      border: 1px solid ${isDark ? '#4B5563' : '#E5E7EB'};
      border-radius: 0.25rem;
    }

    .react-datepicker__year-option {
      padding: 0.25rem;
    }

    .react-datepicker__year-option:hover {
      background-color: ${isDark ? '#4B5563' : '#DBEAFE'};
    }

    .calendar-footer {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      border-top: 1px solid ${isDark ? '#4B5563' : '#E5E7EB'};
      background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
    }

    .calendar-footer button {
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      border: none;
      cursor: pointer;
    }

    .clear-btn {
      color: #EF4444;
    }

    .clear-btn:hover {
      color: #DC2626;
    }

    .today-btn {
      color: #3B82F6;
    }

    .today-btn:hover {
      color: #2563EB;
    }
  `;

  return (
    <div className="h-[38px] relative">
      {/* Our own custom input field for direct typing */}
      <div className="relative w-full h-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder || "dd-mm-yyyy"}
          autoComplete="off"
          className="block w-full h-full pr-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white py-2"
        />
        <div className="absolute right-0 top-0 h-full flex items-center">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="h-full px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear date"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div 
            className="h-full px-3 flex items-center text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 border-l border-gray-200 dark:border-gray-600"
            onClick={handleCalendarClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Hidden DatePicker only used for the calendar popup */}
      {isOpen && (
        <div className="absolute z-50" style={{ 
          position: 'absolute',
          top: 'calc(100% + 5px)', 
          left: 0,
          maxHeight: '400px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <div className="relative">
            <DatePicker
              selected={selectedDate}
              onChange={handleDateSelected}
              inline
              showPopperArrow={false}
              onClickOutside={() => setIsOpen(false)}
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={15}
            />
            <div className={`calendar-footer ${isDarkMode ? 'dark-footer' : 'light-footer'}`} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderTop: `1px solid ${isDarkMode ? '#4B5563' : '#E5E7EB'}`,
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderBottomLeftRadius: '0.5rem',
              borderBottomRightRadius: '0.5rem'
            }}>
              <button
                className="clear-btn"
                style={{
                  fontSize: '0.875rem',
                  padding: '2px 8px',
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#EF4444',
                  backgroundColor: 'transparent'
                }}
                onClick={handleClearFromCalendar}
              >
                Clear
              </button>
              <button
                className="today-btn"
                style={{
                  fontSize: '0.875rem',
                  padding: '2px 8px',
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#3B82F6',
                  backgroundColor: 'transparent'
                }}
                onClick={handleTodayClick}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker; 