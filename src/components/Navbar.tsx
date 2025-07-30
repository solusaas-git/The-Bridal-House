'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { clearAuth } from '@/store/reducers/authSlice';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  Shirt,
  Settings as SettingsIcon,
  CheckCircle,
  LogOut,
  Receipt,
} from 'lucide-react';
import { canViewMenu } from '@/utils/permissions';
import { useApprovalsCount } from '@/hooks/useApprovalsCount';

const Navbar = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const { pendingCount } = useApprovalsCount();

  const [activeTab, setActiveTab] = React.useState(() => {
    if (pathname.includes('/customers')) return 'Customers';
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/payments')) return 'Payments';
    if (pathname.includes('/products')) return 'Products';
    if (pathname.includes('/reservations')) return 'Reservations';
    if (pathname.includes('/costs')) return 'Costs';
    if (pathname.includes('/approvals')) return 'Approvals';
    if (pathname.includes('/settings')) return 'Settings';
    return 'Dashboard';
  });

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      localStorage.removeItem('isAuthenticated');
      dispatch(clearAuth());
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('isAuthenticated');
      dispatch(clearAuth());
      router.push('/login');
    }
  };

  const tabs = React.useMemo(() => {
    const allTabs = [
      { name: 'Dashboard', icon: Home, path: '/dashboard', permission: 'dashboard' },
      { name: 'Customers', icon: Users, path: '/customers', permission: 'customers' },
      { name: 'Reservations', icon: Calendar, path: '/reservations', permission: 'reservations' },
      { name: 'Payments', icon: DollarSign, path: '/payments', permission: 'payments' },
      { name: 'Products', icon: Shirt, path: '/products', permission: 'products' },
      { name: 'Costs', icon: Receipt, path: '/costs', permission: 'costs' },
      { name: 'Approvals', icon: CheckCircle, path: '/approvals', permission: 'approvals' },
      { name: 'Settings', icon: SettingsIcon, path: '/settings', permission: 'settings' },
    ];

    return allTabs.filter(tab => canViewMenu(currentUser, tab.permission));
  }, [currentUser]);

  return (
    <div className="fixed inset-y-0 left-0 w-56 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-white/10">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center px-4 py-3 border-b border-white/10">
          <img
            src="/TBH white.png"
            alt="TBH Logo"
            className="h-12 w-auto"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {tabs?.map((tab) => {
            const IconComponent = tab.icon;
            const isApprovals = tab.name === 'Approvals';
            
            return (
              <button
                key={tab.name}
                onClick={() => {
                  setActiveTab(tab.name);
                  router.push(tab.path);
                }}
                className={`group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.name
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <IconComponent className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">{tab.name}</span>
                {isApprovals && pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px] h-4">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-md cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar; 