import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { formatDate } from '../utils/dateUtils';

const ChiefExaminerProfile = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPapers: 0,
    totalEarnings: 0,
    activeSince: '',
    lastActive: ''
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // Fetch user's profile data
        const { data: examinerData, error: examinerError } = await supabase
          .from('examiners')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (examinerError && examinerError.code !== 'PGRST116') {
          throw examinerError;
        }
        
        if (examinerData) {
          setProfileData(examinerData);
          
          // Fetch statistics
          const { data: statsData, error: statsError } = await supabase
            .from('examiner_summary')
            .select('*')
            .eq('examiner_id', examinerData.id)
            .single();
            
          if (!statsError && statsData) {
            setStats({
              totalPapers: statsData.total_papers || 0,
              totalEarnings: statsData.total_earnings || 0,
              activeSince: examinerData.created_at ? formatDate(examinerData.created_at) : 'N/A',
              lastActive: statsData.last_active_date ? formatDate(statsData.last_active_date) : 'N/A'
            });
          }
        } else {
          setProfileData({
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Chief Examiner',
            email: user.email,
            position: 'Chief Examiner',
            department: 'Examination Department',
            profile_url: null
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  // Styling based on theme
  const bgColor = isDarkMode ? 'bg-gray-900' : 'bg-gray-100';
  const cardBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const textColor = isDarkMode ? 'text-white' : 'text-gray-800';
  const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const statBgColor = isDarkMode ? 'bg-gray-700' : 'bg-blue-50';
  const statTextColor = isDarkMode ? 'text-blue-300' : 'text-blue-600';

  // Default avatar if no profile picture
  const getDefaultAvatar = () => {
    const name = profileData?.full_name || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${isDarkMode ? '0369a1' : '3b82f6'}&color=ffffff&size=200`;
  };

  return (
    <div className={`flex h-screen ${bgColor}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h1 className={`text-2xl font-bold ${textColor} flex items-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </h1>
                  <p className={`mt-1 ${subTextColor}`}>
                    View your profile information and settings
                  </p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className={`col-span-1 ${cardBgColor} rounded-2xl shadow-lg overflow-hidden`}>
                  <div className="p-6 flex flex-col items-center">
                    <div className="relative mb-4">
                      <img 
                        src={profileData?.profile_url || getDefaultAvatar()} 
                        alt={profileData?.full_name || 'Profile'} 
                        className="w-40 h-40 rounded-full object-cover border-4 border-blue-500"
                      />
                      <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </div>
                    </div>
                    <h2 className={`text-xl font-bold ${textColor}`}>{profileData?.full_name}</h2>
                    <p className={`text-md ${subTextColor} mb-2`}>{profileData?.position}</p>
                    <p className={`text-sm ${subTextColor} mb-4`}>{profileData?.department}</p>
                    
                    <div className={`w-full border-t ${borderColor} pt-4 mt-2`}>
                      <div className="flex items-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <span className={`text-sm ${textColor}`}>{profileData?.email}</span>
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-sm ${textColor}`}>Active since {stats.activeSince}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Statistics and Additional Info */}
                <div className={`col-span-1 lg:col-span-2 ${cardBgColor} rounded-2xl shadow-lg overflow-hidden`}>
                  <div className="p-6">
                    <h3 className={`text-lg font-semibold mb-6 ${textColor}`}>Examiner Statistics</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className={`p-4 rounded-xl ${statBgColor}`}>
                        <p className={`text-sm ${subTextColor} mb-1`}>Total Papers Evaluated</p>
                        <p className={`text-2xl font-bold ${statTextColor}`}>{stats.totalPapers}</p>
                      </div>
                      <div className={`p-4 rounded-xl ${statBgColor}`}>
                        <p className={`text-sm ${subTextColor} mb-1`}>Total Earnings</p>
                        <p className={`text-2xl font-bold ${statTextColor}`}>₹{stats.totalEarnings.toLocaleString()}</p>
                      </div>
                      <div className={`p-4 rounded-xl ${statBgColor}`}>
                        <p className={`text-sm ${subTextColor} mb-1`}>Last Active</p>
                        <p className={`text-2xl font-bold ${statTextColor}`}>{stats.lastActive}</p>
                      </div>
                      <div className={`p-4 rounded-xl ${statBgColor}`}>
                        <p className={`text-sm ${subTextColor} mb-1`}>Position</p>
                        <p className={`text-2xl font-bold ${statTextColor}`}>{profileData?.position}</p>
                      </div>
                    </div>
                    
                    <div className={`border-t ${borderColor} pt-6 mt-4`}>
                      <h3 className={`text-lg font-semibold mb-4 ${textColor}`}>Account Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className={`${subTextColor}`}>Email:</span>
                          <span className={`${textColor} font-medium`}>{profileData?.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${subTextColor}`}>Department:</span>
                          <span className={`${textColor} font-medium`}>{profileData?.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${subTextColor}`}>Account Status:</span>
                          <span className="text-green-500 font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${subTextColor}`}>Account Type:</span>
                          <span className={`${textColor} font-medium`}>Chief Examiner</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ChiefExaminerProfile; 