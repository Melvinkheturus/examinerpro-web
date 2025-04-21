import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { getExaminerById, getExaminerStatistics, deleteExaminer } from '../services/examinerService';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import calculationService from '../services/calculationService';
import { formatDate } from '../utils/dateUtils';

// Counter animation component for statistics
const AnimatedCounter = ({ value, duration = 2000, decimals = 0, startAnimation }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  
  useEffect(() => {
    // Only start animation when startAnimation is true
    if (!startAnimation) return;
    
    if (value === 0) {
      setCount(0);
      return;
    }
    
    const startTime = Date.now();
    const startValue = 0; // Always start from 0 for better effect
    const targetValue = value;
    const diff = targetValue - startValue;
    
    const step = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smoother animation
      const easeOutQuad = t => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      const currentValue = startValue + (diff * easedProgress);
      setCount(currentValue);
      
      if (progress < 1) {
        countRef.current = requestAnimationFrame(step);
      } else {
        setCount(targetValue);
      }
    };
    
    countRef.current = requestAnimationFrame(step);
    
    return () => {
      if (countRef.current) {
        cancelAnimationFrame(countRef.current);
      }
    };
  }, [value, duration, startAnimation, setCount]);
  
  return decimals > 0 
    ? count.toFixed(decimals)
    : Math.round(count);
};

const ExaminerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [examiner, setExaminer] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('calculation'); // Changed from 'pdf' to 'calculation'
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);
  const [recentCalculations, setRecentCalculations] = useState([]);
  const [calculationsLoading, setCalculationsLoading] = useState(false);
  const [recentPDFs, setRecentPDFs] = useState([]);
  const [pdfsLoading, setPDFsLoading] = useState(false);
  
  // Load examiner data and statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch examiner details
        const examinerData = await getExaminerById(id);
        setExaminer(examinerData);
        
        // Fetch examiner statistics - only once and with error handling
        try {
          const statsData = await getExaminerStatistics(id);
          setStatistics(statsData);
        } catch (statsErr) {
          console.warn('Error fetching examiner statistics:', statsErr);
          // Don't fail the whole component, just set default statistics
          setStatistics({
            total_papers: 0,
            total_earnings: 0,
            total_staff: 0,
            average_papers_per_day: 0
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching examiner data:', err);
        setError(err.message || 'Failed to load examiner data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Load examiner's recent calculations
  useEffect(() => {
    if (!examiner) return;
    
    const fetchCalculations = async () => {
      try {
        setCalculationsLoading(true);
        console.log("Fetching calculations for examiner ID:", id);
        const calculations = await calculationService.getCalculationsByExaminer(id);
        console.log("Calculations fetched:", calculations);
        // Only show the most recent 3 calculations
        setRecentCalculations(calculations.slice(0, 3));
        
        // Extract PDFs from the calculations (if they have pdf_url)
        const pdfs = calculations.filter(calc => calc.pdf_url).slice(0, 3);
        setRecentPDFs(pdfs);
      } catch (error) {
        console.error('Error fetching recent calculations:', error);
      } finally {
        setCalculationsLoading(false);
        setPDFsLoading(false);
      }
    };
    
    fetchCalculations();
  }, [id, examiner]);
  
  // Set up intersection observer for statistics section
  useEffect(() => {
    if (!statsRef.current) return;
    
    // Store a reference to the DOM node to use in cleanup
    const currentStatsRef = statsRef.current;
    
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setStatsVisible(true);
        // Once animation starts, no need to observe anymore
        observer.disconnect();
      }
    }, { threshold: 0.2 }); // Start animation when 20% of the section is visible
    
    observer.observe(currentStatsRef);
    
    return () => {
      observer.unobserve(currentStatsRef);
    };
  }, [loading]);
  
  // Handle delete button click
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this examiner? This action cannot be undone.')) {
      try {
        await deleteExaminer(id);
        toast.success('Examiner deleted successfully');
        navigate('/');
      } catch (err) {
        console.error('Error deleting examiner:', err);
        toast.error('Failed to delete examiner: ' + (err.message || 'Unknown error'));
      }
    }
  };
  
  // Handle view calculations click
  const handleViewCalculations = () => {
    navigate(`/calculations?examiner=${id}`);
  };
  
  // Handle view PDFs click
  const handleViewPDFs = () => {
    navigate(`/history?examiner=${id}`);
  };
  
  // Function to generate placeholder profile image if no profile picture
  const getProfileImage = (examiner) => {
    if (examiner?.profile_url) {
      return examiner.profile_url;
    }
    
    // Generate placeholder with initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      examiner?.full_name || 'Unknown'
    )}&background=${isDarkMode ? '0369a1' : '3b82f6'}&color=ffffff&size=128`;
  };
  
  // Render a calculation row
  const renderCalculationItem = (calculation) => {
    console.log("Rendering calculation:", calculation);
    
    // Try to parse the metadata JSON if it exists and is a string
    let metadata = {};
    if (calculation.metadata && typeof calculation.metadata === 'string') {
      try {
        metadata = JSON.parse(calculation.metadata);
      } catch (e) {
        console.error("Error parsing metadata:", e);
      }
    } else if (calculation.metadata && typeof calculation.metadata === 'object') {
      metadata = calculation.metadata;
    }
    
    return (
      <div 
        key={calculation.id} 
        className={`p-4 mb-2 rounded-lg ${
          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
        } transition-colors cursor-pointer`}
        onClick={() => navigate(`/calculations/view/${calculation.id}`)}
      >
        <div className="flex justify-between items-center">
          <div>
            <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {calculation.calculation_name || metadata.calculation_name || `Calculation ${formatDate(calculation.created_at || new Date())}`}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {calculation.calculation_date 
                ? formatDate(calculation.calculation_date) 
                : metadata.calculation_date 
                  ? formatDate(metadata.calculation_date) 
                  : formatDate(calculation.created_at || new Date())}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              ₹{parseFloat(calculation.final_amount || metadata.total_amount || metadata.final_amount || 0).toFixed(2)}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {calculation.total_papers || metadata.total_papers || 0} Papers
            </p>
            {!calculation.pdf_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGeneratePDF(calculation.id);
                }}
                className="mt-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Generate PDF
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // Handle PDF generation for a calculation
  const handleGeneratePDF = async (calculationId) => {
    try {
      toast.loading('Generating PDF report...');
      const fileName = `Calculation_${new Date().getTime()}.pdf`;
      await calculationService.generateCalculationPDF(calculationId, fileName);
      toast.dismiss();
      toast.success('PDF report generated successfully');
      
      // Refresh the calculations to show the new PDF
      if (examiner) {
        const calculations = await calculationService.getCalculationsByExaminer(id);
        setRecentCalculations(calculations.slice(0, 3));
        const pdfs = calculations.filter(calc => calc.pdf_url).slice(0, 3);
        setRecentPDFs(pdfs);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF: ' + (error.message || 'Unknown error'));
    }
  };
  
  // Render a PDF item
  const renderPDFItem = (pdf) => {
    console.log("Rendering PDF:", pdf);
    return (
      <div 
        key={pdf.id} 
        className={`p-4 mb-2 rounded-lg ${
          isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
        } transition-colors cursor-pointer`}
        onClick={() => window.open(pdf.pdf_url, '_blank')}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <svg className="h-8 w-8 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            <div>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {pdf.calculation_name || `Calculation PDF ${formatDate(pdf.created_at || new Date())}`}
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatDate(pdf.created_at || new Date())}
              </p>
            </div>
          </div>
          <div className="text-right">
            <button 
              className={`px-3 py-1 rounded ${
                isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
              } text-white text-sm`}
              onClick={(e) => {
                e.stopPropagation();
                window.open(pdf.pdf_url, '_blank');
              }}
            >
              View
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Examiner Profile
                  </h1>
                  <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    View complete details and statistics for this examiner
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className={`px-4 py-2 border rounded-md flex items-center ${
                    isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
            
            <div className="flex justify-center items-center h-64">
              <div className={`animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-700'}`}></div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className="flex flex-col items-center justify-center h-64">
              <div className={`text-center p-8 rounded-lg shadow-md ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
                <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 className={`mt-2 text-lg font-medium ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  Examiner Not Found
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {error.includes('No examiner found') 
                    ? `The examiner with ID ${id} could not be found.`
                    : error}
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          {examiner && (
            <div>
              {/* Examiner Profile Overview Section */}
              <div className={`rounded-lg overflow-hidden shadow-md ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row">
                    {/* Profile Image */}
                    <div className="mb-6 md:mb-0 md:mr-6">
                      <img
                        src={getProfileImage(examiner)}
                        alt={`${examiner.full_name} profile`}
                        className={`w-32 h-32 rounded-full object-cover ${isDarkMode ? 'border-4 border-gray-700' : 'border-4 border-white'} shadow`}
                      />
                    </div>
                    
                    {/* Examiner Details */}
                    <div className="flex-1">
                      {/* Name, ID and Action buttons */}
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h1 className={`text-xl font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {examiner.full_name}
                          </h1>
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ID: {examiner.examiner_id}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/examiners/edit/${id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                            aria-label="Edit examiner"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={handleDelete}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                            aria-label="Delete examiner"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            Department
                          </h3>
                          <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                            {examiner.department || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            Position
                          </h3>
                          <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                            {examiner.position || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            Email
                          </h3>
                          <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                            {examiner.email || 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <h3 className={`text-sm font-medium ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            Phone
                          </h3>
                          <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                            {examiner.phone || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Cards Section */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to={`/calculations/new/${id}`}
                  state={{ 
                    fromExaminerDetail: true,
                    examinerData: examiner
                  }}
                  className={`flex items-center p-6 rounded-lg shadow-md transition-all hover:shadow-lg ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-3 rounded-full mr-4 ${
                    isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Salary Calculator
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Calculate salary for this examiner
                    </p>
                  </div>
                </Link>
                
                <button
                  onClick={handleViewPDFs}
                  className={`flex items-center p-6 rounded-lg shadow-md transition-all hover:shadow-lg ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-3 rounded-full mr-4 ${
                    isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className={`font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      History
                    </h3>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      View PDFs and calculation history
                    </p>
                  </div>
                </button>
              </div>
              
              {/* Statistics section */}
              {statistics && (
                <div 
                  ref={statsRef}
                  className={`mt-6 rounded-lg overflow-hidden shadow-md ${
                    isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
                  }`}
                >
                  <div className="p-6">
                    <h2 className={`text-xl font-semibold mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Examiner Statistics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-blue-50'
                      }`}>
                        <h3 className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Total Papers
                        </h3>
                        <p className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-blue-600'
                        }`}>
                          <AnimatedCounter value={statistics.total_papers || 0} startAnimation={statsVisible} />
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-green-50'
                      }`}>
                        <h3 className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Total Earnings
                        </h3>
                        <p className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-green-600'
                        }`}>
                          ₹<AnimatedCounter value={statistics.total_earnings || 0} decimals={2} startAnimation={statsVisible} />
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-purple-50'
                      }`}>
                        <h3 className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Evaluation Days
                        </h3>
                        <p className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-purple-600'
                        }`}>
                          <AnimatedCounter value={statistics.total_staff || 0} startAnimation={statsVisible} />
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-orange-50'
                      }`}>
                        <h3 className={`text-sm font-medium whitespace-nowrap ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          Avg. Papers / Day
                        </h3>
                        <p className={`text-2xl font-bold ${
                          isDarkMode ? 'text-white' : 'text-orange-600'
                        }`}>
                          <AnimatedCounter value={statistics.average_papers_per_day || 0} decimals={1} startAnimation={statsVisible} />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* History Preview Section */}
              <div className={`mt-6 rounded-lg overflow-hidden shadow-md ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
              }`}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className={`text-xl font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Recent History
                    </h2>
                    <button
                      onClick={handleViewPDFs}
                      className={`text-sm ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}
                    >
                      View Full History
                    </button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-4">
                    <nav className="flex -mb-px">
                      <button
                        onClick={() => setActiveTab('pdf')}
                        className={`py-2 px-4 text-sm font-medium ${
                          activeTab === 'pdf'
                            ? isDarkMode
                              ? 'text-blue-400 border-b-2 border-blue-400'
                              : 'text-blue-600 border-b-2 border-blue-600'
                            : isDarkMode
                              ? 'text-gray-400 hover:text-gray-300'
                              : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        PDF History
                      </button>
                      <button
                        onClick={() => setActiveTab('calculation')}
                        className={`py-2 px-4 text-sm font-medium ${
                          activeTab === 'calculation'
                            ? isDarkMode
                              ? 'text-blue-400 border-b-2 border-blue-400'
                              : 'text-blue-600 border-b-2 border-blue-600'
                            : isDarkMode
                              ? 'text-gray-400 hover:text-gray-300'
                              : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Calculation History
                      </button>
                    </nav>
                  </div>
                  
                  {/* Tab Content */}
                  <div className="min-h-[200px]">
                    {activeTab === 'pdf' ? (
                      <div>
                        {pdfsLoading ? (
                          <div className="flex justify-center items-center py-8">
                            <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-700'}`}></div>
                          </div>
                        ) : recentPDFs.length > 0 ? (
                          <div>
                            <div className="space-y-2">
                              {recentPDFs.map(renderPDFItem)}
                            </div>
                            <div className="mt-4 text-center">
                              <button
                                onClick={handleViewPDFs}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                View All PDFs
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`text-center py-8 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                            <p className="mt-2">No recent PDFs found</p>
                            <button
                              onClick={handleViewPDFs}
                              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              View All PDFs
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {calculationsLoading ? (
                          <div className="flex justify-center items-center py-8">
                            <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 ${isDarkMode ? 'border-blue-400' : 'border-blue-700'}`}></div>
                          </div>
                        ) : recentCalculations.length > 0 ? (
                          <div>
                            <div className="space-y-2">
                              {recentCalculations.map(renderCalculationItem)}
                            </div>
                            <div className="mt-4 text-center">
                              <button
                                onClick={handleViewCalculations}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                View All Calculations
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`text-center py-8 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                            </svg>
                            <p className="mt-2">No recent calculations found</p>
                            <button
                              onClick={handleViewCalculations}
                              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              View All Calculations
                            </button>
                          </div>
                        )}
                      </div>
                    )}
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

export default ExaminerDetail; 