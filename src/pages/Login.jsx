import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import AuthCard from '../components/auth/AuthCard';
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import { debugOAuth, handleOAuthCallback } from '../utils/authUtils';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, bypassEmailConfirmation, signInWithGoogle } = useAuth();

  // Check if this is an OAuth callback
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const { data, error } = await handleOAuthCallback();
      if (data?.session) {
        // Successfully authenticated via OAuth
        navigate('/dashboard');
      } else if (error) {
        setError('Authentication error: ' + error.message);
      }
    };
    
    checkOAuthCallback();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First try normal sign in
      const { error } = await signIn(email, password);
      
      if (error) {
        // If login fails, try to bypass email confirmation in development
        if (process.env.NODE_ENV !== 'production' && 
            (error.message.includes('Invalid login credentials') || 
             error.message.includes('Email not confirmed'))) {
          
          const bypassResult = await bypassEmailConfirmation(email, password);
          
          if (bypassResult.error) {
            throw new Error('Login failed. Please check your credentials and try again.');
          } else {
            navigate('/dashboard');
            return;
          }
        }
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid login credentials. If you just signed up, please check your email to confirm your account before logging in.');
        }
        
        throw error;
      }
      
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setGoogleLoading(true);
      
      // Log debug information to help diagnose issues
      debugOAuth();
      
      const { error } = await signInWithGoogle();
      if (error) throw error;
      
      // The OAuth flow will handle redirection
    } catch (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Welcome Back!"
      footerText="Don't have an account?"
      footerLink="/signup"
      footerLinkText="Sign up"
    >
            {error && (
        <div className="rounded-md bg-red-100 p-2 mb-4 animate__animated animate__headShake">
                <div className="text-xs text-red-700">{error}</div>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-300"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-300"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-300"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

          <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-300"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

        <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Login'}
                </button>
              </div>
            </form>

      <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white bg-opacity-80 text-gray-500">Or continue with</span>
                </div>
              </div>

        <div className="mt-4">
          <GoogleAuthButton 
                  onClick={handleGoogleSignIn}
            loading={googleLoading} 
            text="Sign in with Google"
          />
        </div>
      </div>
    </AuthCard>
  );
};

export default Login; 