'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Users, DollarSign, Calendar, Shirt, TrendingUp, TrendingDown, Receipt, Calculator } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

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
}

const StatsWidget: React.FC<StatsWidgetProps> = ({
  customers,
  items,
  reservations,
  payments,
  costs,
  currencySettings,
}) => {
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
    const costDate = new Date(cost.createdAt || cost.date);
    return costDate >= currentMonthStart && costDate <= currentMonthEnd;
  }) || [];

  const currentMonthPayments = allPayments?.filter(payment => {
    // Use paymentDate primarily, then fall back to createdAt
    const paymentDate = new Date(payment.paymentDate || payment.createdAt || '');
    return paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd;
  }) || [];

  const currentMonthReservations = allReservations?.filter(reservation => {
    const reservationDate = new Date(reservation.createdAt || reservation.availabilityDate || reservation.pickupDate || '');
    return reservationDate >= currentMonthStart && reservationDate <= currentMonthEnd;
  }) || [];

  // Filter ALL data for last month (not just filtered props)
  const lastMonthCosts = allCosts?.filter(cost => {
    const costDate = new Date(cost.createdAt || cost.date);
    return costDate >= lastMonthStart && costDate <= lastMonthEnd;
  }) || [];

  const lastMonthPayments = allPayments?.filter(payment => {
    // Use paymentDate primarily, then fall back to createdAt
    const paymentDate = new Date(payment.paymentDate || payment.createdAt || '');
    return paymentDate >= lastMonthStart && paymentDate <= lastMonthEnd;
  }) || [];

  const lastMonthReservations = allReservations?.filter(reservation => {
    const reservationDate = new Date(reservation.createdAt || reservation.availabilityDate || reservation.pickupDate || '');
    return reservationDate >= lastMonthStart && reservationDate <= lastMonthEnd;
  }) || [];

  // Calculate current month totals from ALL data
  const currentTotalCosts = currentMonthCosts.reduce((total, cost) => total + (Number(cost.amount) || 0), 0);
  const currentTotalPayments = currentMonthPayments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  const currentActiveReservations = currentMonthReservations.length;
  const currentMargin = currentTotalPayments - currentTotalCosts;

  // Calculate last month totals from ALL data
  const lastTotalCosts = lastMonthCosts.reduce((total, cost) => total + (Number(cost.amount) || 0), 0);
  const lastTotalPayments = lastMonthPayments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  const lastActiveReservations = lastMonthReservations.length;
  const lastMargin = lastTotalPayments - lastTotalCosts;

  // Calculate percentage changes using complete data
  const costsChange = calculatePercentageChange(currentTotalCosts, lastTotalCosts);
  const paymentsChange = calculatePercentageChange(currentTotalPayments, lastTotalPayments);
  const reservationsChange = calculatePercentageChange(currentActiveReservations, lastActiveReservations);
  const marginChange = calculatePercentageChange(currentMargin, lastMargin);

  // For display, use the filtered data passed from parent (which respects date range filter)
  const activeReservations = reservations?.filter(
    (reservation) => new Date(reservation.availabilityDate || '') > new Date()
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
      title: 'Total Costs',
      value: formatCurrency(totalCosts || 0, currencySettings),
      change: costsChange.change,
      trend: costsChange.trend,
      icon: Receipt,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
    },
    {
      title: 'Total Payments',
      value: formatCurrency(totalPayments || 0, currencySettings),
      change: paymentsChange.change,
      trend: paymentsChange.trend,
      icon: DollarSign,
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
    },
    {
      title: 'Margin',
      value: formatCurrency(margin, currencySettings),
      change: marginChange.change,
      trend: marginChange.trend,
      icon: Calculator,
      iconBg: margin >= 0 ? 'bg-green-500/10' : 'bg-orange-500/10',
      iconColor: margin >= 0 ? 'text-green-400' : 'text-orange-400',
    },
    {
      title: 'Active Reservations',
      value: activeReservations?.length || 0,
      change: reservationsChange.change,
      trend: reservationsChange.trend,
      icon: Calendar,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats?.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6 space-y-4"
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
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsWidget; 