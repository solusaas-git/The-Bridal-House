'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

const PaymentsPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

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
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  
  // Date filter state
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasActiveFilter, setHasActiveFilter] = useState(false);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    customer: true,
    reservation: true,
    amount: true,
    paymentDate: true,
    paymentMethod: true,
    paymentType: true,
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
        const response = await axios.get('/api/user-preferences/columns/payments');
        if (response.data.success) {
          setColumnVisibility(response.data.columnPreferences);
        }
      } catch (error) {
        console.error('Failed to load column preferences:', error);
        // Use default preferences if loading fails
      }
    };
    loadColumnPreferences();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
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
  }, [dispatch, currentPage, pageSize, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  // Event handlers
  const handleDropdownToggle = useCallback((event?: React.MouseEvent) => {
    if (event) {
      const button = event.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right + window.scrollX,
      });
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
      toast.success('Column preferences saved successfully');
    } catch (error) {
      console.error('Failed to save column preferences:', error);
      toast.error('Failed to save column preferences');
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
    setHasActiveFilter(Boolean(dateFrom || dateTo));
    // Trigger data refetch (handled by useEffect on dateFrom/dateTo change)
  };

  const handleDateFilterClear = () => {
    setDateFrom('');
    setDateTo('');
    setHasActiveFilter(false);
    setShowDateFilter(false);
  };

  const handleQuickDateRange = (days: number) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    setDateFrom(formatDateForInput(startDate));
    setDateTo(formatDateForInput(today));
    setHasActiveFilter(true);
  };

  // Update active filter status when date values change
  useEffect(() => {
    setHasActiveFilter(Boolean(dateFrom || dateTo));
  }, [dateFrom, dateTo]);

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) {
      return;
    }

    try {
      await axios.delete(`/api/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      fetchPaymentsData();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment');
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
            <h1 className="text-2xl font-bold text-white">Payments</h1>
            <p className="text-gray-300">Manage customer payments and transactions</p>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">Error loading payments: {error}</p>
          <button
            onClick={fetchPaymentsData}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
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
            <h1 className="text-xl sm:text-2xl font-bold text-white">Payments</h1>
            <p className="text-sm sm:text-base text-gray-300">Manage customer payments and transactions</p>
          </div>
          <button
            onClick={() => router.push('/payments/add')}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            Add Payment
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
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              {/* Date Filter - Compact Style */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs sm:text-sm text-gray-300">Date:</span>
                  <select
                    value={hasActiveFilter ? 'Custom' : 'All Time'}
                    onChange={(e) => {
                      if (e.target.value === 'Custom') {
                        setShowDateFilter(true);
                        if (!dateFrom && !dateTo) {
                          handleQuickDateRange(30); // Default to last 30 days
                        }
                      } else if (e.target.value === 'All Time') {
                        handleDateFilterClear();
                      } else {
                        // Handle predefined ranges
                        const days = parseInt(e.target.value);
                        handleQuickDateRange(days);
                      }
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[100px] sm:min-w-[120px]"
                  >
                    <option value="All Time" className="bg-gray-800 text-white">All Time</option>
                    <option value="7" className="bg-gray-800 text-white">Last 7 days</option>
                    <option value="30" className="bg-gray-800 text-white">Last 30 days</option>
                    <option value="90" className="bg-gray-800 text-white">Last 90 days</option>
                    <option value="365" className="bg-gray-800 text-white">Last year</option>
                    <option value="Custom" className="bg-gray-800 text-white">Custom</option>
                  </select>
                </div>
                
                {/* Custom Date Range Inputs */}
                {showDateFilter && hasActiveFilter && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      max={dateTo || undefined}
                      title="Start Date"
                    />
                    <span className="text-gray-400 text-xs">to</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={dateFrom || undefined}
                      title="End Date"
                    />
                  </div>
                )}
                
                {/* Active Filter Indicator */}
                {hasActiveFilter && (
                  <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded whitespace-nowrap">
                    Filtered
                  </span>
                )}
              </div>

              {/* Column Toggle */}
              <div className="relative dropdown-container w-full sm:w-auto">
                <button
                  onClick={handleDropdownToggle}
                  className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors w-full sm:w-auto"
                >
                  <GearIcon className="h-4 w-4" />
                  <span className="text-sm">Columns</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Portal-rendered dropdown */}
        {mounted && isDropdownOpen && createPortal(
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
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
              }}
            >
              <div className="p-4">
                <h3 className="text-sm font-medium text-white mb-3">
                  Show/Hide Columns
                  {savingPreferences && (
                    <span className="ml-2 text-xs text-blue-400">Saving...</span>
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
                    Cancel
                  </button>
                  <button
                    onClick={() => saveColumnPreferences(columnVisibility)}
                    disabled={savingPreferences}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {savingPreferences ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300 text-sm sm:text-base">Loading payments...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="border-b border-white/20">
                    {columnVisibility.id && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Id
                      </th>
                    )}
                    {columnVisibility.customer && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                    )}
                    {columnVisibility.reservation && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Reservation
                      </th>
                    )}
                    {columnVisibility.amount && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                    )}
                    {columnVisibility.paymentDate && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Payment Date
                      </th>
                    )}
                    {columnVisibility.paymentMethod && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Payment Method
                      </th>
                    )}
                    {columnVisibility.paymentType && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Payment Type
                      </th>
                    )}
                    {columnVisibility.reference && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Reference
                      </th>
                    )}
                    {columnVisibility.note && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Note
                      </th>
                    )}
                    {columnVisibility.attachments && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Attachments
                      </th>
                    )}
                    {columnVisibility.createdBy && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Created By
                      </th>
                    )}
                    {columnVisibility.actions && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
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
                      {columnVisibility.customer && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : 'N/A'}
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
                      {columnVisibility.paymentDate && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd/MM/yyyy') : '-'}
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
                              title="View"
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
                              title="Edit"
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
                                toast.success('Payment deleted successfully');
                                fetchPaymentsData(); // Refresh the list
                              }}
                            >
                              <button
                                type="button"
                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                title="Delete"
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
                  <p className="text-gray-400 text-sm sm:text-base">No payments found</p>
                  {searchTerm && (
                    <p className="text-gray-500 text-xs sm:text-sm mt-2">
                      Try adjusting your search criteria
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

export default PaymentsPage;