'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
  label?: string;
  className?: string;
  showQuickFilters?: boolean;
}

const DateFilter: React.FC<DateFilterProps> = ({
  startDate,
  endDate,
  onDateChange,
  label = "Date Range",
  className = "",
  showQuickFilters = true,
}) => {
  const { t } = useTranslation('shared');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Local state for date inputs (not applied until submit)
  const [localStartDate, setLocalStartDate] = useState('');
  const [localEndDate, setLocalEndDate] = useState('');

  // Update active filter status when dates change
  useEffect(() => {
    setHasActiveFilter(Boolean(startDate || endDate));
  }, [startDate, endDate]);

  // Update local state when props change
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  // Set mounted state for safe portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update button position when dropdown opens or window resizes
  useEffect(() => {
    const updatePosition = () => {
      if (showDatePicker && buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
    };

    if (showDatePicker) {
      updatePosition();
      
      // Use passive listeners and throttling for mobile optimization
      const throttledUpdate = (() => {
        let timeoutId: NodeJS.Timeout;
        return () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(updatePosition, 16); // ~60fps
        };
      })();
      
      window.addEventListener('scroll', throttledUpdate, { passive: true });
      window.addEventListener('resize', throttledUpdate, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', throttledUpdate);
        window.removeEventListener('resize', throttledUpdate);
      };
    }
  }, [showDatePicker]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleQuickFilter = (days: number) => {
    const today = new Date();
    const startDateObj = new Date(today);
    startDateObj.setDate(today.getDate() - days);
    
    const formattedStartDate = formatDateForInput(startDateObj);
    const formattedEndDate = formatDateForInput(today);
    
    // Quick filters apply immediately
    onDateChange(formattedStartDate, formattedEndDate);
    setShowDatePicker(false);
  };

  const handleClear = () => {
    onDateChange('', '');
    setLocalStartDate('');
    setLocalEndDate('');
    setShowDatePicker(false);
  };

  const handleApply = () => {
    // Apply the local dates to the parent component
    onDateChange(localStartDate, localEndDate);
    setShowDatePicker(false);
  };

  const getFilterText = () => {
    if (startDate && endDate) {
      return `${startDate} to ${endDate}`;
    } else if (startDate) {
      return `from ${startDate}`;
    } else if (endDate) {
      return `until ${endDate}`;
    }
    return '';
  };

  return (
    <div className={`relative z-[100] ${className}`} style={{ zIndex: 100 }}>
      {/* Filter Button */}
      <div className="flex items-center gap-2">
        <button
          ref={buttonRef}
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-md border transition-all w-full sm:w-auto ${
            hasActiveFilter
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
              : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </button>

        {hasActiveFilter && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/20 border border-red-500/30 text-red-300 rounded hover:bg-red-500/30 transition-colors"
          >
            <X className="h-3 w-3" />
            {t('dateFilter.clear')}
          </button>
        )}
      </div>

      {/* Active Filter Display */}
      {hasActiveFilter && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
              {getFilterText()}
            </span>
          </div>
        </div>
      )}

      {/* Date Picker Dropdown */}
      {showDatePicker && mounted && buttonRect && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setShowDatePicker(false)}
          />
          
          {/* Dropdown */}
          <div 
            className="fixed w-80 max-w-[calc(100vw-2rem)] bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl p-4"
            style={{ 
              zIndex: 9999,
              top: buttonRect.bottom + 2, // Stick close to button bottom
              left: Math.max(8, Math.min(buttonRect.left, window.innerWidth - 320 - 8)), // Keep within viewport with small margin
            }}
          >
            <h3 className="text-sm font-medium text-white mb-3">
              {t('dateFilter.selectDateRange')}
            </h3>
            
            {/* Quick Filters */}
            {showQuickFilters && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">{t('dateFilter.quickFilters')}:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickFilter(7)}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors text-gray-300"
                  >
                    {t('dateFilter.last7Days')}
                  </button>
                  <button
                    onClick={() => handleQuickFilter(30)}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors text-gray-300"
                  >
                    {t('dateFilter.last30Days')}
                  </button>
                  <button
                    onClick={() => handleQuickFilter(90)}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors text-gray-300"
                  >
                    {t('dateFilter.last90Days')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Date Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('dateFilter.startDate')}</label>
                <input
                  type="date"
                  value={localStartDate}
                  onChange={(e) => setLocalStartDate(e.target.value)}
                  className="w-full h-8 px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  max={localEndDate || undefined}
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('dateFilter.endDate')}</label>
                <input
                  type="date"
                  value={localEndDate}
                  onChange={(e) => setLocalEndDate(e.target.value)}
                  className="w-full h-8 px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={localStartDate || undefined}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {t('dateFilter.clearFilter')}
              </button>
              <button
                onClick={handleApply}
                className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                {t('dateFilter.applyFilter')}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default DateFilter; 