import React from 'react';
import { Link } from 'react-router-dom';
import examinerProLogo from '../../assets/examinerpro logo.png';
import gncLogo from '../../assets/gnc_logo.png';

const AuthCard = ({ title, children, footerText, footerLink, footerLinkText }) => {
  const backgroundImageUrl = process.env.PUBLIC_URL + '/gnc-background.jpg';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative"
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50 z-0" />

      {/* Compact Auth Card */}
      <div className="relative z-10 w-full max-w-sm bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-xl p-4 md:p-6">
        
        {/* Branding */}
        <div className="text-center mb-6">
          <img src={examinerProLogo} alt="ExaminerPro Logo" className="h-6 md:h-8 mx-auto mb-2" />
          <img src={gncLogo} alt="GNC Logo" className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-2" />
          <h2 className="text-sm md:text-base font-semibold text-gray-800">
            GURU NANAK COLLEGE (AUTONOMOUS)
          </h2>
          <p className="text-gray-600 text-xs">CENTER OF EXAMINATIONS (COE)</p>
        </div>

        {/* Title */}
        {title && (
          <h3 className="text-center text-lg md:text-xl font-bold text-gray-900 mb-6">
            {title}
          </h3>
        )}

        {/* Children Content (Forms) */}
        <div className="mb-6">{children}</div>

        {/* Footer */}
        {footerText && (
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {footerText}{' '}
              {footerLink && footerLinkText && (
                <Link 
                  to={footerLink} 
                  className="font-medium text-blue-600 hover:text-blue-500 transition"
                >
                  {footerLinkText}
                </Link>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCard;
