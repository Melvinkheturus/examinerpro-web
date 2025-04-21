import React, { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '../contexts/ThemeContext';

const CustomDatePicker = ({ selectedDate, onChange, placeholder }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showYearView, setShowYearView] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  
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

  // Reset year picker view when datepicker is closed
  useEffect(() => {
    if (!isOpen) {
      setShowYearView(false);
    }
  }, [isOpen]);

  // Add escape key handler to close the calendar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
  
  // Add handler to check if date picker needs repositioning
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const pickerElement = containerRef.current.querySelector('.react-datepicker');
      if (pickerElement) {
        // Get the position and dimensions
        const pickerRect = pickerElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Find the nearest parent with position relative, absolute, or fixed
        let parentElement = containerRef.current.parentElement;
        while (parentElement && 
               getComputedStyle(parentElement).position === 'static' && 
               parentElement !== document.body) {
          parentElement = parentElement.parentElement;
        }
        
        const parentRect = parentElement ? parentElement.getBoundingClientRect() : null;
        
        // Check if the picker extends beyond the viewport or parent container
        if (parentRect) {
          // Check right edge
          if (pickerRect.right > parentRect.right) {
            containerRef.current.style.left = 'auto';
            containerRef.current.style.right = '0';
          }
          
          // Check bottom edge
          if (pickerRect.bottom > parentRect.bottom && pickerRect.bottom > viewportHeight) {
            window.scrollBy({
              top: Math.min(pickerRect.bottom - viewportHeight + 20, pickerRect.bottom - parentRect.bottom + 20),
              behavior: 'smooth'
            });
          }
        } else if (pickerRect.bottom > viewportHeight) {
          window.scrollBy({
            top: pickerRect.bottom - viewportHeight + 20,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [isOpen]);
  
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
    
    // Check if backspace is being used to clear the input
    // If the length is decreasing, don't auto-format yet
    const isDeleting = rawValue.length < inputValue.length;
    if (isDeleting) {
      // Don't auto-format while deleting, just set the value and let the user delete
      if (!rawValue.trim()) {
        onChange(null);
      }
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
  
  // Handle calendar icon click - improve toggle behavior
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
    setShowYearView(false);
  };

  // Toggle year view
  const toggleYearView = () => {
    setShowYearView(!showYearView);
  };

  // Handle year selection
  const handleYearSelected = (date) => {
    // After selecting a year, go back to month view
    setShowYearView(false);
  };
  
  // Navigate to previous set of years
  const navigateToPreviousYears = (date, changeYear) => {
    const newDate = new Date(date);
    newDate.setFullYear(date.getFullYear() - 9);
    // Use changeYear without closing year view
    changeYear(newDate.getFullYear());
    // Important: Return null to prevent the view from changing
    return null;
  };
  
  // Navigate to next set of years
  const navigateToNextYears = (date, changeYear) => {
    const newDate = new Date(date);
    newDate.setFullYear(date.getFullYear() + 9);
    // Use changeYear without closing year view
    changeYear(newDate.getFullYear());
    // Important: Return null to prevent the view from changing
    return null;
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
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
      z-index: 30;
      width: auto !important;
      max-width: 280px;
      font-size: 0.875rem;
      overflow-x: hidden;
      box-sizing: border-box;
      padding: 0 !important;
    }
    
    .react-datepicker__month-container {
      width: 100%;
    }
    
    .react-datepicker__header {
      background-color: ${isDark ? '#374151' : '#EFF6FF'};
      border-bottom: 1px solid ${isDark ? '#4B5563' : '#E5E7EB'};
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      width: 100%;
    }
    
    .react-datepicker__current-month, 
    .react-datepicker__day-name {
      color: ${isDark ? '#F3F4F6' : '#1F2937'};
      margin: 0.15rem;
      font-size: 0.875rem;
    }
    
    .react-datepicker__day-names {
      margin-bottom: 0;
      padding-top: 0.3rem;
      display: flex;
      justify-content: space-around;
      padding: 0 0.5rem;
      width: 100%;
    }
    
    .react-datepicker__month {
      margin: 0.3rem 0;
      width: 100%;
    }
    
    .react-datepicker__week {
      display: flex;
      justify-content: space-around;
      width: 100%;
    }
    
    .react-datepicker__day {
      color: ${isDark ? '#D1D5DB' : '#374151'};
      margin: 0.1rem 0;
      width: 1.6rem;
      line-height: 1.6rem;
      border-radius: 0.25rem;
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
    
    /* Style for days outside the current month */
    .react-datepicker__day--outside-month {
      color: ${isDark ? '#6B7280' : '#9CA3AF'};
      opacity: 0.5;
    }
    
    /* Year selection view styles */
    .react-datepicker__year-wrapper {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 100%;
      margin: 0.5rem auto;
      gap: 0.3rem;
      padding: 0 0.5rem;
    }
    
    .react-datepicker__year-text {
      padding: 0.3rem 0.2rem;
      margin: 0;
      display: inline-block;
      border-radius: 0.25rem;
      color: ${isDark ? '#D1D5DB' : '#374151'};
      text-align: center;
      width: 30%;
      flex: 0 0 auto;
    }
    
    .react-datepicker__year-text:hover {
      background-color: ${isDark ? '#6B7280' : '#DBEAFE'};
    }
    
    .react-datepicker__year-text--selected {
      background-color: #3B82F6 !important;
      color: white !important;
    }
    
    /* Custom year header styles */
    .year-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    
    .year-header-text {
      text-align: center;
      flex-grow: 1;
    }
    
    @media (max-width: 640px) {
      .react-datepicker {
        font-size: 0.8rem;
        max-width: 260px;
      }
      
      .react-datepicker__day {
        width: 1.5rem;
        line-height: 1.5rem;
      }
      
      .react-datepicker__year-text {
        width: 28%;
        padding: 0.25rem 0.1rem;
        font-size: 0.8rem;
      }
    }
  `;

  return (
    <div className="h-[38px] relative" ref={containerRef}>
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
        <div className="absolute z-50" 
          ref={containerRef}
          style={{ 
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '100%',
            maxWidth: '100%',
            maxHeight: '400px',
            boxShadow: 'none'
          }}>
          <div className="relative w-full">
            <DatePicker
              selected={selectedDate}
              onChange={handleDateSelected}
              inline
              showPopperArrow={false}
              onClickOutside={() => setIsOpen(false)}
              showYearPicker={showYearView}
              showMonthYearPicker={false}
              onYearChange={handleYearSelected}
              shouldCloseOnSelect={!showYearView}
              yearItemNumber={9}
              calendarClassName="w-full"
              calendarStartDay={0}
              renderCustomHeader={({
                date,
                changeYear,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="flex items-center justify-between px-2 py-1">
                  {!showYearView ? (
                    <>
                      <button
                        onClick={decreaseMonth}
                        disabled={prevMonthButtonDisabled}
                        type="button"
                        className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${
                          prevMonthButtonDisabled && "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      
                      {/* Month/Year display that toggles year picker */}
                      <button
                        onClick={toggleYearView}
                        className="text-sm font-medium px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </button>
                      
                      <button
                        onClick={increaseMonth}
                        disabled={nextMonthButtonDisabled}
                        type="button"
                        className={`p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ${
                          nextMonthButtonDisabled && "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="year-header">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigateToPreviousYears(date, changeYear);
                        }}
                        type="button"
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      
                      <span className="year-header-text text-sm font-medium">
                        Select Year
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigateToNextYears(date, changeYear);
                        }}
                        type="button"
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker; 