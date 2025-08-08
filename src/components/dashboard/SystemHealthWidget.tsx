'use client';

import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Customer {
  _id: string;
  email?: string;
  phone: string;
}

interface Item {
  _id: string;
  status: 'Draft' | 'Published';
}

interface Reservation {
  _id: string;
  status: string;
}

interface Payment {
  _id: string;
  amount: number;
}

interface SystemHealthWidgetProps {
  customers: Customer[];
  items: Item[];
  reservations: Reservation[];
  payments: Payment[];
}

const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  customers,
  items,
  reservations,
}) => {
  const { t } = useTranslation('dashboard');
  
  // Calculate system health metrics
  const draftItems = items?.filter(item => item.status === 'Draft').length || 0;
  const pendingReservations = reservations?.filter(
    reservation => reservation.status === 'Draft'
  ).length || 0;
  const incompleteCustomers = customers?.filter(
    customer => !customer.email || !customer.phone
  ).length || 0;

  const healthChecks = [
    {
      label: 'Database Connection',
      status: 'healthy',
      description: 'All connections active',
      icon: CheckCircle,
      color: 'text-green-400',
    },
    {
      label: 'Draft Items',
      status: draftItems > 5 ? 'warning' : 'healthy',
      description: `${draftItems} items need publishing`,
      icon: draftItems > 5 ? AlertTriangle : CheckCircle,
      color: draftItems > 5 ? 'text-yellow-400' : 'text-green-400',
    },
    {
      label: 'Pending Reservations',
      status: pendingReservations > 3 ? 'warning' : 'healthy',
      description: `${pendingReservations} reservations pending`,
      icon: pendingReservations > 3 ? AlertTriangle : CheckCircle,
      color: pendingReservations > 3 ? 'text-yellow-400' : 'text-green-400',
    },
    {
      label: 'Customer Data',
      status: incompleteCustomers > 0 ? 'warning' : 'healthy',
      description: `${incompleteCustomers} incomplete profiles`,
      icon: incompleteCustomers > 0 ? AlertTriangle : CheckCircle,
      color: incompleteCustomers > 0 ? 'text-yellow-400' : 'text-green-400',
    },
  ];

  const overallHealth = healthChecks.every(check => check.status === 'healthy') 
    ? 'healthy' 
    : 'needs-attention';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{t('widgets.systemHealth.title')}</h3>
        
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
          overallHealth === 'healthy' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            overallHealth === 'healthy' ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
          {overallHealth === 'healthy' ? 'All Good' : 'Needs Attention'}
        </div>
      </div>

      <div className="space-y-3">
        {healthChecks.map((check, index) => {
          const Icon = check.icon;
          
          return (
            <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <Icon className={`h-5 w-5 ${check.color}`} />
              
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {check.label}
                </p>
                <p className="text-xs text-gray-400">
                  {check.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/20">
        <p className="text-xs text-gray-400 text-center">
          Last updated: {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
        </p>
      </div>
    </div>
  );
};

export default SystemHealthWidget; 