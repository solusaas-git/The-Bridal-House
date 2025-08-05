'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeOpenIcon,
  Pencil1Icon,
  TrashIcon,
  GearIcon,
} from '@radix-ui/react-icons';
import Layout from '@/components/Layout';
import Pagination from '@/components/ui/Pagination';
import { RootState } from '@/store/store';
import { setCustomers } from '@/store/reducers/customerSlice';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useTranslation } from 'react-i18next';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  idNumber?: string;
  weddingDate?: string;
  weddingTime?: string;
  weddingLocation?: string;
  weddingCity?: string;
  type: 'Client' | 'Provider';
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    name: string;
  };
}

const CustomersPage = () => {
  const router = useRouter();
  const { t } = useTranslation('customers');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Column visibility state - will be loaded from user preferences
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    firstName: true,
    lastName: true,
    address: false,
    idNumber: false,
    phone: true,
    weddingDate: true,
    weddingTime: false,
    weddingLocation: false,
    weddingCity: true,
    type: false,
    createdAt: true,
    updatedAt: false,
    createdBy: false,
    actions: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load column preferences on component mount
  useEffect(() => {
    const loadColumnPreferences = async () => {
      try {
        const response = await axios.get('/api/user-preferences/columns/customers');
        if (response.data.success && response.data.columnPreferences) {
          // Merge with default values to ensure all properties are defined
          setColumnVisibility(prevState => ({
            ...prevState,
            ...response.data.columnPreferences
          }));
        }
      } catch (error) {
        console.error('Failed to load column preferences:', error);
        // Keep default values if loading fails
      }
    };

    loadColumnPreferences();
  }, []);

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!dropdownOpen) {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setDropdownOpen(!dropdownOpen);
  };

  // Fetch customers with useCallback to fix dependency warning
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customers', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
        },
      });

      if (response.data.success) {
        setCustomers(response.data.customers);
        setTotalCount(response.data.totalCount);
      } else {
        toast.error(response.data.message || t('loadFailed'));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`${t('loadFailed')}: ${error.response.data.message || error.message}`);
      } else {
        toast.error(`${t('loadFailed')}: ${t('networkError')}`);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Toggle column visibility and save to database
  const toggleColumn = (column: string) => {
    const newVisibility = {
      ...columnVisibility,
      [column]: !columnVisibility[column as keyof typeof columnVisibility],
    };
    
    setColumnVisibility(newVisibility);
    saveColumnPreferences(newVisibility);
  };

  // Save column preferences to database
  const saveColumnPreferences = async (preferences: Record<string, boolean>) => {
    try {
      setSavingPreferences(true);
      const response = await axios.put('/api/user-preferences/columns/customers', {
        columnVisibility: preferences,
      });
      
      if (response.data.success) {
        toast.success(t('preferencesSaved'));
      }
    } catch (error) {
      console.error('Failed to save column preferences:', error);
      toast.error(t('preferencesFailed'));
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm(t('deleteConfirm'))) {
      try {
        await axios.delete(`/api/customers/${customerId}`);
        toast.success(t('deleteSuccess'));
        fetchCustomers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error(t('deleteFailed'));
      }
    }
  };

  const handleEdit = (customerId: string) => {
    router.push(`/customers/${customerId}/edit`);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

    return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-sm sm:text-base text-gray-300">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => router.push('/customers/add')}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            {t('addCustomer')}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Column Visibility Toggle */}
            <div className="relative dropdown-container w-full sm:w-auto">
              <button
                onClick={handleDropdownToggle}
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors w-full sm:w-auto"
              >
                <GearIcon className="h-4 w-4" />
                <span className="text-sm">{t('columns')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Portal-rendered dropdown */}
        {mounted && dropdownOpen && createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setDropdownOpen(false)}
            />
            
            {/* Dropdown */}
            <div 
              className="fixed w-64 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-[9999]"
              style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`,
              }}
            >
              <div className="p-4">
                <h3 className="text-sm font-medium text-white mb-3">
                  {t('showHideColumns')}
                  {savingPreferences && (
                    <span className="ml-2 text-xs text-blue-400">{t('saving')}</span>
                  )}
                </h3>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.id}
                      onChange={() => toggleColumn('id')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.id')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.firstName}
                      onChange={() => toggleColumn('firstName')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.firstName')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.lastName}
                      onChange={() => toggleColumn('lastName')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.lastName')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.address}
                      onChange={() => toggleColumn('address')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.address')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.idNumber}
                      onChange={() => toggleColumn('idNumber')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.idNumber')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.phone}
                      onChange={() => toggleColumn('phone')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.phone')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.weddingDate}
                      onChange={() => toggleColumn('weddingDate')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.weddingDate')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.weddingTime}
                      onChange={() => toggleColumn('weddingTime')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.weddingTime')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.weddingLocation}
                      onChange={() => toggleColumn('weddingLocation')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.weddingLocation')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.weddingCity}
                      onChange={() => toggleColumn('weddingCity')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.weddingCity')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.type}
                      onChange={() => toggleColumn('type')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.type')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.createdAt}
                      onChange={() => toggleColumn('createdAt')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.createdAt')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.updatedAt}
                      onChange={() => toggleColumn('updatedAt')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.updatedAt')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.createdBy}
                      onChange={() => toggleColumn('createdBy')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.createdBy')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={columnVisibility.actions}
                      onChange={() => toggleColumn('actions')}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300">{t('fields.actions')}</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-white/20">
                  <button
                    onClick={() => setDropdownOpen(false)}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
                  >
{t('common.cancel')}
                  </button>
                  <button
                    onClick={() => saveColumnPreferences(columnVisibility)}
                    disabled={savingPreferences}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                  >
{savingPreferences ? t('saving') : t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300 text-sm sm:text-base">{t('loadingCustomers')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="border-b border-white/20">
                    {columnVisibility.id && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.id')}
                      </th>
                    )}
                    {columnVisibility.firstName && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.firstName')}
                      </th>
                    )}
                    {columnVisibility.lastName && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.lastName')}
                      </th>
                    )}
                    {columnVisibility.address && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.address')}
                      </th>
                    )}
                    {columnVisibility.idNumber && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.idNumber')}
                      </th>
                    )}
                    {columnVisibility.phone && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.phone')}
                      </th>
                    )}
                    {columnVisibility.weddingDate && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.weddingDate')}
                      </th>
                    )}
                    {columnVisibility.weddingTime && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.weddingTime')}
                      </th>
                    )}
                    {columnVisibility.weddingLocation && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.weddingLocation')}
                      </th>
                    )}
                    {columnVisibility.weddingCity && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.weddingCity')}
                      </th>
                    )}
                    {columnVisibility.type && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.type')}
                      </th>
                    )}
                    {columnVisibility.createdAt && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.createdAt')}
                      </th>
                    )}
                    {columnVisibility.updatedAt && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.updatedAt')}
                      </th>
                    )}
                    {columnVisibility.createdBy && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.createdBy')}
                      </th>
                    )}
                    {columnVisibility.actions && (
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
{t('fields.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {customers?.map((customer, index) => (
                    <tr
                      key={customer._id}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(customer._id)}
                    >
                      {columnVisibility.id && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                      )}
                      {columnVisibility.firstName && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {customer.firstName}
                        </td>
                      )}
                      {columnVisibility.lastName && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.lastName}
                        </td>
                      )}
                      {columnVisibility.address && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.address || '-'}
                        </td>
                      )}
                      {columnVisibility.idNumber && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.idNumber || '-'}
                        </td>
                      )}
                      {columnVisibility.phone && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.phone || '-'}
                        </td>
                      )}
                      {columnVisibility.weddingDate && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.weddingDate ? new Date(customer.weddingDate).toLocaleDateString() : '-'}
                        </td>
                      )}
                      {columnVisibility.weddingTime && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.weddingTime || '-'}
                        </td>
                      )}
                      {columnVisibility.weddingLocation && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.weddingLocation || '-'}
                        </td>
                      )}
                      {columnVisibility.weddingCity && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.weddingCity || '-'}
                        </td>
                      )}
                      {columnVisibility.type && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {customer.type || '-'}
                        </td>
                      )}
                      {columnVisibility.createdAt && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>
                      )}
                      {columnVisibility.updatedAt && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(customer.updatedAt).toLocaleDateString()}
                        </td>
                      )}
                      {columnVisibility.createdBy && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          {typeof customer.createdBy === 'string' ? customer.createdBy : (customer.createdBy?.name || '-')}
                        </td>
                      )}
                      {columnVisibility.actions && (
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/customers/${customer._id}`);
                              }}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title={t('actions.view')}
                            >
                              <EyeOpenIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(customer._id);
                              }}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title={t('actions.edit')}
                            >
                              <Pencil1Icon className="h-4 w-4" />
                            </button>
                                                         <ApprovalHandler
                               actionType="delete"
                               resourceType="customer"
                               resourceId={customer._id}
                               resourceName={`${customer.firstName} ${customer.lastName}`}
                               originalData={customer}
                               onDirectAction={async () => {
                                 await axios.delete(`/api/customers/${customer._id}`);
                               }}
                               onSuccess={() => {
                                 toast.success(t('deleteSuccess'));
                                 fetchCustomers(); // Refresh the list
                               }}
                             >
                               <button
                                 type="button"
                                 className="text-red-400 hover:text-red-300 transition-colors"
                                 title={t('actions.delete')}
                               >
                                 <TrashIcon className="h-4 w-4" />
                               </button>
                             </ApprovalHandler>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {customers?.length === 0 && !loading && (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-400 text-sm sm:text-base">{t('noCustomersFound')}</p>
                  {searchTerm && (
                    <p className="text-gray-500 text-xs sm:text-sm mt-2">
                      {t('adjustSearchCriteria')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            totalCount={totalCount}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(1); // Reset to first page when page size changes
            }}
            showPageSizeSelector={true}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
      </div>
    </Layout>
  );
};

export default CustomersPage; 