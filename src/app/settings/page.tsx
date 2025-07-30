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
      <div className="space-y-8">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-white/10">
          {canAccessCategories && (
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'categories'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Categories
            </button>
          )}
          {canAccessCostCategories && (
            <button
              onClick={() => setActiveTab('cost-categories')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'cost-categories'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cost Categories
            </button>
          )}
          {canAccessUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Users
            </button>
          )}
          {canAccessCurrency && (
            <button
              onClick={() => setActiveTab('currency')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'currency'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Currency
            </button>
          )}
          {canAccessRoles && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'roles'
                  ? 'text-white border-b-2 border-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Roles
            </button>
          )}
        </div>

        {/* Content */}
        <div>{renderContent()}</div>
      </div>
    </Layout>
  );
};

export default Settings; 