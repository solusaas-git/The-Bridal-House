'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { subDays, addDays, addWeeks, addMonths, subMonths, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar } from 'lucide-react';
import axios from 'axios';
import { setCustomers } from '@/store/reducers/customerSlice';
import { setItems } from '@/store/reducers/itemSlice';
import { setReservations } from '@/store/reducers/reservationSlice';
import { setPayments } from '@/store/reducers/paymentSlice';
import { setCosts } from '@/store/reducers/costSlice';
import StatsWidget from '@/components/dashboard/StatsWidget';
import PickupsWidget from '@/components/dashboard/PickupsWidget';
import ReturnsWidget from '@/components/dashboard/ReturnsWidget';
import QuickActionsWidget from '@/components/dashboard/QuickActionsWidget';
import SystemHealthWidget from '@/components/dashboard/SystemHealthWidget';
import TopCategoryProductsWidget from '@/components/dashboard/TopCategoryProductsWidget';
import WidgetManager from '@/components/dashboard/WidgetManager';
import { useWidgetVisibility } from '@/hooks/useWidgetVisibility';
import Layout from '@/components/Layout';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
}

interface Item {
  _id: string;
  name: string;
  status: 'Draft' | 'Published';
}

interface Reservation {
  _id: string;
  type: string;
  availabilityDate?: string;
  status: string;
  pickupDate: string;
  returnDate: string;
  total?: number;
  client?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    weddingDate?: string;
  };
  items?: Array<{
    name: string;
    image?: string;
  }>;
}

interface Payment {
  _id: string;
  amount: number;
}

interface Cost {
  _id: string;
  amount: number;
  date: string;
  createdAt?: string;
}

// Helper function to get translated date ranges
const getPredefinedRanges = (t: any): Record<string, DateRange> => ({
  [t('dateRanges.today')]: {
    startDate: (() => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    })(),
    endDate: (() => {
      const date = new Date();
      date.setHours(23, 59, 59, 999);
      return date;
    })(),
  },
  [t('dateRanges.lastWeek')]: {
    startDate: (() => {
      const today = new Date();
      const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }); // Monday start
      lastWeekStart.setHours(0, 0, 0, 0);
      return lastWeekStart;
    })(),
    endDate: (() => {
      const today = new Date();
      const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }); // Sunday end
      lastWeekEnd.setHours(23, 59, 59, 999);
      return lastWeekEnd;
    })(),
  },
  [t('dateRanges.thisWeek')]: {
    startDate: (() => {
      const today = new Date();
      const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
      thisWeekStart.setHours(0, 0, 0, 0);
      return thisWeekStart;
    })(),
    endDate: (() => {
      const today = new Date();
      const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 }); // Sunday end
      endOfCurrentWeek.setHours(23, 59, 59, 999);
      return endOfCurrentWeek;
    })(),
  },
  [t('dateRanges.nextWeek')]: {
    startDate: (() => {
      const today = new Date();
      const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }); // Monday start
      nextWeekStart.setHours(0, 0, 0, 0);
      return nextWeekStart;
    })(),
    endDate: (() => {
      const today = new Date();
      const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }); // Sunday end
      nextWeekEnd.setHours(23, 59, 59, 999);
      return nextWeekEnd;
    })(),
  },
  [t('dateRanges.lastMonth')]: {
    startDate: (() => {
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      lastMonthStart.setHours(0, 0, 0, 0);
      return lastMonthStart;
    })(),
    endDate: (() => {
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
      lastMonthEnd.setHours(23, 59, 59, 999);
      return lastMonthEnd;
    })(),
  },
  [t('dateRanges.thisMonth')]: {
    startDate: (() => {
      const thisMonthStart = startOfMonth(new Date());
      thisMonthStart.setHours(0, 0, 0, 0);
      return thisMonthStart;
    })(),
    endDate: (() => {
      const thisMonthEnd = endOfMonth(new Date());
      thisMonthEnd.setHours(23, 59, 59, 999);
      return thisMonthEnd;
    })(),
  },
  [t('dateRanges.nextMonth')]: {
    startDate: (() => {
      const nextMonthStart = startOfMonth(addMonths(new Date(), 1));
      nextMonthStart.setHours(0, 0, 0, 0);
      return nextMonthStart;
    })(),
    endDate: (() => {
      const nextMonthEnd = endOfMonth(addMonths(new Date(), 1));
      nextMonthEnd.setHours(23, 59, 59, 999);
      return nextMonthEnd;
    })(),
  },
  [t('dateRanges.thisYear')]: {
    startDate: subDays(new Date(), 365),
    endDate: new Date(),
  },
});

// This will be computed inside the component where t is available

const DashboardContent = () => {
  const dispatch = useDispatch();
  const customers = useSelector((state: RootState) => (state.customer as { customers: Customer[] })?.customers || []);
  const items = useSelector((state: RootState) => (state.item as { items: Item[] })?.items || []);
  const reservations = useSelector((state: RootState) => (state.reservation as { reservations: Reservation[] })?.reservations || []);
  const payments = useSelector((state: RootState) => (state.payment as { payments: Payment[] })?.payments || []);
  const costs = useSelector((state: RootState) => (state.cost as { costs: Cost[] })?.costs || []);
  const currencySettings = useSelector((state: RootState) => state.settings);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const router = useRouter();
  const { t, i18n } = useTranslation('dashboard');

  // Check if translations are loaded for this namespace
  const [translationsReady, setTranslationsReady] = useState(false);
  
  useEffect(() => {
    const checkTranslations = () => {
      const hasNamespace = i18n.hasResourceBundle(i18n.language, 'dashboard');
      const testTranslation = t('title');
      const ready = hasNamespace && testTranslation !== 'title'; // If translation works, it shouldn't return the key
      
      setTranslationsReady(ready);
    };
    
    checkTranslations();
    
    // Also check when language changes
    const handleLanguageChange = () => {
      setTimeout(checkTranslations, 100); // Small delay to ensure translations are loaded
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n, t]);

  // Get predefined ranges with translations - only if translations are ready
    const PREDEFINED_RANGES = useMemo(() => {
    return getPredefinedRanges(t);
  }, [t]);

  const PREDEFINED_RANGE_OPTIONS = useMemo(() => {
    return [...Object.keys(PREDEFINED_RANGES), t('dateRanges.custom')];
  }, [PREDEFINED_RANGES, t]);

  const [loading, setLoading] = useState(true);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [customersRes, productsRes, reservationsRes, paymentsRes, costsRes] = await Promise.all([
          axios.get('/api/customers?limit=1000'),
          axios.get('/api/products?limit=1000'),
          axios.get('/api/reservations?limit=1000'),
          axios.get('/api/payments?limit=1000'),
          axios.get('/api/costs?limit=1000'),
        ]);

        // Data fetched successfully - debug logging removed

        // Update Redux store with fetched data
        if (customersRes.data.customers) {
          dispatch(setCustomers(customersRes.data.customers));
        }
        
        if (productsRes.data.products) {
          dispatch(setItems(productsRes.data.products));
        }
        
        if (reservationsRes.data.reservations) {
          dispatch(setReservations(reservationsRes.data.reservations));
        }
        
        if (paymentsRes.data.payments) {
          dispatch(setPayments({
            payments: paymentsRes.data.payments,
            totalCount: paymentsRes.data.totalCount || paymentsRes.data.payments.length,
            currentPage: paymentsRes.data.currentPage || 1,
            pageSize: paymentsRes.data.itemsPerPage || paymentsRes.data.payments.length,
            totalPages: paymentsRes.data.totalPages || 1,
          }));
        }
        
        if (costsRes.data.costs) {
          dispatch(setCosts(costsRes.data.costs));
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dispatch]);

  const [dateRanges, setDateRanges] = useState({
    pickup: {} as DateRange,
    return: {} as DateRange,
  });

  const [activeRange, setActiveRange] = useState({
    pickup: '',
    return: '',
  });

  // Stats date range filter
  const [statsDateRange, setStatsDateRange] = useState({} as DateRange);
  const [activeStatsRange, setActiveStatsRange] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Define widgets - matching original order and structure
  const availableWidgets = useMemo(() => {
    const widgets = [
      { id: 'stats', label: t('widgets.stats.title'), width: 'full' },
      { id: 'pickups', label: t('widgets.pickups.title'), width: 'half' },
      { id: 'returns', label: t('widgets.returns.title'), width: 'half' },
      { id: 'quickActions', label: t('widgets.quickActions.title'), width: 'half' },
      { id: 'systemHealth', label: t('widgets.systemHealth.title'), width: 'half' },
      { id: 'topCategoryProductsRobes', label: t('widgets.topReservedProducts.robesTitle'), width: 'half' },
      { id: 'topCategoryProductsAccessories', label: t('widgets.topReservedProducts.accessoriesTitle'), width: 'half' },
    ];

    // Filter out stats widget for employee role
    if (currentUser?.role === 'employee') {
      return widgets.filter(widget => widget.id !== 'stats');
    }

    return widgets;
  }, [currentUser, t]);

  // Widget state management
  const { visibleWidgets, toggleWidget, loading: widgetLoading } = useWidgetVisibility();

  // Filter data based on stats date range
  const filteredCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    return customers.filter((customer: any) => {
      const customerDate = new Date(customer.createdAt || customer.weddingDate);
      return customerDate >= statsDateRange.startDate && customerDate <= statsDateRange.endDate;
    });
  }, [customers, statsDateRange]);

  const filteredReservations = useMemo(() => {
    if (!reservations || reservations.length === 0) return [];
    return reservations.filter((reservation: any) => {
      const reservationDate = new Date(reservation.createdAt || reservation.pickupDate);
      return reservationDate >= statsDateRange.startDate && reservationDate <= statsDateRange.endDate;
    });
  }, [reservations, statsDateRange]);

  const filteredPayments = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    return payments.filter((payment: any) => {
      // Only use paymentDate, exclude records without proper payment dates
      if (!payment.paymentDate) return false;
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate >= statsDateRange.startDate && paymentDate <= statsDateRange.endDate;
    });
  }, [payments, statsDateRange]);

  const filteredCosts = useMemo(() => {
    if (!costs || costs.length === 0) return [];
    return costs.filter((cost: any) => {
      // Only use cost date, exclude records without proper cost dates
      if (!cost.date) return false;
      const costDate = new Date(cost.date);
      return costDate >= statsDateRange.startDate && costDate <= statsDateRange.endDate;
    });
  }, [costs, statsDateRange]);

  // Initialize default date ranges when translations are available
  useEffect(() => {
    if (Object.keys(PREDEFINED_RANGES).length > 0) {
      const thisWeekKey = t('dateRanges.thisWeek');
      const thisMonthKey = t('dateRanges.thisMonth');
      
      if (PREDEFINED_RANGES[thisWeekKey] && !activeRange.pickup) {
        setDateRanges({
          pickup: PREDEFINED_RANGES[thisWeekKey],
          return: PREDEFINED_RANGES[thisWeekKey],
        });
        setActiveRange({
          pickup: thisWeekKey,
          return: thisWeekKey,
        });
      }
      
      if (PREDEFINED_RANGES[thisMonthKey] && !activeStatsRange) {
        setStatsDateRange(PREDEFINED_RANGES[thisMonthKey]);
        setActiveStatsRange(thisMonthKey);
      }
    }
  }, [PREDEFINED_RANGES, t, activeRange.pickup, activeStatsRange]);

  const widgetOrder = availableWidgets.map(w => w.id);

  const handleDateRangeChange = (widget: 'pickup' | 'return', range: DateRange, label: string) => {
    setDateRanges(prev => ({
      ...prev,
      [widget]: range,
    }));
    setActiveRange(prev => ({
      ...prev,
      [widget]: label,
    }));
  };

  const handleStatsDateRangeChange = (range: DateRange, label: string) => {
    setStatsDateRange(range);
    setActiveStatsRange(label);
    if (label === t('dateRanges.custom')) {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomDateChange = useCallback(() => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      
      if (startDate <= endDate) {
        setStatsDateRange({
          startDate,
          endDate,
        });
        setActiveStatsRange(t('dateRanges.custom'));
      }
    }
  }, [customStartDate, customEndDate]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Set default custom dates to last 30 days when Custom is first selected
  const handleCustomRangeSelect = () => {
    if (!customStartDate || !customEndDate) {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30);
      setCustomStartDate(formatDateForInput(thirtyDaysAgo));
      setCustomEndDate(formatDateForInput(today));
    }
  };

  // Navigation handlers for stats cards
  const handlePaymentsNavigation = (dateRange: { startDate: string; endDate: string }) => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
    router.push(`/payments?${params.toString()}`);
  };

  const handleCostsNavigation = (dateRange: { startDate: string; endDate: string }) => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
    router.push(`/costs?${params.toString()}`);
  };

  const handleUpcomingPaymentsNavigation = (dateRange: { startDate: string; endDate: string }) => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dateColumn: 'weddingDate', // Filter by wedding date for upcoming payments
    });
    router.push(`/reservations?${params.toString()}`);
  };

  // Update custom date range when custom dates change
  useEffect(() => {
    if (activeStatsRange === t('dateRanges.custom')) {
      handleCustomDateChange();
    }
  }, [customStartDate, customEndDate, activeStatsRange, handleCustomDateChange, t]);

  // Render individual widget - matching original structure
  const renderWidget = (widget: { id: string; width: string }) => {
    switch (widget.id) {
      case 'stats':
        // Hide stats widget for employee role
        if (currentUser?.role === 'employee') {
          return null;
        }
        return (
          <StatsWidget
            customers={filteredCustomers}
            items={items}
            reservations={reservations}
            payments={filteredPayments}
            costs={filteredCosts}
            currencySettings={currencySettings || {}}
            onPaymentsClick={handlePaymentsNavigation}
            onCostsClick={handleCostsNavigation}
            onUpcomingPaymentsClick={handleUpcomingPaymentsNavigation}
            dateRange={statsDateRange}
          />
        );
      case 'pickups':
        return (
          <PickupsWidget
            reservations={reservations}
            dateRange={dateRanges.pickup}
            onDateRangeChange={(range, label) => handleDateRangeChange('pickup', range, label)}
            activeRange={activeRange.pickup}
            predefinedRanges={PREDEFINED_RANGES}
          />
        );
      case 'returns':
        return (
          <ReturnsWidget
            reservations={reservations}
            dateRange={dateRanges.return}
            onDateRangeChange={(range, label) => handleDateRangeChange('return', range, label)}
            activeRange={activeRange.return}
            predefinedRanges={PREDEFINED_RANGES}
          />
        );
      case 'quickActions':
        return <QuickActionsWidget />;
      case 'systemHealth':
        return (
          <SystemHealthWidget
            customers={customers}
            items={items}
            reservations={reservations}
            payments={payments}
          />
        );
      case 'topCategoryProductsRobes':
        return (
          <TopCategoryProductsWidget
            products={items as any}
            reservations={reservations as any}
            categoryId={'677ee9fdd52d692ac0ea6339'}
            title={t('widgets.topReservedProducts.robesTitle')}
          />
        );
      case 'topCategoryProductsAccessories':
        return (
          <TopCategoryProductsWidget
            products={items as any}
            reservations={reservations as any}
            categoryId={'677ff05d51a59d2f60f20b2d'}
            title={t('widgets.topReservedProducts.accessoriesTitle')}
          />
        );
      default:
        return null;
    }
  };

  // Widget rendering logic - matching original layout
  const renderWidgets = () => {
    if (widgetLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">{t('loadingWidgets')}</p>
        </div>
      );
    }

    const renderedWidgets: React.ReactNode[] = [];
    let currentRow: Array<{ id: string; label: string; width: string }> = [];

    const renderRow = () => (
      <div
        key={currentRow.map((w) => w.id).join('-')}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
      >
        {currentRow.map((widget) => (
          <div key={widget.id} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    );

    // Process widgets in order
    for (const widgetId of widgetOrder) {
      if (!visibleWidgets.includes(widgetId)) continue;

      const widget = availableWidgets.find((w) => w.id === widgetId);
      if (!widget) continue;

      if (widget.width === 'full') {
        if (currentRow.length > 0) {
          renderedWidgets.push(renderRow());
          currentRow = [];
        }
        renderedWidgets.push(
          <div key={`full-${widget.id}`} className="w-full">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
              {renderWidget(widget)}
            </div>
          </div>
        );
      } else {
        currentRow.push(widget);
        if (currentRow.length === 2) {
          renderedWidgets.push(renderRow());
          currentRow = [];
        }
      }
    }

    // Render any remaining widgets
    if (currentRow.length > 0) {
      renderedWidgets.push(renderRow());
    }

    return renderedWidgets;
  };

  if (loading || !translationsReady) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {translationsReady ? t('title') : 'Dashboard'}
            </h1>
            <p className="text-gray-300">
              {translationsReady ? t('welcome') : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">
            {translationsReady ? t('loadingData') : 'Loading translations...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Widget Manager */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('title')}</h1>
          <p className="text-sm sm:text-base text-gray-300">{t('welcome')}</p>
        </div>
        
        {/* Controls Section */}
        {currentUser?.role !== 'employee' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            {/* Stats Date Range Filter */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('statsPeriod')}
              </label>
              <div className="flex items-center gap-3 w-full">
                <select
                  value={activeStatsRange}
                  onChange={(e) => {
                    if (e.target.value === t('dateRanges.custom')) {
                      handleCustomRangeSelect();
                      setActiveStatsRange(t('dateRanges.custom'));
                      setShowCustomDatePicker(true);
                    } else {
                      const selectedRange = PREDEFINED_RANGES[e.target.value];
                      if (selectedRange) {
                        handleStatsDateRangeChange(selectedRange, e.target.value);
                      }
                    }
                  }}
                  className="w-1/2 h-8 px-3 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer backdrop-blur-lg hover:bg-white/15 transition-all duration-200"
                >
                  {PREDEFINED_RANGE_OPTIONS.map((range) => (
                    <option key={range} value={range} className="bg-gray-800 text-white">
                      {range}
                    </option>
                  ))}
                </select>
                
                <div className="w-1/2">
                  <WidgetManager
                    availableWidgets={availableWidgets}
                    visibleWidgets={visibleWidgets}
                    onToggleWidget={toggleWidget}
                  />
                </div>
              </div>
              
              {/* Custom Date Range Inputs */}
              {showCustomDatePicker && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-8 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-lg hover:bg-white/15 transition-all duration-200 w-32"
                    max={customEndDate || undefined}
                    title="Start Date"
                  />
                  <span className="text-gray-400 text-xs font-medium">{t('to')}</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-8 px-2 py-1 bg-white/10 border border-white/20 rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-lg hover:bg-white/15 transition-all duration-200 w-32"
                    min={customStartDate || undefined}
                    title="End Date"
                  />
                  
                  {(filteredCustomers.length !== customers.length || filteredPayments.length !== payments.length || filteredReservations.length !== reservations.length || filteredCosts.length !== costs.length) && (
                    <div className="flex items-center justify-center h-8 px-2 bg-blue-500/20 border border-blue-500/30 rounded-md">
                      <span className="text-xs font-medium text-blue-300">
                        {t('filtered')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widget Manager for Employees */}
        {currentUser?.role === 'employee' && (
          <div className="flex justify-end">
            <WidgetManager
              availableWidgets={availableWidgets}
              visibleWidgets={visibleWidgets}
              onToggleWidget={toggleWidget}
            />
          </div>
        )}
      </div>

      {/* Widgets */}
      {renderWidgets()}
    </div>
  );
};

export default function DashboardPage() {
  return (
    <Layout>
      <DashboardContent />
    </Layout>
  );
} 