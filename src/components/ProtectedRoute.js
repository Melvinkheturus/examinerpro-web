import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { handleOAuthCallback } from '../utils/authUtils';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const [isCheckingOAuth, setIsCheckingOAuth] = useState(false);
  const location = useLocation();

  // Check for OAuth callback parameters
  useEffect(() => {
    const checkOAuthParams = async () => {
      // Check if URL has OAuth-related parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      if (hashParams.has('access_token') || queryParams.has('code')) {
        setIsCheckingOAuth(true);
        await handleOAuthCallback();
        setIsCheckingOAuth(false);
      }
    };
    
    checkOAuthParams();
  }, [location]);

  // If still loading or checking OAuth, show loading spinner
  if (loading || isCheckingOAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 