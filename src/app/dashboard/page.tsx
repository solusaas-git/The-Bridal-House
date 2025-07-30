'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { subDays } from 'date-fns';
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
import WidgetManager from '@/components/dashboard/WidgetManager';
import { useWidgetVisibility } from '@/hooks/useWidgetVisibility';
import Layout from '@/components/Layout';

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
  client?: {
    firstName: string;
    lastName: string;
  };
  items?: Array<{
    name: string;
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

const PREDEFINED_RANGES: Record<string, DateRange> = {
  Today: {
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
  'This Week': {
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
  },
  'This Month': {
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  },
  'Last Month': {
    startDate: subDays(new Date(), 60),
    endDate: subDays(new Date(), 30),
  },
  'This Year': {
    startDate: subDays(new Date(), 365),
    endDate: new Date(),
  },
};

const PREDEFINED_RANGE_OPTIONS = [...Object.keys(PREDEFINED_RANGES), 'Custom'];

const DashboardContent = () => {
  const dispatch = useDispatch();
  const customers = useSelector((state: RootState) => (state.customer as { customers: Customer[] })?.customers || []);
  const items = useSelector((state: RootState) => (state.item as { items: Item[] })?.items || []);
  const reservations = useSelector((state: RootState) => (state.reservation as { reservations: Reservation[] })?.reservations || []);
  const payments = useSelector((state: RootState) => (state.payment as { payments: Payment[] })?.payments || []);
  const costs = useSelector((state: RootState) => (state.cost as { costs: Cost[] })?.costs || []);
  const currencySettings = useSelector((state: RootState) => state.settings);

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
    pickup: PREDEFINED_RANGES['This Week'],
    return: PREDEFINED_RANGES['This Week'],
  });

  const [activeRange, setActiveRange] = useState({
    pickup: 'This Week',
    return: 'This Week',
  });

  // Stats date range filter
  const [statsDateRange, setStatsDateRange] = useState(PREDEFINED_RANGES['This Month']);
  const [activeStatsRange, setActiveStatsRange] = useState('This Month');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Define widgets - matching original order and structure
  const availableWidgets = useMemo(() => [
    { id: 'stats', label: 'Statistics', width: 'full' },
    { id: 'pickups', label: 'Upcoming Pickups', width: 'half' },
    { id: 'returns', label: 'Upcoming Returns', width: 'half' },
    { id: 'quickActions', label: 'Quick Actions', width: 'half' },
    { id: 'systemHealth', label: 'System Health', width: 'half' },
  ], []);

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
      const paymentDate = new Date(payment.paymentDate || payment.createdAt);
      return paymentDate >= statsDateRange.startDate && paymentDate <= statsDateRange.endDate;
    });
  }, [payments, statsDateRange]);

  const filteredCosts = useMemo(() => {
    if (!costs || costs.length === 0) return [];
    return costs.filter((cost: any) => {
      const costDate = new Date(cost.createdAt || cost.date);
      return costDate >= statsDateRange.startDate && costDate <= statsDateRange.endDate;
    });
  }, [costs, statsDateRange]);

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
    if (label === 'Custom') {
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
        setActiveStatsRange('Custom');
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

  // Update custom date range when custom dates change
  useEffect(() => {
    if (activeStatsRange === 'Custom') {
      handleCustomDateChange();
    }
  }, [customStartDate, customEndDate, activeStatsRange, handleCustomDateChange]);

  // Render individual widget - matching original structure
  const renderWidget = (widget: { id: string; width: string }) => {
    switch (widget.id) {
      case 'stats':
        return (
          <StatsWidget
            customers={filteredCustomers}
            items={items}
            reservations={filteredReservations}
            payments={filteredPayments}
            costs={filteredCosts}
            currencySettings={currencySettings || {}}
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
          <p className="text-gray-300">Loading widgets...</p>
        </div>
      );
    }

    const renderedWidgets: React.ReactNode[] = [];
    let currentRow: Array<{ id: string; label: string; width: string }> = [];

    const renderRow = () => (
      <div
        key={currentRow.map((w) => w.id).join('-')}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {currentRow.map((widget) => (
          <div key={widget.id} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
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
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-300">Welcome back! Here&apos;s what&apos;s happening today.</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Widget Manager */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-300">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Stats Date Range Filter */}
          <div className="relative">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-300" />
                <span className="text-sm text-gray-300">Stats Period:</span>
                <div className="relative">
                  <select
                    value={activeStatsRange}
                    onChange={(e) => {
                      if (e.target.value === 'Custom') {
                        handleCustomRangeSelect();
                        setActiveStatsRange('Custom');
                        setShowCustomDatePicker(true);
                      } else {
                        const selectedRange = PREDEFINED_RANGES[e.target.value];
                        if (selectedRange) {
                          handleStatsDateRangeChange(selectedRange, e.target.value);
                        }
                      }
                    }}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[120px]"
                  >
                    {PREDEFINED_RANGE_OPTIONS.map((range) => (
                      <option key={range} value={range} className="bg-gray-800 text-white">
                        {range}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Custom Date Range Inputs */}
              {showCustomDatePicker && (
                <div className="flex items-center gap-2 lg:ml-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    max={customEndDate || undefined}
                    title="Start Date"
                  />
                  <span className="text-gray-400 text-xs">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={customStartDate || undefined}
                    title="End Date"
                  />
                </div>
              )}
              
              {(filteredCustomers.length !== customers.length || filteredPayments.length !== payments.length || filteredReservations.length !== reservations.length || filteredCosts.length !== costs.length) && (
                <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded whitespace-nowrap">
                  Filtered
                </span>
              )}
            </div>
          </div>
          
          <WidgetManager
            availableWidgets={availableWidgets}
            visibleWidgets={visibleWidgets}
            onToggleWidget={toggleWidget}
          />
        </div>
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