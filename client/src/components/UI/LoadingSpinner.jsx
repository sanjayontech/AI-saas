import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div 
      data-testid="loading-spinner"
      className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizes[size]} ${className}`} 
    />
  );
};

const LoadingPage = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  </div>
);

LoadingSpinner.Page = LoadingPage;

export { LoadingSpinner };
export default LoadingSpinner;