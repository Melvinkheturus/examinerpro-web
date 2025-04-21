import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import ImageCropper from '../components/ImageCropper';
import { useTheme } from '../contexts/ThemeContext';
import { createExaminer, uploadProfilePicture, getExaminerById, updateExaminer } from '../services/examinerService';
import { CameraIcon } from '@heroicons/react/24/outline';

// Form validation schema
const examinerSchema = yup.object({
  full_name: yup.string().required('Full name is required'),
  examiner_id: yup.string().required('Examiner ID is required'),
  department: yup.string().required('Department is required'),
  position: yup.string().required('Position is required'),
  email: yup.string().email('Must be a valid email').required('Email is required'),
  phone: yup.string()
    .matches(/^\d{10}$/, 'Phone number must be 10 digits')
    .required('Phone number is required'),
});

const AddExaminer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const isEditing = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // React Hook Form setup with yup validation
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: yupResolver(examinerSchema),
    defaultValues: {
      full_name: '',
      examiner_id: '',
      department: '',
      position: '',
      email: '',
      phone: '',
    }
  });

  // Load examiner data when editing
  useEffect(() => {
    const fetchExaminerData = async () => {
      if (isEditing) {
        try {
          setIsLoading(true);
          const examiner = await getExaminerById(id);
          
          // Update form with examiner data
          setValue('full_name', examiner.full_name);
          setValue('examiner_id', examiner.examiner_id);
          setValue('department', examiner.department);
          setValue('position', examiner.position);
          setValue('email', examiner.email);
          setValue('phone', examiner.phone);
          
          // Set profile image if available
          if (examiner.profile_url) {
            setProfileImage(examiner.profile_url);
          }
        } catch (error) {
          console.error('Error loading examiner data:', error);
          toast.error('Failed to load examiner data');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchExaminerData();
  }, [id, isEditing, setValue]);

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      
      let examinerData = {
        full_name: data.full_name,
        examiner_id: data.examiner_id,
        department: data.department,
        position: data.position,
        email: data.email,
        phone: data.phone,
      };
      
      let examinerId;
      
      if (isEditing) {
        // Update existing examiner
        await updateExaminer(id, examinerData);
        examinerId = id;
        toast.success('Examiner updated successfully');
      } else {
        // Create new examiner
        const newExaminer = await createExaminer(examinerData);
        examinerId = newExaminer.id;
        toast.success('Examiner created successfully');
      }
      
      // Upload profile picture if changed
      if (profileImageFile) {
        await uploadProfilePicture(examinerId, profileImageFile);
      }
      
      // Navigate back to dashboard or examiner detail
      navigate('/');
    } catch (error) {
      console.error('Error submitting examiner form:', error);
      toast.error(error.message || 'Failed to save examiner');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setOriginalImage(URL.createObjectURL(file));
      setShowCropper(true);
    }
  };

  // Handle cropped image
  const handleCroppedImage = (croppedImage, file) => {
    setProfileImage(croppedImage);
    setProfileImageFile(file);
    setShowCropper(false);
  };

  // Handle cancel crop
  const handleCancelCrop = () => {
    setOriginalImage(null);
    setShowCropper(false);
  };

  // Dynamic CSS classes based on theme
  const labelColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const cardBgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
  const cardBorderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const inputBgColor = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const inputBorderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const inputFocusBorderColor = isDarkMode ? 'focus:border-blue-400' : 'focus:border-blue-500';
  const errorColor = 'text-red-500';
  const buttonBgColor = isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600';
  const secondaryButtonBgColor = isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300';
  const secondaryButtonTextColor = isDarkMode ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className={`flex-1 overflow-auto p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  {isEditing ? 'Edit Examiner' : 'New Examiner'}
                </h1>
                <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isEditing ? 'Update examiner information and settings' : 'Register a new examiner in the system'}
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
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {/* Form */}
            {!isLoading && (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className={`rounded-lg shadow-md overflow-hidden border ${cardBgColor} ${cardBorderColor}`}>
                  
                  {/* Profile Picture Section */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className={`text-xl font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Profile Picture
                    </h2>
                    
                    <div className="flex items-center">
                      <div className="relative mr-6">
                        <div 
                          className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}
                        >
                          {profileImage ? (
                            <img 
                              src={profileImage} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CameraIcon className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        
                        <label 
                          htmlFor="profilePicture"
                          className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full cursor-pointer"
                        >
                          <CameraIcon className="h-4 w-4" />
                        </label>
                        
                        <input
                          id="profilePicture"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                      </div>
                      
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Upload a profile picture for the examiner.
                        </p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          JPG, PNG or GIF, max 2MB
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Personal Information Section */}
                  <div className="p-6">
                    <h2 className={`text-xl font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Personal Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="mb-4">
                        <label htmlFor="full_name" className={`block mb-1 text-sm font-medium ${labelColor}`}>
                          Full Name
                        </label>
                        <input
                          id="full_name"
                          type="text"
                          className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${inputFocusBorderColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="Enter full name"
                          {...register('full_name')}
                        />
                        {errors.full_name && (
                          <p className={`mt-1 text-sm ${errorColor}`}>{errors.full_name.message}</p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="position" className={`block mb-1 text-sm font-medium ${labelColor}`}>
                          Position
                        </label>
                        <input
                          id="position"
                          type="text"
                          className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${inputFocusBorderColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="Enter position (e.g. Professor)"
                          {...register('position')}
                        />
                        {errors.position && (
                          <p className={`mt-1 text-sm ${errorColor}`}>{errors.position.message}</p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="examiner_id" className={`block mb-1 text-sm font-medium ${labelColor}`}>
                          Examiner ID
                        </label>
                        <input
                          id="examiner_id"
                          type="text"
                          className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${inputFocusBorderColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="Enter examiner ID"
                          {...register('examiner_id')}
                        />
                        {errors.examiner_id && (
                          <p className={`mt-1 text-sm ${errorColor}`}>{errors.examiner_id.message}</p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="department" className={`block mb-1 text-sm font-medium ${labelColor}`}>
                          Department
                        </label>
                        <input
                          id="department"
                          type="text"
                          className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${inputFocusBorderColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="Enter department"
                          {...register('department')}
                        />
                        {errors.department && (
                          <p className={`mt-1 text-sm ${errorColor}`}>{errors.department.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information Section */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                    <h2 className={`text-xl font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      Contact Information
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="mb-4">
                        <label htmlFor="email" className={`block mb-1 text-sm font-medium ${labelColor}`}>
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${inputFocusBorderColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="Enter email address"
                          {...register('email')}
                        />
                        {errors.email && (
                          <p className={`mt-1 text-sm ${errorColor}`}>{errors.email.message}</p>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="phone" className={`block mb-1 text-sm font-medium ${labelColor}`}>
                          Phone
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${inputFocusBorderColor} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                          placeholder="Enter phone number"
                          {...register('phone')}
                        />
                        {errors.phone && (
                          <p className={`mt-1 text-sm ${errorColor}`}>{errors.phone.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Form Actions */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className={`px-4 py-2 rounded-md ${secondaryButtonBgColor} ${secondaryButtonTextColor}`}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-md ${buttonBgColor} text-white`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : (
                        <span>{isEditing ? 'Update Examiner' : 'Create Examiner'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
      
      {/* Image Cropper Modal */}
      {showCropper && (
        <ImageCropper
          image={originalImage}
          onCrop={handleCroppedImage}
          onCancel={handleCancelCrop}
          aspect={1}
        />
      )}
    </div>
  );
};

export default AddExaminer; 