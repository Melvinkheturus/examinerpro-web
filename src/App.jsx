import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ExaminerDetail from './pages/ExaminerDetail';
import ExaminerHistory from './pages/ExaminerHistory';
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
            
            {/* Protected routes with Layout */}
            <Route 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              
              {/* Chief Examiner Profile */}
              <Route path="/profile" element={<ChiefExaminerProfile />} />
              
              {/* Examiner routes */}
              <Route path="/add-examiner" element={<AddExaminer />} />
              <Route path="/examiners/add" element={<AddExaminer />} />
              <Route path="/examiners/edit/:id" element={<AddExaminer />} />
              <Route path="/examiners/:id" element={<ExaminerDetail />} />
              <Route path="/examiner/:id/history" element={<ExaminerHistory />} />
              
              {/* Calculation routes */}
              <Route path="/calculations/new/:id" element={<CalculationPage />} />
              <Route path="/calculations/view/:id" element={<CalculationDetail />} />
              <Route path="/staff-details/:id" element={<StaffDetailsPage />} />
              <Route path="/calculation-archive" element={<CalculationArchive />} />
              
              {/* PDF Archive */}
              <Route path="/pdf-archive" element={<PDFArchive />} />
              
              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings-page" element={<Settings />} />
              
              {/* Redirects */}
              <Route path="/examiners/new" element={<Navigate to="/examiners/add" />} />
              <Route path="/calculations" element={<Navigate to="/calculation-archive" />} />
              <Route path="/history" element={<Navigate to="/pdf-archive" />} />
              <Route path="/calculation-history" element={<Navigate to="/calculation-archive" />} />
              <Route path="/pdf-history" element={<Navigate to="/pdf-archive" />} />
              <Route path="/simple-form" element={<Navigate to="/add-examiner" />} />
              <Route path="/standalone-form" element={<Navigate to="/add-examiner" />} />
            </Route>
            
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