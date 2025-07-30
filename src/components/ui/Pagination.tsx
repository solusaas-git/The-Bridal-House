'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = false,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}) => {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Results info and page size selector */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">
          Showing {startIndex + 1} to {endIndex} of {totalCount} results
        </div>
        
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation buttons - always visible but disabled when not needed */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <span className="px-4 py-2 text-white">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination; 