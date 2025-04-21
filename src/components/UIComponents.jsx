import React from 'react';

// ExaminerPro Logo component with different variants
export const Logo = ({ variant = 'default', className = '' }) => {
  // Use actual logo images instead of text
  if (variant === 'sidebar') {
    return (
      <div className={`${className}`}>
        <img 
          src="/images/logo-white.png" 
          alt="ExaminerPro Logo" 
          className="h-10"
        />
      </div>
    );
  }
  
  if (variant === 'topbar') {
    return (
      <div className={`${className}`}>
        <img 
          src="/images/logo-dark.png" 
          alt="ExaminerPro Logo" 
          className="h-8"
        />
      </div>
    );
  }

  // Default logo
  return (
    <div className={`${className}`}>
      <img 
        src="/images/logo-dark.png" 
        alt="ExaminerPro Logo" 
        className="h-10"
      />
    </div>
  );
};

// College Logo component
export const CollegeLogo = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-end ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <h2 className="text-lg font-bold leading-6 text-gray-900 dark:text-gray-100">
            GURU NANAK COLLEGE (AUTONOMOUS)
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Affiliated to University of Madras | Accredited 'A++' Grade by NAAC
          </p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            CENTER OF EXAMINATIONS (COE)
          </p>
        </div>
        <div className="flex-shrink-0">
          <img 
            src="/images/gnc_logo.png" 
            alt="Guru Nanak College Logo" 
            className="h-16 w-16 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

// A custom plus icon component for consistent use across the application
export const PlusIcon = ({ className = "h-5 w-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
  >
    <path 
      fillRule="evenodd" 
      d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" 
      clipRule="evenodd" 
    />
  </svg>
);

// A simple button component with consistent styling
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  ...props 
}) => {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  const sizeStyles = {
    sm: 'py-1 px-2 text-sm',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2 px-6 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Form input with consistent styling and error handling
export const FormInput = ({
  label,
  id,
  type = 'text',
  placeholder,
  error,
  register,
  required = false,
  disabled = false,
  className = '',
  isDarkMode = false,
  ...props
}) => {
  const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const errorColor = 'text-red-500';

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className={`block mb-1 text-sm font-medium ${labelColor} ${required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}`}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          error ? 'border-red-500' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        {...register}
        {...props}
      />
      {error && <p className={`mt-1 text-sm ${errorColor}`}>{error}</p>}
    </div>
  );
};

// Loading spinner component
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]} text-blue-600 ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Badge component for status indicators
export const Badge = ({ children, variant = 'gray', className = '' }) => {
  const variantStyles = {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

const Notification = ({ message, type = 'success', onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-50 border-green-500' : 
                 type === 'info' ? 'bg-blue-50 border-blue-500' : 
                 type === 'warning' ? 'bg-yellow-50 border-yellow-500' : 
                 'bg-red-50 border-red-500';
  
  const textColor = type === 'success' ? 'text-green-800' : 
                   type === 'info' ? 'text-blue-800' : 
                   type === 'warning' ? 'text-yellow-800' : 
                   'text-red-800';
  
  const iconColor = type === 'success' ? 'text-green-500' : 
                   type === 'info' ? 'text-blue-500' : 
                   type === 'warning' ? 'text-yellow-500' : 
                   'text-red-500';
  
  return (
    <div className={`rounded-md border-l-4 p-4 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconColor}`}>
            {type === 'success' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            {type === 'warning' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {type === 'error' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${textColor}`}>{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-auto -mx-1.5 -my-1.5 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${iconColor}`}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

const components = {
  PlusIcon,
  Button,
  FormInput,
  Spinner,
  Badge,
  Notification
};

export default components; 