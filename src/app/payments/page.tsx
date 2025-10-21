'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import {
  setPayments,
  setLoading,
  setError,
  setSearchTerm,
  setCurrentPage,
  setPageSize,
  Payment,
} from '@/store/reducers/paymentSlice';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import axios from 'axios';
import { createPortal } from 'react-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeOpenIcon,
  Pencil1Icon,
  TrashIcon,
  GearIcon,
} from '@radix-ui/react-icons';
import Layout from '@/components/Layout';
import Pagination from '@/components/ui/Pagination';
import { formatCurrency } from '@/utils/currency';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import DateFilter from '@/components/shared/DateFilter';
import { usePaymentsCount } from '@/hooks/usePaymentsCount';
import { useTranslation } from 'react-i18next';

// Component that uses useSearchParams
const PaymentsContent = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const { t } = useTranslation('payments');
  const { t: tCommon } = useTranslation('common');
  const { recentCount, todayCount } = usePaymentsCount();

  // Redux state
  const paymentState = useSelector((state: RootState) => state.payment);
  const payments = paymentState?.payments || [];
  const loading = paymentState?.loading || false;
  const error = paymentState?.error || null;
  const currentPage = paymentState?.currentPage || 1;
  const pageSize = paymentState?.pageSize || 50;
  const searchTerm = paymentState?.searchTerm || '';
  const totalCount = paymentState?.totalCount || 0;
  const totalPages = paymentState?.totalPages || 1;
  const currencySettings = useSelector((state: RootState) => state.settings);

  // Local state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isProcessingUrlParams, setIsProcessingUrlParams] = useState(false);
  
  // Date filter state - unified format
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    customer: true,
    reservation: true,
    amount: true,
    paymentDate: true,
    paymentMethod: true,
    paymentType: true,
    status: true,
    reference: true,
    note: true,
    attachments: true,
    createdBy: true,
    actions: true,
  });

  // Load column preferences on mount
  useEffect(() => {
    const loadColumnPreferences = async () => {
      try {
        setLoadingPreferences(true);
        const response = await axios.get('/api/user-preferences/columns/payments', {
          withCredentials: true,
        });
        
        if (response.data.success && response.data.columnPreferences) {
          // Merge loaded preferences with default state to ensure new fields are included
          setColumnVisibility(prev => ({
            ...prev,
            ...response.data.columnPreferences
          }));
        }
      } catch (error) {
        console.error('Error loading column preferences:', error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadColumnPreferences();
    setMounted(true);
  }, []);

  // Read URL parameters on mount
  useEffect(() => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    
    // Check if we have URL parameters to process
    if (urlStartDate || urlEndDate) {
      setIsProcessingUrlParams(true);
    }
    
    let shouldFetch = false;
    let newStartDate = startDate;
    let newEndDate = endDate;
    
    if (urlStartDate && urlStartDate !== startDate) {
      setStartDate(urlStartDate);
      newStartDate = urlStartDate;
      shouldFetch = true;
    }
    if (urlEndDate && urlEndDate !== endDate) {
      setEndDate(urlEndDate);
      newEndDate = urlEndDate;
      shouldFetch = true;
    }
    
    // Trigger fetch immediately if dates were set from URL
    if (shouldFetch) {
      const fetchWithUrlDates = async () => {
        try {
          dispatch(setLoading(true));
          dispatch(setError(null));
          
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: pageSize.toString(),
            search: searchTerm,
          });

          // Use the URL date values
          if (newStartDate) {
            params.append('dateFrom', newStartDate);
          }
          if (newEndDate) {
            params.append('dateTo', newEndDate);
          }

          const response = await axios.get(`/api/payments?${params}`);
          
          if (response.data.success) {
            dispatch(setPayments({
              payments: response.data.payments,
              totalCount: response.data.totalCount,
              currentPage: response.data.currentPage,
              pageSize: response.data.itemsPerPage,
              totalPages: response.data.totalPages,
            }));
          } else {
            dispatch(setError('Failed to fetch payments'));
          }
        } catch (error) {
          console.error('Error fetching payments:', error);
          dispatch(setError('Failed to fetch payments'));
          toast.error('Failed to fetch payments');
        } finally {
          dispatch(setLoading(false));
          setIsProcessingUrlParams(false); // Clear the flag when done
        }
      };
      
      fetchWithUrlDates();
    } else {
      setIsProcessingUrlParams(false); // Clear the flag if no URL params to process
    }
  }, [searchParams]);

  // Handle date filter changes
  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    // Trigger fetch immediately with new date values to avoid timing issues
    const fetchWithNewDates = async () => {
      try {
        dispatch(setLoading(true));
        dispatch(setError(null));
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          search: searchTerm,
        });

        // Use the new date values directly
        if (newStartDate) {
          params.append('dateFrom', newStartDate);
        }
        if (newEndDate) {
          params.append('dateTo', newEndDate);
        }

        const response = await axios.get(`/api/payments?${params}`);
        
        if (response.data.success) {
          dispatch(setPayments({
            payments: response.data.payments,
            totalCount: response.data.totalCount,
            currentPage: response.data.currentPage,
            pageSize: response.data.itemsPerPage,
            totalPages: response.data.totalPages,
          }));
        } else {
          dispatch(setError('Failed to fetch payments'));
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
        dispatch(setError(t('messages.loadFailed')));
        toast.error(t('messages.loadFailed'));
      } finally {
        dispatch(setLoading(false));
      }
    };
    
    fetchWithNewDates();
  };

  // Update button position when dropdown opens or window resizes/scrolls
  useEffect(() => {
    const updatePosition = () => {
      if (isDropdownOpen && buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
    };

    if (isDropdownOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isDropdownOpen]);

  // Fetch payments on component mount and when dependencies change
  const fetchPaymentsData = useCallback(async () => {
    try {
      
      dispatch(setLoading(true));
      dispatch(setError(null));
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
      });

      // Add date filters if they exist
      if (startDate) {
        params.append('dateFrom', startDate);
      }
      if (endDate) {
        params.append('dateTo', endDate);
      }

      const response = await axios.get(`/api/payments?${params}`);
      
      if (response.data.success) {
        dispatch(setPayments({
          payments: response.data.payments,
          totalCount: response.data.totalCount,
          currentPage: response.data.currentPage,
          pageSize: response.data.itemsPerPage, // Use itemsPerPage from API response
          totalPages: response.data.totalPages,
        }));
      } else {
        dispatch(setError('Failed to fetch payments'));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      dispatch(setError('Failed to fetch payments'));
      toast.error('Failed to fetch payments');
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, currentPage, pageSize, searchTerm, startDate, endDate]);

  useEffect(() => {
    // Don't fetch if we're processing URL parameters to avoid race conditions
    if (!isProcessingUrlParams) {
      const urlStartDate = searchParams.get('startDate');
      const urlEndDate = searchParams.get('endDate');
      
      // Only fetch if there are no URL parameters at all
      if (!urlStartDate && !urlEndDate) {
        fetchPaymentsData();
      }
    }
  }, [fetchPaymentsData, isProcessingUrlParams]); // Removed searchParams to prevent loops

  // Event handlers
  const handleDropdownToggle = useCallback((event?: React.MouseEvent) => {
    if (event) {
      const button = event.currentTarget as HTMLElement;
      setButtonRect(button.getBoundingClientRect());
    }
    setIsDropdownOpen(!isDropdownOpen);
  }, [isDropdownOpen]);

  const toggleColumn = (columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey as keyof typeof prev],
    }));
  };

  const saveColumnPreferences = async (preferences: typeof columnVisibility) => {
    setSavingPreferences(true);
    try {
      await axios.put('/api/user-preferences/columns/payments', {
        columnVisibility: preferences,
      });
      toast.success(t('messages.columnPreferencesSaved'));
    } catch (error) {
      console.error('Failed to save column preferences:', error);
      toast.error(t('messages.columnPreferencesFailed'));
    } finally {
      setSavingPreferences(false);
      setIsDropdownOpen(false);
    }
  };

  const handleRowClick = (paymentId: string) => {
    router.push(`/payments/${paymentId}`);
  };

  // Date filter handlers
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDateFilterApply = () => {
    // Update active filter status
    // setHasActiveFilter(Boolean(dateFrom || dateTo)); // This state is removed
    // Trigger data refetch (handled by useEffect on dateFrom/dateTo change)
  };

  const handleDateFilterClear = () => {
    setStartDate('');
    setEndDate('');
    // setHasActiveFilter(false); // This state is removed
    // setShowDateFilter(false); // This state is removed
  };

  const handleQuickDateRange = (days: number) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    setStartDate(formatDateForInput(startDate));
    setEndDate(formatDateForInput(today));
    // setHasActiveFilter(true); // This state is removed
  };

  // Update active filter status when date values change
  useEffect(() => {
    // setHasActiveFilter(Boolean(dateFrom || dateTo)); // This state is removed
  }, [startDate, endDate]);

  const handleDelete = async (paymentId: string) => {
    if (!confirm(tCommon('deleteConfirm'))) {
      return;
    }

    try {
      await axios.delete(`/api/payments/${paymentId}`);
      toast.success(t('messages.deleteSuccess'));
      fetchPaymentsData();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error(t('messages.deleteFailed'));
    }
  };

  const handleEdit = (paymentId: string) => {
    router.push(`/payments/${paymentId}/edit`);
  };

  // Use server-side pagination data directly
  const startIndex = (currentPage - 1) * pageSize;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-gray-300">{t('subtitle')}</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{t('messages.errorLoading')}: {error}</p>
          <button
            onClick={fetchPaymentsData}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            {t('actions.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-sm sm:text-base text-gray-300">{t('subtitle')}</p>
            {(todayCount > 0 || recentCount > 0) && (
              <div className="flex items-center gap-3 mt-2">
                {todayCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                    {todayCount} {todayCount === 1 ? 'payment' : 'payments'} today
                  </span>
                )}
                {recentCount > 0 && todayCount !== recentCount && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                    {recentCount} this week
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => router.push('/payments/add')}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            {t('addPayment')}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          {/* Search and Controls Row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              {/* Date Filter */}
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateChange}
                label={t('dateFilter')}
                className="w-full sm:w-auto"
              />

              {/* Items Per Page Selector */}
              <div className="relative dropdown-container w-full sm:w-auto">
                <button
                  onClick={handleDropdownToggle}
                  ref={buttonRef}
                  className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors w-full sm:w-auto"
                >
                  <GearIcon className="h-4 w-4" />
                  <span className="text-sm">{t('columns.columns')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Portal-rendered dropdown */}
        {mounted && isDropdownOpen && buttonRect && createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setIsDropdownOpen(false)}
            />
            
            {/* Dropdown */}
            <div 
              className="fixed w-64 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-[9999]"
              style={{
                top: buttonRect.bottom + 2, // Stick close to button bottom
                left: Math.max(8, Math.min(buttonRect.right - 256, window.innerWidth - 256 - 8)), // Right-align but keep within viewport
              }}
            >
              <div className="p-4">
                <h3 className="text-sm font-medium text-white mb-3">
                  {t('columns.showHideColumns')}
                  {savingPreferences && (
                    <span className="ml-2 text-xs text-blue-400">{t('columns.saving')}</span>
                  )}
                </h3>
                
                <div className="space-y-2">
                  {Object.entries(columnVisibility).map(([key, visible]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => toggleColumn(key)}
                        className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="ml-2 text-sm text-gray-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-white/20">
                  <button
                    onClick={() => setIsDropdownOpen(false)}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    onClick={() => saveColumnPreferences(columnVisibility)}
                    disabled={savingPreferences}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {savingPreferences ? t('columns.saving') : tCommon('save')}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 overflow-visible">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                              <p className="text-gray-300 text-sm sm:text-base">{t('table.loadingPayments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="border-b border-white/20">
                    {columnVisibility.id && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.id')}
                      </th>
                    )}
                    {columnVisibility.paymentDate && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.paymentDate')}
                      </th>
                    )}
                    {columnVisibility.customer && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.customer')}
                      </th>
                    )}
                    {columnVisibility.reservation && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.reservation')}
                      </th>
                    )}
                    {columnVisibility.amount && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.amount')}
                      </th>
                    )}
                    {columnVisibility.status && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.status')}
                      </th>
                    )}
                    {columnVisibility.paymentMethod && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.paymentMethod')}
                      </th>
                    )}
                    {columnVisibility.paymentType && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.paymentType')}
                      </th>
                    )}
                    {columnVisibility.reference && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.reference')}
                      </th>
                    )}
                    {columnVisibility.note && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.note')}
                      </th>
                    )}
                    {columnVisibility.attachments && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.attachments')}
                      </th>
                    )}
                    {columnVisibility.createdBy && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.createdBy')}
                      </th>
                    )}
                    {columnVisibility.actions && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {payments?.map((payment: Payment, index: number) => (
                    <tr
                      key={payment._id}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(payment._id)}
                    >
                      {columnVisibility.id && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {startIndex + index + 1}
                        </td>
                      )}
                      {columnVisibility.paymentDate && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {payment.paymentDate ? (()=>{ const s=String(payment.paymentDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })() : '-'}
                        </td>
                      )}
                      {columnVisibility.customer && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : tCommon('notAvailable')}
                        </td>
                      )}
                      {columnVisibility.reservation && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {payment.reservation ? `#${payment.reservation.reservationNumber}` : '-'}
                        </td>
                      )}
                      {columnVisibility.amount && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {payment.amount ? formatCurrency(payment.amount, currencySettings) : '-'}
                        </td>
                      )}
                      {columnVisibility.status && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                          {payment.status ? (
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              payment.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              payment.status === 'Cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              payment.status === 'Refunded' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {payment.status}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      {columnVisibility.paymentMethod && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white capitalize">
                          {payment.paymentMethod || '-'}
                        </td>
                      )}
                      {columnVisibility.paymentType && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white capitalize">
                          {payment.paymentType || '-'}
                        </td>
                      )}
                      {columnVisibility.reference && (
                        <td className="px-3 sm:px-6 py-4 text-sm text-white max-w-xs truncate">
                          {payment.reference || '-'}
                        </td>
                      )}
                      {columnVisibility.note && (
                        <td className="px-3 sm:px-6 py-4 text-sm text-white max-w-xs truncate">
                          {payment.note || '-'}
                        </td>
                      )}
                      {columnVisibility.attachments && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {payment.attachments?.length || 0}
                        </td>
                      )}
                      {columnVisibility.createdBy && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {payment.createdBy?.name || '-'}
                        </td>
                      )}
                      {columnVisibility.actions && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/payments/${payment._id}`);
                              }}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title={t('actions.view')}
                            >
                              <EyeOpenIcon className="h-4 w-4 text-blue-400" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(payment._id);
                              }}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title={t('actions.edit')}
                            >
                              <Pencil1Icon className="h-4 w-4 text-green-400" />
                            </button>
                            <ApprovalHandler
                              actionType="delete"
                              resourceType="payment"
                              resourceId={payment._id}
                              resourceName={`Payment #${payment._id}`}
                              originalData={payment}
                              onDirectAction={async () => {
                                await axios.delete(`/api/payments/${payment._id}`);
                              }}
                              onSuccess={() => {
                                toast.success(t('messages.deleteSuccess'));
                                fetchPaymentsData(); // Refresh the list
                              }}
                            >
                              <button
                                type="button"
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title={t('actions.delete')}
                              >
                                <TrashIcon className="h-4 w-4 text-red-400" />
                              </button>
                            </ApprovalHandler>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {payments?.length === 0 && !loading && (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-400 text-sm sm:text-base">{t('table.noPayments')}</p>
                  {searchTerm && (
                    <p className="text-gray-500 text-xs sm:text-sm mt-2">
                      {t('table.adjustCriteria')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={(page) => dispatch(setCurrentPage(page))}
            onPageSizeChange={(size) => dispatch(setPageSize(size))}
            showPageSizeSelector={true}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
      </div>
    </Layout>
  );
};

// Main page component with Suspense boundary
const PaymentsPage = () => {
  const { t: tCommon } = useTranslation('common');
  
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">{tCommon('loading')}</div>
          </div>
        </div>
      </Layout>
    }>
      <PaymentsContent />
    </Suspense>
  );
};

export default PaymentsPage;