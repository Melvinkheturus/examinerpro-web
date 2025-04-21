import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleOAuthCallback } from '../utils/authUtils';

const OAuthCallback = () => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        setIsProcessing(true);
        await handleOAuthCallback();
      } catch (err) {
        console.error('Error handling OAuth callback:', err);
        setError(err.message || 'Failed to sign in with OAuth provider');
      } finally {
        setIsProcessing(false);
      }
    };
    
    processOAuthCallback();
  }, []);
  
  // If the user is already authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  // If still processing, show loading
  if (isProcessing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Processing OAuth sign in...</p>
        </div>
      </div>
    );
  }
  
  // If there was an error, show error and link to login
  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Authentication Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <a 
            href="/login" 
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return to Login
          </a>
        </div>
      </div>
    );
  }
  
  // Default redirect to login if not authenticated yet
  return <Navigate to="/login" replace />;
};

export default OAuthCallback; 