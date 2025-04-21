import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import ExaminerDetail from './pages/ExaminerDetail';
import AddExaminer from './pages/AddExaminer';
import PDFArchive from './pages/PDFArchive';
import CalculationArchive from './pages/CalculationArchive';
import Settings from './pages/SettingsPage';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './components/OAuthCallback';
import CalculationPage from './pages/CalculationPage';
import StaffDetailsPage from './pages/StaffDetailsPage';
import CalculationDetail from './pages/CalculationDetail';
import ChiefExaminerProfile from './pages/ChiefExaminerProfile';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Protected Route component to guard routes that require authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  // Show loading state while auth status is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  useEffect(() => {
    console.log('App initialized, routes are ready');
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Authentication routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Chief Examiner Profile Route */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <ChiefExaminerProfile />
              </ProtectedRoute>
            } />
            
            <Route path="/add-examiner" element={
              <ProtectedRoute>
                <AddExaminer />
              </ProtectedRoute>
            } />
            
            <Route path="/examiners/add" element={
              <ProtectedRoute>
                <AddExaminer />
              </ProtectedRoute>
            } />
            
            <Route path="/examiners/new" element={
              <ProtectedRoute>
                <Navigate to="/examiners/add" />
              </ProtectedRoute>
            } />
            
            <Route path="/examiners/edit/:id" element={
              <ProtectedRoute>
                <AddExaminer />
              </ProtectedRoute>
            } />
            
            <Route path="/examiners/:id" element={
              <ProtectedRoute>
                <ExaminerDetail />
              </ProtectedRoute>
            } />
            
            {/* Consolidated Calculations route - redirect to calculation-archive */}
            <Route path="/calculations" element={
              <ProtectedRoute>
                <Navigate to="/calculation-archive" replace />
              </ProtectedRoute>
            } />
            
            {/* Maintain original calculation detail routes */}
            <Route path="/calculations/new/:id" element={
              <ProtectedRoute>
                <CalculationPage />
              </ProtectedRoute>
            } />
            
            <Route path="/calculations/view/:id" element={
              <ProtectedRoute>
                <CalculationDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/staff-details/:id" element={
              <ProtectedRoute>
                <StaffDetailsPage />
              </ProtectedRoute>
            } />
            
            {/* Consolidated PDF Archive route */}
            <Route path="/pdf-archive" element={
              <ProtectedRoute>
                <PDFArchive />
              </ProtectedRoute>
            } />
            
            {/* Consolidated Calculation Archive route */}
            <Route path="/calculation-archive" element={
              <ProtectedRoute>
                <CalculationArchive />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Alternative route for settings that uses the same component */}
            <Route path="/settings-page" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Legacy redirects to maintain backward compatibility */}
            <Route path="/history" element={
              <ProtectedRoute>
                <Navigate to="/pdf-archive" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/calculation-history" element={
              <ProtectedRoute>
                <Navigate to="/calculation-archive" replace />
              </ProtectedRoute>
            } />
            
            <Route path="/pdf-history" element={
              <ProtectedRoute>
                <Navigate to="/pdf-archive" replace />
              </ProtectedRoute>
            } />
            
            {/* Redirect routes for old form paths */}
            <Route path="/simple-form" element={<Navigate to="/add-examiner" replace />} />
            <Route path="/standalone-form" element={<Navigate to="/add-examiner" replace />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        
        {/* Toast notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: 'green',
                secondary: 'black',
              },
            },
          }}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App; 