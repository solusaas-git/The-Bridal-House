'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  EyeOpenIcon,
  MagnifyingGlassIcon,
  GearIcon,
} from '@radix-ui/react-icons';
import { RootState } from '@/store/store';
import { setReservations, removeReservation } from '@/store/reducers/reservationSlice';
import { formatCurrency } from '@/utils/currency';
import Pagination from '@/components/ui/Pagination';
import Layout from '@/components/Layout';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useTranslation } from 'react-i18next';

// Component that uses useSearchParams
function ReservationsContent() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservations = useSelector((state: RootState) => state.reservation.reservations);
  const currencySettings = useSelector((state: RootState) => state.settings);
  const { t } = useTranslation('reservations');
  const { t: tCommon } = useTranslation('common');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isProcessingUrlParams, setIsProcessingUrlParams] = useState(false);

  // Date filter state
  const [dateFilters, setDateFilters] = useState({
    dateColumn: 'pickupDate', // Default column to filter
    startDate: '',
    endDate: '',
  });

  // Payment status filter state (multiselect, exclude "Paid" by default)
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(['Not Paid', 'Partially Paid', 'Pending']);
  const [localPaymentStatusFilter, setLocalPaymentStatusFilter] = useState(['Not Paid', 'Partially Paid', 'Pending']);
  const [isPaymentStatusDropdownOpen, setIsPaymentStatusDropdownOpen] = useState(false);
  const paymentStatusDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize filters from URL parameters
  useEffect(() => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    const urlDateColumn = searchParams.get('dateColumn');
    const urlPaymentStatus = searchParams.get('paymentStatus');
    
    if (urlStartDate || urlEndDate || urlDateColumn || urlPaymentStatus) {
      setIsProcessingUrlParams(true);
      setDateFilters({
        dateColumn: urlDateColumn || 'weddingDate', // Default to weddingDate for upcoming payments
        startDate: urlStartDate || '',
        endDate: urlEndDate || '',
      });
      if (urlPaymentStatus) {
        setPaymentStatusFilter(urlPaymentStatus.split(','));
      }
      // Trigger fetch with the new date filters directly
      const fetchWithUrlParams = async () => {
        try {
          setLoading(true);
          const params: any = {
            page: 1, // Reset to first page when filtering from URL
            limit: itemsPerPage,
            search: searchTerm,
          };

          if (urlStartDate) {
            params.startDate = urlStartDate;
          }
          if (urlEndDate) {
            params.endDate = urlEndDate;
          }
          if (urlStartDate || urlEndDate) {
            params.dateColumn = urlDateColumn || 'weddingDate';
          }
          if (urlPaymentStatus) {
            params.paymentStatus = urlPaymentStatus;
          } else {
            // Default behavior: exclude "Paid" status
            params.paymentStatus = 'Not Paid,Partially Paid,Pending';
          }

          const response = await axios.get('/api/reservations', { params });

          if (response.data.success) {
            dispatch(setReservations(response.data.reservations));
            setTotalCount(response.data.pagination?.totalCount || response.data.reservations.length);
            setCurrentPage(1); // Reset to first page
          }
        } catch (error) {
          console.error('Error fetching reservations with URL params:', error);
        } finally {
          setLoading(false);
          setIsProcessingUrlParams(false);
        }
      };
      
      fetchWithUrlParams();
    }
  }, [searchParams, itemsPerPage, searchTerm, dispatch]);


  // Image hover popup state
  const [hoveredImage, setHoveredImage] = useState<{
    src: string;
    alt: string;
    x: number;
    y: number;
  } | null>(null);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    createdAt: true,
    clientName: true,
    weddingDate: true,
    items: true,
    pickupDate: true,
    returnDate: true,
    availabilityDate: false,
    total: true,
    remainingBalance: true,
    type: true,
    status: true,
    paymentStatus: true,
    createdBy: false,
    actions: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load column preferences on component mount
  useEffect(() => {
    const loadColumnPreferences = async () => {
      try {
        const response = await axios.get('/api/user-preferences/columns/reservations');
        if (response.data.success && response.data.columnPreferences) {
          // Merge with default values to ensure all properties are defined
          setColumnVisibility(prevState => ({
            ...prevState,
            ...response.data.columnPreferences
          }));
        }
      } catch (error) {
        console.error('Failed to load column preferences:', error);
        // Keep default values if loading fails
      }
    };

    loadColumnPreferences();
  }, []);

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!dropdownOpen) {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setDropdownOpen(!dropdownOpen);
  };



  // Fetch reservations with useCallback
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      };

      // Add date filters if they are set
      if (dateFilters.startDate) {
        params.startDate = dateFilters.startDate;
      }
      if (dateFilters.endDate) {
        params.endDate = dateFilters.endDate;
      }
      if (dateFilters.startDate || dateFilters.endDate) {
        params.dateColumn = dateFilters.dateColumn;
      }

      // Add payment status filter (default excludes "Paid")
      if (paymentStatusFilter.length > 0) {
        params.paymentStatus = paymentStatusFilter.join(',');
      } else {
        // If no specific status is selected, exclude "Paid" by default
        params.paymentStatus = 'Not Paid,Partially Paid,Pending';
      }



      const response = await axios.get('/api/reservations', { params });

      if (response.data.success) {
        dispatch(setReservations(response.data.reservations));
        setTotalCount(response.data.pagination?.totalCount || response.data.reservations.length);
      } else {
        setError(response.data.message || t('messages.loadFailed'));
        toast.error(response.data.message || t('messages.loadFailed'));
      }
    } catch (error) {
      setError(t('messages.loadFailed'));
      console.error('Error fetching reservations:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`${t('messages.loadFailed')}: ${error.response.data.message || error.message}`);
      } else {
        toast.error(`${t('messages.loadFailed')}: ${t('messages.networkError')}`);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, dateFilters, paymentStatusFilter, dispatch]);

  // Payment status filter handlers
  const handlePaymentStatusApply = () => {
    setPaymentStatusFilter(localPaymentStatusFilter);
    setIsPaymentStatusDropdownOpen(false);
  };

  const handlePaymentStatusCancel = () => {
    setLocalPaymentStatusFilter(paymentStatusFilter);
    setIsPaymentStatusDropdownOpen(false);
  };

  // Close payment status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isPaymentStatusDropdownOpen) return;
      
      const target = event.target as Node;
      const isClickInsideDropdown = paymentStatusDropdownRef.current?.contains(target);
      
      // Check if click is inside the portal dropdown (which is rendered in document.body)
      const dropdownElement = document.querySelector('[data-payment-status-dropdown]');
      const isClickInsidePortal = dropdownElement?.contains(target);
      
      if (!isClickInsideDropdown && !isClickInsidePortal) {
        setLocalPaymentStatusFilter(paymentStatusFilter); // Reset to current applied filters
        setIsPaymentStatusDropdownOpen(false);
      }
    };

    if (isPaymentStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPaymentStatusDropdownOpen, paymentStatusFilter]);

  useEffect(() => {
    // Skip initial fetch if we're processing URL parameters or if URL parameters exist
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    const urlDateColumn = searchParams.get('dateColumn');
    const urlPaymentStatus = searchParams.get('paymentStatus');
    
    if (isProcessingUrlParams) {
      return; // Skip fetch if currently processing URL params
    }
    
    if (urlStartDate || urlEndDate || urlDateColumn || urlPaymentStatus) {
      return; // Skip fetch if URL params exist (they'll be handled by the URL params effect)
    }
    
    fetchReservations();
  }, [fetchReservations, isProcessingUrlParams, searchParams]);

  // Toggle column visibility and save to database
  const toggleColumn = (column: string) => {
    const newVisibility = {
      ...columnVisibility,
      [column]: !columnVisibility[column as keyof typeof columnVisibility],
    };
    
    setColumnVisibility(newVisibility);
    saveColumnPreferences(newVisibility);
  };

  const saveColumnPreferences = async (preferences: typeof columnVisibility) => {
    try {
      setSavingPreferences(true);
      await axios.put('/api/user-preferences/columns/reservations', {
        columnVisibility: preferences,
      });
      toast.success(t('messages.columnPreferencesSaved'));
    } catch (error) {
      console.error('Failed to save column preferences:', error);
      toast.error(t('messages.columnPreferencesFailed'));
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleRowClick = (reservationId: string) => {
    router.push(`/reservations/${reservationId}`);
  };

  const handleDeleteReservation = async (reservationId: string, e?: React.MouseEvent) => {
    // Prevent row click when clicking delete button
    if (e) {
      e.stopPropagation();
    }

    if (!confirm(tCommon('deleteConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        dispatch(removeReservation(reservationId));
        toast.success(t('messages.deleteSuccess'));
        // Refresh the list
        fetchReservations();
      } else {
        toast.error(t('messages.deleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error(t('messages.deleteFailed'));
    }
  };

  // Filter reservations based on search term
  const filteredReservations = reservations.filter((reservation: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reservation.type?.toLowerCase().includes(searchLower) ||
      reservation.status?.toLowerCase().includes(searchLower) ||
      reservation.paymentStatus?.toLowerCase().includes(searchLower) ||
      (reservation.client && (
        `${reservation.client.firstName} ${reservation.client.lastName}`.toLowerCase().includes(searchLower) ||
        reservation.client.email?.toLowerCase().includes(searchLower) ||
        reservation.client.phone?.includes(searchLower)
      )) ||
      reservation.items?.some((item: any) => 
        item.name?.toLowerCase().includes(searchLower)
      )
    );
  });

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return tCommon('notAvailable');
    const d = new Date(dateString);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleImageHover = (e: React.MouseEvent, imageUrl: string, alt: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredImage({
      src: imageUrl,
      alt: alt,
      x: rect.right + 10, // Position to the right of the image
      y: rect.top - 50, // Position slightly above the image
    });
  };

  const handleImageLeave = () => {
    setHoveredImage(null);
  };



  // Helper functions to translate status values
  const getTranslatedStatus = (status: string) => {
    const statusKey = status?.toLowerCase();
    return t(`details.statuses.${statusKey}`) || status;
  };

  const getTranslatedPaymentStatus = (paymentStatus: string) => {
    // Map specific values first
    if (paymentStatus === 'Partially Paid') return t('details.paymentStatuses.partiallyPaid');
    if (paymentStatus === 'Not Paid') return t('details.paymentStatuses.notPaid');
    
    // For other values, clean and map
    const statusKey = paymentStatus?.toLowerCase()
      .replace(/\s+/g, ''); // Remove spaces
    
    return t(`details.paymentStatuses.${statusKey}`) || paymentStatus;
  };

  const getTranslatedType = (type: string) => {
    const typeKey = type?.toLowerCase();
    return t(`details.types.${typeKey}`) || type;
  };

  const formatItemsList = (items: any[]) => {
    if (!items || items.length === 0) {
      return (
        <span className="text-gray-400 text-sm">{t('table.noItems')}</span>
      );
    }

    // Filter items to show only dresses (category: 677ee9fdd52d692ac0ea6339)
    const dressItems = items.filter(item => item.category === '677ee9fdd52d692ac0ea6339');
    
    if (dressItems.length === 0) {
      // If no dresses, show first item of any category
      const mainItem = items[0];
      const imageUrl = mainItem.primaryPhoto ? `/api/uploads/${mainItem.primaryPhoto}` : null;

      return (
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={mainItem.name}
              className="h-10 w-10 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onMouseEnter={(e) => handleImageHover(e, imageUrl, mainItem.name)}
              onMouseLeave={handleImageLeave}
              onError={(e) => {
                // Replace failed image with placeholder div
                const placeholder = document.createElement('div');
                placeholder.className = 'h-10 w-10 rounded-lg bg-gray-600 flex items-center justify-center';
                placeholder.innerHTML = `<span class="text-xs text-gray-400">${t('table.imgPlaceholder')}</span>`;
                (e.target as HTMLImageElement).parentNode?.replaceChild(placeholder, e.target as HTMLImageElement);
              }}
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gray-600 flex items-center justify-center">
              <span className="text-xs text-gray-400">{t('table.imgPlaceholder')}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-white text-sm">
              {mainItem.name}
              {mainItem.size && (
                <span className="text-gray-400 ml-2">({mainItem.size})</span>
              )}
            </span>
            {items.length > 1 && (
              <span className="text-gray-400 text-xs">
+{items.length - 1} {t('table.moreItems')}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Show the first dress as main item
    const mainDress = dressItems[0];
    const imageUrl = mainDress.primaryPhoto ? `/api/uploads/${mainDress.primaryPhoto}` : null;

    return (
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={mainDress.name}
            className="h-10 w-10 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            onMouseEnter={(e) => handleImageHover(e, imageUrl, mainDress.name)}
            onMouseLeave={handleImageLeave}
            onError={(e) => {
              // Replace failed image with placeholder div
              const placeholder = document.createElement('div');
              placeholder.className = 'h-10 w-10 rounded-lg bg-gray-600 flex items-center justify-center';
              placeholder.innerHTML = `<span class="text-xs text-gray-400">${t('table.imgPlaceholder')}</span>`;
              (e.target as HTMLImageElement).parentNode?.replaceChild(placeholder, e.target as HTMLImageElement);
            }}
          />
        ) : (
                      <div className="h-10 w-10 rounded-lg bg-gray-600 flex items-center justify-center">
              <span className="text-xs text-gray-400">{t('table.imgPlaceholder')}</span>
            </div>
        )}
        <div className="flex flex-col">
          <span className="text-white text-sm">
            {mainDress.name}
            {mainDress.size && (
              <span className="text-gray-400 ml-2">({mainDress.size})</span>
            )}
          </span>
          {dressItems.length > 1 && (
            <span className="text-gray-400 text-xs">
+{dressItems.length - 1} {t('table.moreDresses')}
            </span>
          )}
        </div>
      </div>
    );
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Partially Paid': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Pending': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Not Paid': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center text-red-400">
            <p>Error: {error}</p>
            <button 
              onClick={fetchReservations}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
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
          </div>
          <Link
            href="/reservations/add"
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
          {t('addReservation')}
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
            {/* Date Column Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('filters.filterBy')}</label>
              <select
                value={dateFilters.dateColumn}
                onChange={(e) => setDateFilters(prev => ({ ...prev, dateColumn: e.target.value }))}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
              >
                          <option value="pickupDate">{t('filters.dateColumns.pickupDate')}</option>
          <option value="returnDate">{t('filters.dateColumns.returnDate')}</option>
          <option value="weddingDate">{t('filters.dateColumns.weddingDate')}</option>
          <option value="availabilityDate">{t('filters.dateColumns.availabilityDate')}</option>
          <option value="createdAt">{t('filters.dateColumns.createdAt')}</option>
              </select>
            </div>

              {/* Date Range */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            {/* Start Date */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('filters.from')}</label>
              <input
                type="date"
                value={dateFilters.startDate}
                onChange={(e) => setDateFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
              />
            </div>

            {/* End Date */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('filters.to')}</label>
              <input
                type="date"
                value={dateFilters.endDate}
                onChange={(e) => setDateFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
              />
                </div>
            </div>

            {/* Clear Filters */}
            {(dateFilters.startDate || dateFilters.endDate) && (
              <button
                onClick={() => setDateFilters(prev => ({ ...prev, startDate: '', endDate: '' }))}
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/20 rounded-md transition-colors whitespace-nowrap w-full sm:w-auto"
              >
        {t('filters.clearDates')}
              </button>
            )}
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative" ref={paymentStatusDropdownRef}>
                <button
                  onClick={() => {
                    if (!isPaymentStatusDropdownOpen) {
                      setLocalPaymentStatusFilter(paymentStatusFilter);
                    }
                    setIsPaymentStatusDropdownOpen(!isPaymentStatusDropdownOpen);
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none min-w-[140px] flex items-center justify-between"
                >
                  <span>
{paymentStatusFilter.length === 0 
                      ? t('filters.allStatuses') 
                      : paymentStatusFilter.length === 1 
                        ? t(`filters.paymentStatuses.${paymentStatusFilter[0].toLowerCase().replace(' ', '')}`)
                        : `${paymentStatusFilter.length} selected`
                    }
                  </span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isPaymentStatusDropdownOpen && createPortal(
                  <div 
                    data-payment-status-dropdown
                    className="absolute z-[9999] mt-1 bg-gray-800 border border-white/20 rounded-md shadow-lg min-w-[140px] max-w-[200px]"
                    style={{
                      top: paymentStatusDropdownRef.current ? 
                        paymentStatusDropdownRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                      left: paymentStatusDropdownRef.current ? 
                        paymentStatusDropdownRef.current.getBoundingClientRect().left + window.scrollX : 0,
                    }}
                  >
                    {['Not Paid', 'Partially Paid', 'Paid', 'Pending'].map((status) => (
                      <label
                        key={status}
                        className="flex items-center px-3 py-2 hover:bg-white/10 cursor-pointer text-xs sm:text-sm text-white"
                      >
                        <input
                          type="checkbox"
                          checked={localPaymentStatusFilter.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLocalPaymentStatusFilter([...localPaymentStatusFilter, status]);
                            } else {
                              setLocalPaymentStatusFilter(localPaymentStatusFilter.filter(s => s !== status));
                            }
                          }}
                          className="mr-2 rounded"
                        />
{getTranslatedPaymentStatus(status)}
                      </label>
                    ))}
                    
                    {/* Apply/Cancel buttons */}
                    <div className="border-t border-white/20 p-2 flex gap-2">
                      <button
                        onClick={handlePaymentStatusApply}
                        className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                      >
          {t('filters.apply')}
                      </button>
                      <button
                        onClick={handlePaymentStatusCancel}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
                      >
          {t('filters.cancel')}
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
              {paymentStatusFilter.length > 0 && (
                <button
                  onClick={() => setPaymentStatusFilter([])}
                  className="px-2 py-1 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/20 rounded-md transition-colors"
                >
          {t('filters.clear')}
                </button>
              )}
            </div>

            {/* Column Visibility Toggle */}
            <div className="relative dropdown-container w-full sm:w-auto">
              <button
                onClick={handleDropdownToggle}
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors w-full sm:w-auto"
              >
                <GearIcon className="h-4 w-4" />
        {t('columns.columns')}
              </button>
            </div>
          </div>
        </div>

        {/* Portal-rendered dropdown */}
        {mounted && dropdownOpen && createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setDropdownOpen(false)}
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
          {t('columns.showHideColumns')}
                  {savingPreferences && (
                    <span className="ml-2 text-xs text-blue-400">{t('columns.saving')}</span>
                  )}
                </h3>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.id}
                      onChange={() => toggleColumn('id')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">ID</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.createdAt}
                      onChange={() => toggleColumn('createdAt')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Created</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.clientName}
                      onChange={() => toggleColumn('clientName')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Client</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.weddingDate}
                      onChange={() => toggleColumn('weddingDate')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Wedding Date</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.items}
                      onChange={() => toggleColumn('items')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Items</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.pickupDate}
                      onChange={() => toggleColumn('pickupDate')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Pickup Date</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.returnDate}
                      onChange={() => toggleColumn('returnDate')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Return Date</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.availabilityDate}
                      onChange={() => toggleColumn('availabilityDate')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Availability Date</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.total}
                      onChange={() => toggleColumn('total')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Total</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.remainingBalance}
                      onChange={() => toggleColumn('remainingBalance')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Remaining Balance</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.type}
                      onChange={() => toggleColumn('type')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Type</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.status}
                      onChange={() => toggleColumn('status')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Status</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.paymentStatus}
                      onChange={() => toggleColumn('paymentStatus')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Payment</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.createdBy}
                      onChange={() => toggleColumn('createdBy')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Created By</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.actions}
                      onChange={() => toggleColumn('actions')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">Actions</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-white/20">
                  <button
                    onClick={() => setDropdownOpen(false)}
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

        {/* Active Filters Indicator */}
        {(dateFilters.startDate || dateFilters.endDate || paymentStatusFilter.length > 0) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-blue-300">Active filters:</span>
              <div className="flex flex-wrap items-center gap-2">
              {(dateFilters.startDate || dateFilters.endDate) && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs sm:text-sm">
                  {dateFilters.dateColumn.charAt(0).toUpperCase() + dateFilters.dateColumn.slice(1)}: {
                    dateFilters.startDate && dateFilters.endDate 
                      ? `${dateFilters.startDate} to ${dateFilters.endDate}`
                      : dateFilters.startDate 
                        ? `from ${dateFilters.startDate}`
                        : `until ${dateFilters.endDate}`
                  }
                </span>
              )}
              {paymentStatusFilter.length > 0 && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs sm:text-sm">
                  Payment Status: {paymentStatusFilter.join(', ')}
                </span>
              )}
                <span className="text-xs text-blue-400">
                Showing {totalCount} result{totalCount !== 1 ? 's' : ''}
              </span>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300 text-sm sm:text-base">{t('messages.loadingReservations')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {columnVisibility.id && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.id')}
                      </th>
                    )}
                    {columnVisibility.createdAt && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.createdAt')}
                      </th>
                    )}
                                         {columnVisibility.clientName && (
                       <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                         {t('columns.clientName')}
                       </th>
                     )}
                     {columnVisibility.weddingDate && (
                       <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                         {t('columns.weddingDate')}
                       </th>
                     )}
                     {columnVisibility.items && (
                       <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                         {t('columns.items')}
                       </th>
                     )}
                    {columnVisibility.pickupDate && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.pickupDate')}
                      </th>
                    )}
                    {columnVisibility.returnDate && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.returnDate')}
                      </th>
                    )}
                    {columnVisibility.availabilityDate && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.availabilityDate')}
                      </th>
                    )}
                    {columnVisibility.total && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.total')}
                      </th>
                    )}
                    {columnVisibility.remainingBalance && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.remainingBalance')}
                      </th>
                    )}
                    {columnVisibility.type && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.type')}
                      </th>
                    )}
                    {columnVisibility.status && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.status')}
                      </th>
                    )}
                    {columnVisibility.paymentStatus && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('columns.paymentStatus')}
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
                  {reservations?.map((reservation: any, index) => (
                    <tr 
                      key={reservation._id} 
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(reservation._id)}
                    >
                      {columnVisibility.id && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {reservation._id?.slice(-6) || tCommon('notAvailable')}
                        </td>
                      )}
                      {columnVisibility.createdAt && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(reservation.createdAt)}
                        </td>
                      )}
                                             {columnVisibility.clientName && (
                         <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                           {reservation.client ? (
                             <div>
                               <div className="text-sm font-medium text-white">
                                 {reservation.client.firstName} {reservation.client.lastName}
                               </div>
                               <div className="text-sm text-gray-400">{reservation.client.email}</div>
                             </div>
                           ) : (
                             <span className="text-sm text-gray-400">{t('table.noClient')}</span>
                           )}
                         </td>
                       )}
                       {columnVisibility.weddingDate && (
                         <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                           {reservation.client?.weddingDate ? formatDate(reservation.client.weddingDate) : tCommon('notAvailable')}
                         </td>
                       )}
                       {columnVisibility.items && (
                         <td className="px-3 sm:px-6 py-4 text-sm text-gray-300">
                           {formatItemsList(reservation.items)}
                         </td>
                       )}
                      {columnVisibility.pickupDate && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(reservation.pickupDate)}
                        </td>
                      )}
                      {columnVisibility.returnDate && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(reservation.returnDate)}
                        </td>
                      )}
                      {columnVisibility.availabilityDate && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(reservation.availabilityDate)}
                        </td>
                      )}
                      {columnVisibility.total && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {formatCurrency(reservation.total || reservation.totalAmount || 0, currencySettings)}
                        </td>
                      )}
                      {columnVisibility.remainingBalance && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={`${
                            (reservation.remainingBalance || 0) > 0 
                              ? 'text-yellow-400' 
                              : 'text-green-400'
                          }`}>
                            {formatCurrency(reservation.remainingBalance || 0, currencySettings)}
                          </span>
                        </td>
                      )}
                      {columnVisibility.type && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {getTranslatedType(reservation.type)}
                        </td>
                      )}
                      {columnVisibility.status && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(reservation.status)}`}>
                            {getTranslatedStatus(reservation.status)}
                          </span>
                        </td>
                      )}
                      {columnVisibility.paymentStatus && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusBadgeColor(reservation.paymentStatus || 'Pending')}`}>
                            {getTranslatedPaymentStatus(reservation.paymentStatus || 'Pending')}
                          </span>
                        </td>
                      )}
                      {columnVisibility.createdBy && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {reservation.createdBy?.name || tCommon('notAvailable')}
                        </td>
                      )}
                      {columnVisibility.actions && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <Link
                              href={`/reservations/${reservation._id}`}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title={t('actions.view')}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EyeOpenIcon className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/reservations/${reservation._id}/edit`}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title={t('actions.edit')}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil1Icon className="w-4 h-4" />
                            </Link>
                            <ApprovalHandler
                              actionType="delete"
                              resourceType="reservation"
                              resourceId={reservation._id}
                              resourceName={`Reservation #${reservation.reservationNumber || reservation._id}`}
                              originalData={reservation}
                              onDirectAction={async () => {
                                await axios.delete(`/api/reservations/${reservation._id}`);
                              }}
                              onSuccess={() => {
                                toast.success(t('messages.deleteSuccess'));
                                fetchReservations(); // Refresh the list
                              }}
                            >
                              <button
                                type="button"
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title={t('actions.delete')}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </ApprovalHandler>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {reservations?.length === 0 && !loading && (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-400 text-sm sm:text-base">{t('messages.noReservationsFound')}</p>
                  {searchTerm && (
                    <p className="text-gray-500 text-xs sm:text-sm mt-2">
                      {t('messages.adjustSearchCriteria')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image Hover Popup */}
        {mounted && hoveredImage && createPortal(
          <div
            className="fixed z-[10000] pointer-events-none"
            style={{
              left: `${hoveredImage.x}px`,
              top: `${hoveredImage.y}px`,
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl p-2 max-w-xs">
              <img
                src={hoveredImage.src}
                alt={hoveredImage.alt}
                className="w-64 h-64 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmaWxsPSIjNkI3Mjg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD4KPHN2Zz4=';
                }}
              />
              <div className="mt-2 text-center">
                <p className="text-white text-sm font-medium truncate">{hoveredImage.alt}</p>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            totalCount={totalCount}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1); // Reset to first page when page size changes
            }}
            showPageSizeSelector={true}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
      </div>
    </Layout>
  );
}

// Main page component with Suspense boundary
export default function ReservationsPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </Layout>
    }>
      <ReservationsContent />
    </Suspense>
  );
} 