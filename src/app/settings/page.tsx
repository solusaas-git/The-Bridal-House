'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Layout from '@/components/Layout';
import Categories from '@/components/settings/Categories';
import CostCategories from '@/components/settings/CostCategories';
import Users from '@/components/settings/Users';
import CurrencySettings from '@/components/settings/CurrencySettings';
import Roles from '@/components/settings/Roles';
import { RootState } from '@/store/store';
import { isAdmin } from '@/utils/permissions';

const Settings = () => {
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const [activeTab, setActiveTab] = useState('categories');

  // Check permissions for different settings sections using utility functions
  const userIsAdmin = isAdmin(currentUser);
  const canAccessUsers = true; // Temporarily allow all users
  const canAccessRoles = true; // Temporarily allow all users
  const canAccessCurrency = true; // Temporarily allow all users
  const canAccessCategories = true; // Temporarily allow all users to see categories
  const canAccessCostCategories = true; // Temporarily allow all users

  const renderContent = () => {
    switch (activeTab) {
      case 'categories':
        return canAccessCategories ? (
          <Categories />
        ) : (
          <div className="text-center py-8 text-gray-400">Access denied</div>
        );
      case 'cost-categories':
        return canAccessCostCategories ? (
          <CostCategories />
        ) : (
          <div className="text-center py-8 text-gray-400">Access denied</div>
        );
      case 'users':
        return canAccessUsers ? (
          <Users />
        ) : (
          <div className="text-center py-8 text-gray-400">Access denied</div>
        );
      case 'currency':
        return canAccessCurrency ? (
          <CurrencySettings />
        ) : (
          <div className="text-center py-8 text-gray-400">Access denied</div>
        );
      case 'roles':
        return canAccessRoles ? (
          <Roles />
        ) : (
          <div className="text-center py-8 text-gray-400">Access denied</div>
        );
      default:
        return canAccessCategories ? (
          <Categories />
        ) : (
          <div className="text-center py-8 text-gray-400">Access denied</div>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <h1 className="text-xl sm:text-3xl font-semibold text-white">Settings</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-4 border-b border-white/10 pb-2 sm:pb-4">
          {canAccessCategories && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors rounded-lg sm:rounded-none ${
                activeTab === 'categories'
                  ? 'text-white bg-white/10 sm:bg-transparent border-b-2 border-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Categories
            </button>
          )}
          {canAccessCostCategories && (
            <button
              onClick={() => setActiveTab('cost-categories')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors rounded-lg sm:rounded-none ${
                activeTab === 'cost-categories'
                  ? 'text-white bg-white/10 sm:bg-transparent border-b-2 border-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Cost Categories
            </button>
          )}
          {canAccessUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors rounded-lg sm:rounded-none ${
                activeTab === 'users'
                  ? 'text-white bg-white/10 sm:bg-transparent border-b-2 border-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Users
            </button>
          )}
          {canAccessCurrency && (
            <button
              onClick={() => setActiveTab('currency')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors rounded-lg sm:rounded-none ${
                activeTab === 'currency'
                  ? 'text-white bg-white/10 sm:bg-transparent border-b-2 border-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Currency
            </button>
          )}
          {canAccessRoles && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors rounded-lg sm:rounded-none ${
                activeTab === 'roles'
                  ? 'text-white bg-white/10 sm:bg-transparent border-b-2 border-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Roles
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mt-4 sm:mt-0">{renderContent()}</div>
      </div>
    </Layout>
  );
};

export default Settings; 