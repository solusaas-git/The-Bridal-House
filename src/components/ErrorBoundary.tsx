'use client';

import React from 'react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-gray-600 mb-4">
            We encountered an unexpected error. Please try again.
          </p>
          
          <details className="text-left mb-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error details
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-x-auto">
              {error.message}
            </pre>
          </details>
          
          <button
            onClick={resetErrorBoundary}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback; 