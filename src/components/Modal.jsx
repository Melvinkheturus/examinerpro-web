import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './IllustratedIcons';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Modal component for displaying modal dialogs
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when the modal is closed
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {string} size - Modal size (sm, md, lg, xl)
 * @returns {React.ReactNode}
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  hideCloseButton = false,
  className = ''
}) => {
  // Using useTheme but not using isDarkMode - proper way to ignore
  const { isDarkMode: _ } = useTheme();
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = ''; // Restore scrolling
    };
  }, [isOpen, onClose]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (overlayRef.current && e.target === overlayRef.current) {
      onClose();
    }
  };

  // Modal sizes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full mx-4',
  };

  // Animation classes
  const animationClasses = {
    overlay: 'transition-opacity duration-300',
    overlayEnter: 'opacity-0',
    overlayEnterActive: 'opacity-100',
    overlayExit: 'opacity-100',
    overlayExitActive: 'opacity-0',
    modal: 'transition-all duration-300 transform',
    modalEnter: 'opacity-0 scale-95',
    modalEnterActive: 'opacity-100 scale-100',
    modalExit: 'opacity-100 scale-100',
    modalExitActive: 'opacity-0 scale-95',
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Create the modal content
  const modalContent = (
    <div 
      ref={overlayRef}
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${animationClasses.overlay}`}
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full overflow-hidden ${sizeClasses[size]} ${animationClasses.modal} ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        {title && (
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Modal Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );

  // Render the modal using a portal to avoid stacking context issues
  return createPortal(modalContent, document.body);
};

export default Modal; 