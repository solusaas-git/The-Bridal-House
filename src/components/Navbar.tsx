'use client';

import React, { useState } from 'react';
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
  Receipt,
} from 'lucide-react';
import { canViewMenu } from '@/utils/permissions';
import { useApprovalsCount } from '@/hooks/useApprovalsCount';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface NavbarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Navbar = ({ isMobileMenuOpen, setIsMobileMenuOpen }: NavbarProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const { pendingCount } = useApprovalsCount();
  const { t } = useTranslation('navigation');

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



  const handleNavigation = (tabName: string, path: string) => {
    setActiveTab(tabName);
    router.push(path);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const tabs = React.useMemo(() => {
    const allTabs = [
      { name: 'Dashboard', label: t('dashboard'), icon: Home, path: '/dashboard', permission: 'dashboard' },
      { name: 'Customers', label: t('customers'), icon: Users, path: '/customers', permission: 'customers' },
      { name: 'Reservations', label: t('reservations'), icon: Calendar, path: '/reservations', permission: 'reservations' },
      { name: 'Payments', label: t('payments'), icon: DollarSign, path: '/payments', permission: 'payments' },
      { name: 'Products', label: t('products'), icon: Shirt, path: '/products', permission: 'products' },
      { name: 'Costs', label: t('costs'), icon: Receipt, path: '/costs', permission: 'costs' },
      { name: 'Approvals', label: t('approvals'), icon: CheckCircle, path: '/approvals', permission: 'approvals' },
      { name: 'Settings', label: t('settings'), icon: SettingsIcon, path: '/settings', permission: 'settings' },
    ];

    return allTabs.filter(tab => canViewMenu(currentUser, tab.permission));
  }, [currentUser, t]);

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-gray-900 to-gray-800 border-r border-white/10
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64 lg:w-56
        top-0 lg:top-16
      `}>
        <div className="flex flex-col h-full">
        {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 pt-20 lg:pt-6 overflow-y-auto">
          {tabs?.map((tab) => {
            const IconComponent = tab.icon;
            const isApprovals = tab.name === 'Approvals';
            
            return (
              <button
                key={tab.name}
                  onClick={() => handleNavigation(tab.name, tab.path)}
                  className={`group flex w-full items-center rounded-lg px-3 py-3 lg:py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.name
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                  <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {isApprovals && pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px] h-4">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Bottom Section - Language Switcher */}
        <div className="p-4 border-t border-white/10">
          <LanguageSwitcher />
        </div>
        </div>
      </div>
    </>
  );
};

export default Navbar; 