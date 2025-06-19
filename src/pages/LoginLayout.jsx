import React, { useState, useEffect } from 'react';
import gncLogo from '../assets/gnc_logo.png';
import examinerProLogo from '../assets/examinerpro-white.png';

const LoginLayout = ({ children }) => {
  // Using direct URL path which is more reliable
  const backgroundImageUrl = process.env.PUBLIC_URL + '/gnc-background.jpg';
  const [imageError, setImageError] = useState(false);

  // Preload the image to check if it loads correctly
  useEffect(() => {
    const img = new Image();
    img.src = backgroundImageUrl;
    img.onerror = () => {
      console.error('Failed to load background image:', backgroundImageUrl);
      setImageError(true);
    };
  }, [backgroundImageUrl]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-900 to-gray-800 bg-cover bg-center z-0"
        style={imageError ? {} : { 
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Left Side - College Information */}
      <div className="md:w-1/2 relative z-10 flex items-center justify-center p-4 md:p-6">
        <div className="bg-black bg-opacity-60 text-white p-4 md:p-6 rounded-lg shadow-md flex flex-col items-center text-center w-full">
          {/* ExaminerPro Logo */}
          <img 
            src={examinerProLogo} 
            alt="ExaminerPro Logo" 
            className="w-80 mb-4 animate__animated animate__fadeIn" 
          />
          <img 
            src={gncLogo} 
            alt="GNC Logo" 
            className="w-40 h-40 mb-4" 
          />
          <h1 className="text-xl md:text-2xl font-bold mb-1 animate__animated animate__fadeIn">
            GURU NANAK COLLEGE (AUTONOMOUS)
          </h1>
          <p className="text-xs md:text-sm mb-2 animate__animated animate__fadeIn animate__delay-1s">
            A Unit of Guru Nanak Educational Society (Regd.)
          </p>
          <h2 className="text-lg md:text-xl font-bold animate__animated animate__fadeIn animate__delay-2s">
            CENTER OF EXAMINATIONS (COE)
          </h2>
        </div>
      </div>

      {/* Right Side - Authentication Form */}
      <div className="md:w-1/2 relative z-10 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md h-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LoginLayout; 