import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthCard from '../components/auth/AuthCard';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        throw error;
      }
      
      setMessage('Check your email for password reset instructions.');
    } catch (error) {
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard 
      title="Forgot Your Password?"
      footerText="Remember your password?"
      footerLink="/login"
      footerLinkText="Back to login"
    >
      <p className="mt-1 text-sm text-gray-600 text-center mb-4">
                Enter your email and we'll send you instructions to reset your password.
              </p>

            {error && (
        <div className="rounded-md bg-red-100 p-2 mb-4 animate__animated animate__headShake">
                <div className="text-xs text-red-700">{error}</div>
              </div>
            )}

            {message && (
        <div className="rounded-md bg-green-100 p-2 mb-4 animate__animated animate__fadeIn">
                <div className="text-xs text-green-700">{message}</div>
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
                      Sending...
                    </span>
                  ) : 'Send Reset Instructions'}
                </button>
              </div>
            </form>
    </AuthCard>
  );
};

export default ForgotPassword; 