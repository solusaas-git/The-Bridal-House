'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Users, DollarSign, Calendar, Shirt, TrendingUp, TrendingDown, Receipt, Calculator } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

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
  availabilityDate?: string;
  status: string;
  createdAt?: string;
  pickupDate?: string;
  total?: number;
  client?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    weddingDate?: string;
  };
}

interface Payment {
  _id: string;
  amount: number | string; // Allow both number and string types
  paymentMethod?: string;
  paymentType?: string;
  paymentDate?: string; // Primary date field for payments
  createdAt?: string;
  client?: any;
  reservation?: any;
}

interface Cost {
  _id: string;
  amount: number;
  date: string;
  createdAt?: string;
}

interface CurrencySettings {
  settings?: {
    currency?: string;
    currencyCode?: string;
    currencyPosition?: 'before' | 'after';
  };
}

interface StatsWidgetProps {
  customers: Customer[];
  items: Item[];
  reservations: Reservation[];
  payments: Payment[];
  costs: Cost[];
  currencySettings: CurrencySettings;
  onPaymentsClick?: (dateRange: { startDate: string; endDate: string }) => void;
  onCostsClick?: (dateRange: { startDate: string; endDate: string }) => void;
  onUpcomingPaymentsClick?: (dateRange: { startDate: string; endDate: string }) => void;
  dateRange?: { startDate: Date; endDate: Date };
}

const StatsWidget: React.FC<StatsWidgetProps> = ({
  customers,
  items,
  reservations,
  payments,
  costs,
  currencySettings,
  onPaymentsClick,
  onCostsClick,
  onUpcomingPaymentsClick,
  dateRange,
}) => {
  const { t } = useTranslation('dashboard');
  
  // Get complete unfiltered data from Redux store for accurate month-over-month calculations
  const allCustomers = useSelector((state: any) => (state.customer as { customers: Customer[] })?.customers || []);
  const allReservations = useSelector((state: any) => (state.reservation as { reservations: Reservation[] })?.reservations || []);
  const allPayments = useSelector((state: any) => (state.payment as { payments: Payment[] })?.payments || []);
  const allCosts = useSelector((state: any) => (state.cost as { costs: Cost[] })?.costs || []);

  // Get date ranges for current and last month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Helper function to calculate percentage change
  const calculatePercentageChange = (current: number, previous: number): { change: string; trend: 'up' | 'down' } => {
    if (previous === 0) {
      return current > 0 ? { change: '+100%', trend: 'up' } : { change: '0%', trend: 'up' };
    }
    
    const percentage = ((current - previous) / previous) * 100;
    const isPositive = percentage >= 0;
    const formattedPercentage = Math.abs(percentage).toFixed(1);
    
    return {
      change: `${isPositive ? '+' : '-'}${formattedPercentage}%`,
      trend: isPositive ? 'up' : 'down'
    };
  };

  // Filter ALL data for current month (not just filtered props)
  const currentMonthCosts = allCosts?.filter(cost => {
    // Only use cost date, exclude records without proper cost dates
    if (!cost.date) return false;
    const costDate = new Date(cost.date);
    return costDate >= currentMonthStart && costDate <= currentMonthEnd;
  }) || [];

  const currentMonthPayments = allPayments?.filter(payment => {
    // Only use paymentDate, exclude records without proper payment dates
    if (!payment.paymentDate) return false;
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd;
  }) || [];

  const currentMonthReservations = allReservations?.filter(reservation => {
    const reservationDate = new Date(reservation.createdAt || reservation.availabilityDate || reservation.pickupDate || '');
    return reservationDate >= currentMonthStart && reservationDate <= currentMonthEnd;
  }) || [];

  // Filter ALL data for last month (not just filtered props)
  const lastMonthCosts = allCosts?.filter(cost => {
    // Only use cost date, exclude records without proper cost dates
    if (!cost.date) return false;
    const costDate = new Date(cost.date);
    return costDate >= lastMonthStart && costDate <= lastMonthEnd;
  }) || [];

  const lastMonthPayments = allPayments?.filter(payment => {
    // Only use paymentDate, exclude records without proper payment dates
    if (!payment.paymentDate) return false;
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
  }) || [];

  const lastMonthReservations = allReservations?.filter(reservation => {
    const reservationDate = new Date(reservation.createdAt || reservation.availabilityDate || reservation.pickupDate || '');
    return reservationDate >= lastMonthStart && reservationDate <= lastMonthEnd;
  }) || [];

  // Calculate current month totals from ALL data
  const currentTotalCosts = currentMonthCosts.reduce((total, cost) => total + (Number(cost.amount) || 0), 0);
  const currentTotalPayments = currentMonthPayments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  
  // Calculate current month upcoming payments (reservations with wedding dates in current month)
  const currentMonthUpcomingPayments = allReservations?.filter(reservation => {
    if (!reservation.client?.weddingDate) return false;
    const weddingDate = new Date(reservation.client.weddingDate);
    return weddingDate >= currentMonthStart && weddingDate <= currentMonthEnd;
  }).reduce((total, reservation) => {
    const reservationTotal = Number(reservation.total) || 0;
    const reservationPayments = allPayments?.filter(
      (payment) => payment.reservation?._id === reservation._id
    ) || [];
    const totalPaid = reservationPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0), 0
    );
    const remainingBalance = reservationTotal - totalPaid;
    return total + (remainingBalance > 0 ? remainingBalance : 0);
  }, 0) || 0;
  
  const currentMargin = currentTotalPayments - currentTotalCosts;

  // Calculate last month totals from ALL data
  const lastTotalCosts = lastMonthCosts.reduce((total, cost) => total + (Number(cost.amount) || 0), 0);
  const lastTotalPayments = lastMonthPayments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  
  // Calculate last month upcoming payments (reservations with wedding dates in last month)
  const lastMonthUpcomingPayments = allReservations?.filter(reservation => {
    if (!reservation.client?.weddingDate) return false;
    const weddingDate = new Date(reservation.client.weddingDate);
    return weddingDate >= lastMonthStart && weddingDate <= lastMonthEnd;
  }).reduce((total, reservation) => {
    const reservationTotal = Number(reservation.total) || 0;
    const reservationPayments = allPayments?.filter(
      (payment) => payment.reservation?._id === reservation._id
    ) || [];
    const totalPaid = reservationPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0), 0
    );
    const remainingBalance = reservationTotal - totalPaid;
    return total + (remainingBalance > 0 ? remainingBalance : 0);
  }, 0) || 0;
  
  const lastMargin = lastTotalPayments - lastTotalCosts;

  // Calculate percentage changes using complete data
  const costsChange = calculatePercentageChange(currentTotalCosts, lastTotalCosts);
  const paymentsChange = calculatePercentageChange(currentTotalPayments, lastTotalPayments);
  const upcomingPaymentsChange = calculatePercentageChange(currentMonthUpcomingPayments, lastMonthUpcomingPayments);
  const marginChange = calculatePercentageChange(currentMargin, lastMargin);

  // For display, use the filtered data passed from parent (which respects date range filter)
  const upcomingPayments = reservations?.filter((reservation) => {
    // Filter by client's wedding date within the selected date range
    if (!reservation.client?.weddingDate || !dateRange) return false;
    const weddingDate = new Date(reservation.client.weddingDate);
    return weddingDate >= dateRange.startDate && weddingDate <= dateRange.endDate;
  }).map((reservation) => {
    // Calculate remaining balance (total - payments made for this reservation)
    const reservationTotal = Number(reservation.total) || 0;
    const reservationPayments = allPayments?.filter(
      (payment) => payment.reservation?._id === reservation._id
    ) || [];
    const totalPaid = reservationPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0), 0
    );
    const remainingBalance = reservationTotal - totalPaid;
    
    return {
      reservationId: reservation._id,
      clientName: `${reservation.client?.firstName || ''} ${reservation.client?.lastName || ''}`.trim(),
      weddingDate: reservation.client?.weddingDate,
      total: reservationTotal,
      paid: totalPaid,
      remaining: remainingBalance
    };
  }).filter((item) => item.remaining > 0) || []; // Only show reservations with remaining balance
  
  const totalUpcomingPayments = upcomingPayments.reduce(
    (total, item) => total + item.remaining, 0
  );
  
  const totalPayments = payments?.reduce(
    (total, payment) => total + (Number(payment.amount) || 0),
    0
  );

  const totalCosts = costs?.reduce(
    (total, cost) => total + (Number(cost.amount) || 0),
    0
  );

  // Calculate margin (profit = payments - costs)
  const margin = (totalPayments || 0) - (totalCosts || 0);

  const stats = [
    {
      id: 'costs',
      title: t('widgets.stats.totalCosts'),
      value: formatCurrency(totalCosts || 0, currencySettings),
      change: costsChange.change,
      trend: costsChange.trend,
      icon: Receipt,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
    },
    {
      id: 'payments',
      title: t('widgets.stats.totalPayments'),
      value: formatCurrency(totalPayments || 0, currencySettings),
      change: paymentsChange.change,
      trend: paymentsChange.trend,
      icon: DollarSign,
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
    },
    {
      id: 'margin',
      title: t('widgets.stats.margin'),
      value: formatCurrency(margin, currencySettings),
      change: marginChange.change,
      trend: marginChange.trend,
      icon: Calculator,
      iconBg: margin >= 0 ? 'bg-green-500/10' : 'bg-orange-500/10',
      iconColor: margin >= 0 ? 'text-green-400' : 'text-orange-400',
    },
    {
      id: 'upcoming',
      title: t('widgets.stats.upcomingPayments'),
      value: formatCurrency(totalUpcomingPayments || 0, currencySettings),
      change: upcomingPaymentsChange.change,
      trend: upcomingPaymentsChange.trend,
      icon: Calendar,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
  ];

  const handleStatClick = (statId: string) => {
    if (!dateRange) return;
    
    const formatDateForURL = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const dateRangeFormatted = {
      startDate: formatDateForURL(dateRange.startDate),
      endDate: formatDateForURL(dateRange.endDate),
    };

    if (statId === 'payments' && onPaymentsClick) {
      onPaymentsClick(dateRangeFormatted);
    } else if (statId === 'costs' && onCostsClick) {
      onCostsClick(dateRangeFormatted);
    } else if (statId === 'upcoming' && onUpcomingPaymentsClick) {
      onUpcomingPaymentsClick(dateRangeFormatted);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats?.map((stat) => {
        const Icon = stat.icon;
        const isClickable = (stat.id === 'payments' && onPaymentsClick) || 
                           (stat.id === 'costs' && onCostsClick) ||
                           (stat.id === 'upcoming' && onUpcomingPaymentsClick);
        
        return (
          <div
            key={stat.id}
            onClick={() => isClickable ? handleStatClick(stat.id) : undefined}
            className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6 space-y-4 transition-all duration-200 ${
              isClickable 
                ? 'cursor-pointer hover:bg-white/15 hover:border-white/20 hover:scale-105' 
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 ${stat.iconBg} rounded-lg`}>
                <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400">{stat.title}</p>
              <p className="text-2xl font-semibold text-white">
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsWidget; 