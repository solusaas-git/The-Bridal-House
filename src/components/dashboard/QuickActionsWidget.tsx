'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Shirt, Calendar, DollarSign, Loader2 } from 'lucide-react';

const QuickActionsWidget: React.FC = () => {
  const router = useRouter();
  const [navigating, setNavigating] = useState<string | null>(null);

  const handleNavigation = async (path: string, actionName: string) => {
    try {
      setNavigating(actionName);
      router.push(path);
      // Reset after a short delay to show feedback
      setTimeout(() => setNavigating(null), 500);
    } catch (error) {
      console.error('Navigation error:', error);
      setNavigating(null);
    }
  };

  const actions = [
    {
      name: 'Add Customer',
      description: 'Create a new customer profile',
      icon: Users,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      action: () => handleNavigation('/customers/add', 'Add Customer'),
    },
    {
      name: 'Add Product',
      description: 'Add new product to inventory',
      icon: Shirt,
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-400',
      action: () => handleNavigation('/products/add', 'Add Product'),
    },
    {
      name: 'New Reservation',
      description: 'Create a new booking',
      icon: Calendar,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      action: () => handleNavigation('/reservations/add', 'New Reservation'),
    },
    {
      name: 'Record Payment',
      description: 'Add payment record',
      icon: DollarSign,
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-400',
      action: () => handleNavigation('/payments/add', 'Record Payment'),
    },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.name}
              onClick={action.action}
              disabled={navigating === action.name}
              className="flex items-center gap-3 p-3 text-left bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`${action.iconBg} rounded-lg p-2`}>
                <Icon className={`h-4 w-4 ${action.iconColor}`} />
              </div>
              
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {action.name}
                </p>
                <p className="text-xs text-gray-400">
                  {action.description}
                </p>
              </div>
              
              {navigating === action.name ? (
                <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 text-gray-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsWidget; 