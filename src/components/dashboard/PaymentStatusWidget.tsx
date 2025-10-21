import React from 'react';
import { usePaymentsCount } from '@/hooks/usePaymentsCount';
import { DollarSign, TrendingUp, Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaymentStatusWidgetProps {
  className?: string;
}

const PaymentStatusWidget: React.FC<PaymentStatusWidgetProps> = ({ className = '' }) => {
  const { recentCount, todayCount, countLoading } = usePaymentsCount();
  const { t } = useTranslation('dashboard');

  const stats = [
    {
      id: 'today',
      title: t('widgets.paymentStatus.todayPayments'),
      value: todayCount,
      icon: Calendar,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      description: t('widgets.paymentStatus.todayDescription'),
    },
    {
      id: 'recent',
      title: t('widgets.paymentStatus.recentPayments'),
      value: recentCount,
      icon: Clock,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      description: t('widgets.paymentStatus.recentDescription'),
    },
  ];

  if (countLoading) {
    return (
      <div className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {t('widgets.paymentStatus.title')}
          </h3>
          <DollarSign className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-600 rounded w-1/2"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          {t('widgets.paymentStatus.title')}
        </h3>
        <DollarSign className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          
          return (
            <div key={stat.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
              <div className="flex items-center space-x-3">
                <div className={`p-2 ${stat.iconBg} rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{stat.title}</p>
                  <p className="text-xs text-gray-400">{stat.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                {stat.value > 0 && (
                  <div className="flex items-center text-xs text-green-400">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {(todayCount > 0 || recentCount > 0) && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center text-sm text-green-400">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span>
              {todayCount > 0 && recentCount > todayCount 
                ? t('widgets.paymentStatus.activeStatus', { today: todayCount, recent: recentCount })
                : todayCount > 0 
                  ? t('widgets.paymentStatus.todayActive', { count: todayCount })
                  : t('widgets.paymentStatus.recentActive', { count: recentCount })
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentStatusWidget;
