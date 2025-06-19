import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { updateSetting, getSettings } from '../services/settingsService';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import HistoryLayout from './HistoryLayout';
import supabaseClient from '../services/supabaseClient';

// Import icons
import { 
  AdjustmentsHorizontalIcon, 
  Cog6ToothIcon, 
  UserIcon, 
  PaintBrushIcon, 
  ShieldCheckIcon, 
  ServerIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  LockClosedIcon,
  // eslint-disable-next-line no-unused-vars
  ArrowRightOnRectangleIcon,
  // eslint-disable-next-line no-unused-vars
  TrashIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CurrencyRupeeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// This component is used for both /settings and /settings-page routes
const Settings = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut, resetPassword, user } = useAuth();
  
  // States
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [evaluationRate, setEvaluationRate] = useState(20.0);
  const [newRate, setNewRate] = useState('');
  const [defaultViewHistory, setDefaultViewHistory] = useState('list');
  const [defaultViewDashboard, setDefaultViewDashboard] = useState('grid');
  const [themeMode, setThemeMode] = useState(isDarkMode ? 'dark' : 'light');
  // eslint-disable-next-line no-unused-vars
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  // eslint-disable-next-line no-unused-vars
  const appVersion = '1.3.5';
  // eslint-disable-next-line no-unused-vars
  const lastUpdateDate = 'April 2025';
  
  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await getSettings();
        
        // Set evaluation rate
        setEvaluationRate(settings.evaluationRate || 20.0);
        setNewRate(settings.evaluationRate?.toString() || '20.0');
        
        // Set view preferences
        setDefaultViewHistory(settings.defaultViewHistory || 'list');
        setDefaultViewDashboard(settings.defaultViewDashboard || 'grid');
        
        // Set theme
        setThemeMode(isDarkMode ? 'dark' : 'light');
        
      } catch (err) {
        toast.error('Failed to load settings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [isDarkMode]);
  
  // Handle theme change
  const handleThemeChange = async (mode) => {
    try {
      setThemeMode(mode);
      if ((mode === 'dark' && !isDarkMode) || (mode === 'light' && isDarkMode)) {
        toggleTheme();
      }
      
      // For system mode, get system preference
      if (mode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((prefersDark && !isDarkMode) || (!prefersDark && isDarkMode)) {
      toggleTheme();
        }
      }
      
      await updateSetting('theme', { mode });
      toast.success('Theme updated successfully');
    } catch (err) {
      toast.error('Failed to update theme');
      console.error(err);
    }
  };
  
  // Handle evaluation rate update
  const handleUpdateEvaluationRate = async () => {
    try {
      const rateValue = parseFloat(newRate);
      
      if (isNaN(rateValue) || rateValue <= 0) {
        toast.error('Please enter a valid rate');
        return;
      }
      
      await updateSetting('evaluationRate', rateValue);
      setEvaluationRate(rateValue);
      toast.success('Evaluation rate updated successfully');
    } catch (err) {
      toast.error('Failed to update evaluation rate');
      console.error(err);
    }
  };
  
  // Handle view preference change
  const handleViewPreferenceChange = async (setting, value) => {
    try {
      if (setting === 'history') {
        setDefaultViewHistory(value);
        await updateSetting('defaultViewHistory', value);
      } else if (setting === 'dashboard') {
        setDefaultViewDashboard(value);
        await updateSetting('defaultViewDashboard', value);
      }
      toast.success('View preference updated successfully');
    } catch (err) {
      toast.error('Failed to update view preference');
      console.error(err);
    }
  };
  
  // Handle password reset
  const handleResetPassword = async () => {
    try {
      if (!user?.email) {
        toast.error('No account email found');
        return;
      }
      
      const { error } = await resetPassword(user.email);
      
      if (error) {
        throw error;
      }
      
      toast.success('Password reset link sent to your email');
    } catch (err) {
      toast.error('Failed to send password reset link');
      console.error(err);
    }
  };
  
  // Handle email change
  const handleEmailChange = async () => {
    try {
      const newEmail = window.prompt('Enter your new email address:');
      
      if (!newEmail) return;
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        toast.error('Please enter a valid email address');
        return;
      }
      
      const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
      
      if (error) {
        throw error;
      }
      
      toast.success('Verification email sent to your new address. Please check your inbox.');
    } catch (err) {
      toast.error('Failed to update email');
      console.error(err);
    }
  };
  
  // Handle logout
  // eslint-disable-next-line no-unused-vars
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      toast.error('Failed to log out');
      console.error(err);
    }
  };
  
  // Handle account deletion
  // eslint-disable-next-line no-unused-vars
  const handleDeleteAccount = async () => {
    try {
      if (deleteConfirmText !== 'DELETE') {
        toast.error('Please type DELETE to confirm');
        return;
      }
      
      const { error } = await supabaseClient.auth.admin.deleteUser(user.id);
      
      if (error) {
        throw error;
      }
      
      toast.success('Account deleted successfully');
      setTimeout(() => {
        signOut();
        navigate('/login');
      }, 2000);
    } catch (err) {
      toast.error('Failed to delete account: ' + err.message);
      console.error(err);
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
    }
  };
  
  return (
    <HistoryLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
            <Cog6ToothIcon className="w-7 h-7 mr-2" />
            Settings
          </h1>
        </div>
        
        {/* Loading Indicator */}
        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            <button 
              onClick={() => setActiveTab('general')} 
              className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'general' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
                General
              </div>
            </button>
            
            <button 
              onClick={() => setActiveTab('preferences')} 
              className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'preferences' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
            <div className="flex items-center">
                <UserIcon className="w-4 h-4 mr-2" />
                User Preferences
              </div>
            </button>
            
            <button 
              onClick={() => setActiveTab('appearance')} 
              className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'appearance' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <PaintBrushIcon className="w-4 h-4 mr-2" />
                Appearance
          </div>
            </button>
            
            <button 
              onClick={() => setActiveTab('account')} 
              className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'account' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
            <div className="flex items-center">
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Account
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('system')} 
              className={`py-2 px-4 font-medium text-sm whitespace-nowrap ${
                activeTab === 'system' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <ServerIcon className="w-4 h-4 mr-2" />
                System
              </div>
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="space-y-6 pb-8">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <CurrencyRupeeIcon className="w-5 h-5 mr-2" />
                Evaluation Rate Configuration
          </h2>
          
              <div>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3 flex items-center`}>
                  <span>Current Rate: </span>
                  <span className="font-semibold mx-1">₹{evaluationRate.toFixed(2)}</span>
                  <span> per paper</span>
                  <span className="inline-flex ml-2 group relative">
                    <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                    <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 w-48">
                      This is the default salary rate applied per paper during calculations.
                    </span>
                  </span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>₹</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                      className={`block w-full rounded-md pl-7 pr-24 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter new rate"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>per paper</span>
                </div>
              </div>
              <button
                onClick={handleUpdateEvaluationRate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors duration-200"
              >
                Update Rate
              </button>
            </div>
          </div>
        </div>
          )}
          
          {/* User Preferences */}
          {activeTab === 'preferences' && (
            <div className={`space-y-6`}>
              {/* History View Preference */}
              <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <ViewColumnsIcon className="w-5 h-5 mr-2" />
                  History View Preference
                </h2>
                
                <div className="p-3 border rounded-md dark:border-gray-700">
                  <h3 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Default View for History Pages
                  </h3>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleViewPreferenceChange('history', 'grid')}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        defaultViewHistory === 'grid' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 border' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Squares2X2Icon className="w-5 h-5 mr-2" />
                      Grid View
                    </button>
                    
                    <button
                      onClick={() => handleViewPreferenceChange('history', 'list')}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        defaultViewHistory === 'list' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 border' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <ListBulletIcon className="w-5 h-5 mr-2" />
                      List View
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Dashboard View Preference */}
              <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <ViewColumnsIcon className="w-5 h-5 mr-2" />
                  Dashboard View Preference
                </h2>
                
                <div className="p-3 border rounded-md dark:border-gray-700">
                  <h3 className={`text-md font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    Default View for Dashboard
                  </h3>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleViewPreferenceChange('dashboard', 'grid')}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        defaultViewDashboard === 'grid' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 border' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Squares2X2Icon className="w-5 h-5 mr-2" />
                      Grid View
                    </button>
                    
                    <button
                      onClick={() => handleViewPreferenceChange('dashboard', 'list')}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        defaultViewDashboard === 'list' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 border' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <ListBulletIcon className="w-5 h-5 mr-2" />
                      List View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <PaintBrushIcon className="w-5 h-5 mr-2" />
                Theme Settings
          </h2>
              
              <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Choose how you'd like ExaminerPro to appear.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 ${
                    themeMode === 'light' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <SunIcon className={`w-8 h-8 ${themeMode === 'light' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={`font-medium ${themeMode === 'light' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    Light
                  </span>
                </button>
                
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 ${
                    themeMode === 'dark' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <MoonIcon className={`w-8 h-8 ${themeMode === 'dark' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={`font-medium ${themeMode === 'dark' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    Dark
                  </span>
                </button>
                
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 ${
                    themeMode === 'system' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ComputerDesktopIcon className={`w-8 h-8 ${themeMode === 'system' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={`font-medium ${themeMode === 'system' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    System
                  </span>
                </button>
              </div>
            </div>
          )}
          
          {/* Account Settings */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Email Change Card */}
              <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <EnvelopeIcon className="w-5 h-5 mr-2" />
                  Email Settings
                </h2>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Current Email:
                    </p>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleEmailChange}
                    className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500"
                  >
                    Change Email
                  </button>
                </div>
              </div>
              
              {/* Password Reset Card */}
              <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <LockClosedIcon className="w-5 h-5 mr-2" />
                  Password Management
                </h2>
                
                <div className="flex justify-between items-center">
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Send a password reset link to your email
                  </p>
                  <button
                    onClick={handleResetPassword}
                    className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500"
                  >
                    Send Reset Link
                  </button>
          </div>
        </div>
        
              {/* Logout Card */}
              <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                  Session Management
                </h2>
                
                <div className="flex justify-between items-center">
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Sign out of your account
                  </p>
          <button
            onClick={handleLogout}
                    className="px-4 py-2 text-sm text-amber-600 dark:text-amber-400 border border-amber-600 dark:border-amber-400 rounded-md hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500"
          >
            Logout
          </button>
                </div>
              </div>
              
              {/* Delete Account Card */}
              <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-red-700' : 'bg-white border border-red-200'} bg-red-50 dark:bg-red-900/20`}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center text-red-600 dark:text-red-400`}>
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Delete Account
                </h2>
                
                <div className="flex justify-between items-center">
                  <p className={`text-red-600/80 dark:text-red-400/80`}>
                    Permanently delete your account and all data
                  </p>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
              
              {/* Delete Account Modal */}
              {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className={`rounded-lg shadow-lg p-6 max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className={`text-xl font-bold mb-4 text-red-600`}>Delete Account</h3>
                    <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      This action will permanently delete your account and all associated data. This cannot be undone.
                    </p>
                    <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      To confirm, type <span className="font-bold">DELETE</span> below:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className={`w-full p-2 mb-4 rounded-md ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Type DELETE to confirm"
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setIsDeleteModalOpen(false)}
                        className={`px-4 py-2 rounded-md ${
                          isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                        className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ${
                          deleteConfirmText !== 'DELETE' ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* System Info */}
          {activeTab === 'system' && (
            <div className={`rounded-lg shadow p-6 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                <ServerIcon className="w-5 h-5 mr-2" />
                System Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>App Version</span>
                  <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono`}>
                    v{appVersion}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700">
                  <span className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Last Updated</span>
                  <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {lastUpdateDate}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </HistoryLayout>
  );
};

// Export both names for the same component to maintain compatibility
export default Settings;
export { Settings as SettingsPage }; 