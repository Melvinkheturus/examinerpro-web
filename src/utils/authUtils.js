import { supabase } from '../lib/supabase';

/**
 * Check if the current URL contains OAuth callback parameters
 * and handle the auth session accordingly
 * @returns {Promise<Object>} Auth session data
 */
export const handleOAuthCallback = async () => {
  try {
    console.log('Checking for OAuth callback - Current URL:', window.location.href);
    
    // Get current URL hash parameters for implicit OAuth flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    // Check if this is a callback from OAuth provider
    if (hashParams.has('access_token') || 
        queryParams.has('code') || 
        window.location.href.includes('auth/v1/callback') ||
        queryParams.has('error')) {
      
      console.log('OAuth callback detected, processing authentication...');
      
      // If there's an error in the query params, log it
      if (queryParams.has('error')) {
        console.error('OAuth error:', queryParams.get('error'));
        console.error('Error description:', queryParams.get('error_description'));
      }
      
      // Get the current session and return it
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message);
        throw error;
      }
      
      return { data, error: null };
    }
    
    return { data: null, error: null };
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return { data: null, error };
  }
};

/**
 * Debug function to log OAuth-related information
 */
export const debugOAuth = () => {
  console.log('Current URL:', window.location.href);
  console.log('Hash params:', new URLSearchParams(window.location.hash.substring(1)));
  console.log('Query params:', new URLSearchParams(window.location.search));
  console.log('Supabase auth config:', supabase.auth.getSession());
  
  // Check for cached auth session
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Error retrieving session:', error);
    } else {
      console.log('Current session:', data.session);
    }
  });
  
  return {
    url: window.location.href,
    origin: window.location.origin,
    supabaseURL: supabase.supabaseUrl
  };
}; 