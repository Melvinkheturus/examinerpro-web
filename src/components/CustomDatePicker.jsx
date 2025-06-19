import React, { useEffect, useState, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '../contexts/ThemeContext';

const CustomDatePicker = ({ selectedDate, onChange, placeholder, className = '' }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showYearView, setShowYearView] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(
    selectedDate ? Math.floor(selectedDate.getFullYear() / 9) * 9 - 4 : Math.floor(new Date().getFullYear() / 9) * 9 - 4
  );
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  
  // Update inputValue when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setInputValue(`${day}-${month}-${year}`);
      
      // Update year range when selected date changes
      setYearRangeStart(Math.floor(selectedDate.getFullYear() / 9) * 9 - 4);
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

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  
  // Handle calendar icon click - only open the calendar on icon click
  const handleCalendarClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };
  
  // Clear the date
  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setInputValue('');
    onChange(null);
    setIsOpen(false);
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
  const handleYearSelected = (year) => {
    if (!selectedDate) {
      // If no date is selected, create a new date with the selected year and current month/day
      const now = new Date();
      const newDate = new Date(year, now.getMonth(), now.getDate());
      onChange(newDate);
    } else {
      // If a date is already selected, update its year
      const newDate = new Date(selectedDate);
      newDate.setFullYear(year);
      onChange(newDate);
    }
    setShowYearView(false);
  };
  
  // Navigate to previous set of years
  const navigateToPreviousYears = () => {
    setYearRangeStart(yearRangeStart - 9);
  };
  
  // Navigate to next set of years
  const navigateToNextYears = () => {
    setYearRangeStart(yearRangeStart + 9);
  };
  
  // Change month handlers
  const handlePrevMonth = (date, changeMonth) => {
    const newDate = new Date(date);
    const newMonth = newDate.getMonth() - 1;
    changeMonth(newMonth);
  };

  const handleNextMonth = (date, changeMonth) => {
    const newDate = new Date(date);
    const newMonth = newDate.getMonth() + 1;
    changeMonth(newMonth);
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
    
    /* Custom header styles */
    .custom-datepicker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
    }
    
    .header-month-year {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-grow: 1;
    }
    
    .month-year-text {
      color: ${isDark ? '#F3F4F6' : '#1F2937'};
      font-weight: 600;
      cursor: pointer;
    }
    
    .month-year-text:hover {
      color: ${isDark ? '#60A5FA' : '#3B82F6'};
    }
    
    .nav-button {
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isDark ? '#374151' : '#EFF6FF'};
      border: none;
      border-radius: 0.25rem;
      color: ${isDark ? '#F3F4F6' : '#3B82F6'};
      cursor: pointer;
      padding: 0.25rem;
      width: 1.5rem;
      height: 1.5rem;
    }
    
    .nav-button:hover {
      background-color: ${isDark ? '#4B5563' : '#DBEAFE'};
    }
    
    .nav-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    /* Year picker styles */
    .year-picker {
      padding: 0.5rem;
      background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
      border-radius: 0.5rem;
    }
    
    .year-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    
    .year-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      color: ${isDark ? '#D1D5DB' : '#374151'};
      font-size: 0.875rem;
    }
    
    .year-cell:hover {
      background-color: ${isDark ? '#4B5563' : '#DBEAFE'};
    }
    
    .year-cell.selected {
      background-color: #3B82F6;
      color: white;
    }
    
    .year-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    
    .year-range {
      font-weight: 500;
      color: ${isDark ? '#F3F4F6' : '#1F2937'};
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
      
      .year-cell {
        padding: 0.35rem;
        font-size: 0.8rem;
      }
    }
  `;

  // Create year picker component
  const YearPicker = ({ date }) => {
    const currentYear = (selectedDate || new Date()).getFullYear();
    const years = [];
    
    // Generate 9 years centered around the current year range
    for (let i = 0; i < 9; i++) {
      years.push(yearRangeStart + i);
    }
    
    return (
      <div className="year-picker">
        <div className="year-nav">
          <button 
            className="nav-button" 
            onClick={navigateToPreviousYears}
            aria-label="Previous years"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          
          <span className="year-range">
            {yearRangeStart} - {yearRangeStart + 8}
          </span>
          
          <button 
            className="nav-button" 
            onClick={navigateToNextYears}
            aria-label="Next years"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="year-grid">
          {years.map((year) => (
            <div
              key={year}
              className={`year-cell ${year === currentYear ? 'selected' : ''}`}
              onClick={() => handleYearSelected(year)}
            >
              {year}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder || "dd-mm-yyyy"}
          className={`block w-full h-full rounded-md border-gray-300 border-2 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white ${className}`}
          autoComplete="off"
          readOnly={false}
          onFocus={(e) => {
            // Select the text when focused but don't open the calendar
            e.target.select();
          }}
        />
        <div className="absolute right-0 top-0 h-full flex items-center">
          <button
            type="button"
            onClick={handleCalendarClick}
            className="px-2.5 h-full text-gray-400 hover:text-gray-500 focus:outline-none"
            tabIndex="-1"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="px-2 h-full text-gray-400 hover:text-gray-500 focus:outline-none"
              tabIndex="-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1">
          {showYearView ? (
            <YearPicker 
              date={selectedDate || new Date()} 
            />
          ) : (
            <DatePicker
              selected={selectedDate}
              onChange={handleDateSelected}
              inline
              showMonthDropdown={false}
              showYearDropdown={false}
              dateFormat="dd-MM-yyyy"
              showPopperArrow={false}
              disabledKeyboardNavigation
              renderCustomHeader={({
                date,
                changeMonth,
                changeYear,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="custom-datepicker-header">
                  <button
                    className="nav-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePrevMonth(date, changeMonth);
                    }}
                    disabled={prevMonthButtonDisabled}
                    aria-label="Previous Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="header-month-year">
                    <span
                      className="month-year-text"
                      onClick={toggleYearView}
                    >
                      {date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}
                    </span>
                  </div>
                  <button
                    className="nav-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNextMonth(date, changeMonth);
                    }}
                    disabled={nextMonthButtonDisabled}
                    aria-label="Next Month"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker; 