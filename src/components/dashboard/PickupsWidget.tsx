'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Truck, Clock, Package, Eye, X } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface Reservation {
  _id: string;
  type: string;
  pickupDate: string;
  client?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    weddingDate?: string;
  };
  items?: Array<{
    name: string;
  }>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface PickupsWidgetProps {
  reservations: Reservation[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange, label: string) => void;
  activeRange: string;
  predefinedRanges: Record<string, DateRange>;
}

const PickupsWidget: React.FC<PickupsWidgetProps> = ({
  reservations,
  dateRange,
  onDateRangeChange,
  activeRange,
  predefinedRanges,
}) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const { t } = useTranslation('dashboard');
  
  const upcomingPickups = reservations?.filter((reservation) => {
    const pickupDate = new Date(reservation.pickupDate);
    return isWithinInterval(pickupDate, {
      start: dateRange.startDate,
      end: dateRange.endDate,
    });
  }) || [];

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);

      if (startDate <= endDate) {
        onDateRangeChange({
          startDate,
          endDate,
        }, 'Custom');
      }
    }
  };

  const handleCustomRangeSelect = () => {
    if (!customStartDate || !customEndDate) {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const startDateStr = formatDateForInput(sevenDaysAgo);
      const endDateStr = formatDateForInput(today);
      setCustomStartDate(startDateStr);
      setCustomEndDate(endDateStr);
      
      // Trigger the date range update immediately with default dates
      setTimeout(() => {
        const startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
        onDateRangeChange({
          startDate,
          endDate,
        }, 'Custom');
      }, 0);
    }
  };

  useEffect(() => {
    if (activeRange === 'Custom' && customStartDate && customEndDate) {
      handleCustomDateChange();
    }
  }, [activeRange, customStartDate, customEndDate]);

  const availableRanges = { ...predefinedRanges, Custom: { startDate: new Date(), endDate: new Date() } };

  const handleReservationClick = (reservationId: string) => {
    window.open(`/reservations/${reservationId}`, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Truck className="h-5 w-5 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">{t('widgets.pickups.title')}</h3>
        </div>
        
        <div className="flex flex-col gap-2">
          <select
            value={activeRange}
            onChange={(e) => {
              if (e.target.value === 'Custom') {
                handleCustomRangeSelect();
                setShowCustomDatePicker(true);
              } else {
                const range = predefinedRanges[e.target.value];
                if (range) {
                  onDateRangeChange(range, e.target.value);
                  setShowCustomDatePicker(false);
                }
              }
            }}
            className="text-sm border border-white/20 rounded-md px-3 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-lg"
          >
            {Object.keys(availableRanges).map((key) => (
              <option key={key} value={key} className="bg-gray-800 text-white">
                {key}
              </option>
            ))}
          </select>
          
          {/* Custom Date Range Inputs */}
          {showCustomDatePicker && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                                      onChange={(e) => {
                      const newStartDate = e.target.value;
                      setCustomStartDate(newStartDate);
                      // Trigger update immediately if both dates are set
                      if (newStartDate && customEndDate) {
                        setTimeout(() => {
                          const startDate = new Date(newStartDate);
                          startDate.setHours(0, 0, 0, 0);
                          const endDate = new Date(customEndDate);
                          endDate.setHours(23, 59, 59, 999);
                          if (startDate <= endDate) {
                            onDateRangeChange({ startDate, endDate }, 'Custom');
                          }
                        }, 0);
                      }
                    }}
                  className="text-xs border border-white/20 rounded-md px-2 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  max={customEndDate || undefined}
                  title={t('widgets.pickups.startDate')}
                />
                <span className="text-gray-400 text-xs">{t('widgets.pickups.to')}</span>
                <input
                  type="date"
                  value={customEndDate}
                                      onChange={(e) => {
                      const newEndDate = e.target.value;
                      setCustomEndDate(newEndDate);
                      // Trigger update immediately if both dates are set
                      if (customStartDate && newEndDate) {
                        setTimeout(() => {
                          const startDate = new Date(customStartDate);
                          startDate.setHours(0, 0, 0, 0);
                          const endDate = new Date(newEndDate);
                          endDate.setHours(23, 59, 59, 999);
                          if (startDate <= endDate) {
                            onDateRangeChange({ startDate, endDate }, 'Custom');
                          }
                        }, 0);
                      }
                    }}
                  className="text-xs border border-white/20 rounded-md px-2 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={customStartDate || undefined}
                  title={t('widgets.pickups.endDate')}
                />
              </div>
              {activeRange === 'Custom' && customStartDate && customEndDate && (
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded text-center">
                  {t('widgets.pickups.customRangeActive')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {upcomingPickups.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 bg-green-500/10 rounded-full w-fit mx-auto mb-3">
              <Truck className="h-12 w-12 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm">{t('widgets.pickups.noPickups')}</p>
          </div>
        ) : (
          upcomingPickups.slice(0, 5).map((reservation) => (
            <div
              key={reservation._id}
              onClick={() => handleReservationClick(reservation._id)}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <div className="p-1.5 bg-green-500/10 rounded-full">
                <Truck className="h-3 w-3 text-green-400" />
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {reservation.client 
                    ? `${reservation.client.firstName || ''} ${reservation.client.lastName || ''}`.trim() || t('widgets.pickups.unknownCustomer')
                    : t('widgets.pickups.unknownCustomer')
                  }
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-400">
                    {format(new Date(reservation.pickupDate), 'dd/MM/yyyy • HH:mm')}
                  </p>
                </div>
                {reservation.items && reservation.items.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Package className="h-3 w-3 text-gray-500" />
                    <p className="text-xs text-gray-500">
                      {reservation.items.length} {t('widgets.pickups.items')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {upcomingPickups.length > 5 && (
          <button
            onClick={() => setShowAllModal(true)}
            className="flex items-center justify-center gap-2 w-full p-2 mt-3 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
          >
            <Eye className="h-3 w-3" />
            {t('widgets.pickups.viewAll', { count: upcomingPickups.length })}
          </button>
        )}
      </div>

      {/* Modal for all pickups */}
      {showAllModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Truck className="h-5 w-5 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {t('widgets.pickups.viewAll', { count: upcomingPickups.length })}
                </h2>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {upcomingPickups.map((reservation) => (
                  <div
                    key={reservation._id}
                    onClick={() => handleReservationClick(reservation._id)}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="p-1.5 bg-green-500/10 rounded-full">
                      <Truck className="h-3 w-3 text-green-400" />
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {reservation.client 
                          ? `${reservation.client.firstName || ''} ${reservation.client.lastName || ''}`.trim() || t('widgets.pickups.unknownCustomer')
                          : t('widgets.pickups.unknownCustomer')
                        }
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-400">
                          {format(new Date(reservation.pickupDate), 'dd/MM/yyyy • HH:mm')}
                        </p>
                      </div>
                      {reservation.items && reservation.items.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Package className="h-3 w-3 text-gray-500" />
                          <p className="text-xs text-gray-500">
                            {reservation.items.length} {t('widgets.pickups.items')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PickupsWidget; 