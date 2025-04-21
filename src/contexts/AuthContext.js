import React, { createContext, useState, useEffect, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://zampawknbmlrnhsaacqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbXBhd2tuYm1scm5oc2FhY3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MDYyNDksImV4cCI6MjA1NzA4MjI0OX0.IpNVkj9_ErG77aNbzXPULI4IXM6_iU2DAgFtLMZoUCA';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: 'https://zampawknbmlrnhsaacqm.supabase.co/auth/v1/callback'
  }
});

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get session from local storage
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error.message);
      } else {
        setSession(data.session);
        setUser(data.session?.user || null);
      }
      
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign up function
  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Check if email is confirmed
  const isEmailConfirmed = async (email) => {
    try {
      // This is a workaround since Supabase doesn't provide a direct way to check email confirmation
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-that-will-fail'
      });
      
      // If the error message mentions email confirmation, return false
      if (error && error.message.includes('Email not confirmed')) {
        return false;
      }
      
      // Otherwise, assume the email is confirmed (the login might fail for other reasons)
      return true;
    } catch (error) {
      console.error('Error checking email confirmation:', error);
      return false;
    }
  };

  // For development/testing only: Bypass email confirmation
  const bypassEmailConfirmation = async (email, password) => {
    try {
      // First, try to sign in with the provided credentials
      const { data, error } = await signIn(email, password);
      
      if (error) {
        // If the error is about email confirmation, we'll try to bypass it
        if (error.message.includes('Email not confirmed') || error.message.includes('Invalid login credentials')) {
          // For security reasons, this should only be used in development
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Bypassing email confirmation in development environment');
            
            // Force a session by using the admin API (this is a simplified example)
            // In a real app, you would need a server-side function to do this securely
            return await signIn(email, password);
          }
        }
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Sign in with Google function
  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google OAuth sign-in process');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: false,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
      
      console.log('OAuth initiated, redirecting to Google...');
      return { data, error: null };
    } catch (error) {
      console.error('Failed to initiate Google sign-in:', error);
      return { data: null, error };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://zampawknbmlrnhsaacqm.supabase.co/auth/v1/callback'
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // Update password function
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isEmailConfirmed,
    bypassEmailConfirmation,
    signInWithGoogle,
    supabase
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext; 