import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { IllustratedIcon } from './IllustratedIcons';

/**
 * SortDropdown component - Dropdown for sorting data
 * 
 * @param {Object} options - Object containing sort options with key-value pairs
 * @param {string} selected - The currently selected sort option
 * @param {Function} onSelect - Function to call when a sort option is selected
 * @returns {JSX.Element}
 */
const SortDropdown = ({ options, selected, onSelect }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get the label of the currently selected option
  const getSelectedLabel = () => {
    const selectedOption = Object.entries(options).find(([key]) => key === selected);
    return selectedOption ? selectedOption[1] : 'Sort by';
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex justify-between items-center w-full rounded-md border ${
          isDarkMode 
            ? 'border-gray-600 bg-gray-700 text-white' 
            : 'border-gray-300 bg-white text-gray-700'
        } px-4 py-2 text-sm font-medium shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-100`}
      >
        <span>{getSelectedLabel()}</span>
        <IllustratedIcon
          name={isOpen ? 'chevronRight' : 'chevronRight'}
          className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? 'transform rotate-90' : ''}`}
          weight={isDarkMode ? "light" : "regular"}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md shadow-lg ${
            isDarkMode 
              ? 'bg-gray-800 ring-1 ring-black ring-opacity-5' 
              : 'bg-white ring-1 ring-black ring-opacity-5'
          }`}
        >
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="sort-menu-button">
            {Object.entries(options).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  selected === key
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-blue-50 text-blue-700'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SortDropdown; 