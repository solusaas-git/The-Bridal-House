'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import Pagination from '@/components/ui/Pagination';
import { RootState } from '@/store/store';
import {
  setCosts,
  setCostCategories,
  setLoading,
  setPagination,
  setFilters,
  removeCost
} from '@/store/reducers/costSlice';
import { canCreate, canEdit, canDelete } from '@/utils/permissions';
import { formatCurrency } from '@/utils/currency';
import DateFilter from '@/components/shared/DateFilter';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useTranslation } from 'react-i18next';

// Component that uses useSearchParams
function CostsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { t } = useTranslation('costs');
  const { t: tCommon } = useTranslation('common');
  const { costs, costCategories, loading, pagination, filters } = useSelector(
    (state: RootState) => state.cost
  );
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const currencySettings = useSelector((state: RootState) => state.settings);

  // Local state
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [selectedCategory, setSelectedCategory] = useState(filters.category);
  const [startDate, setStartDate] = useState(filters.startDate);
  const [endDate, setEndDate] = useState(filters.endDate);
  const [isProcessingUrlParams, setIsProcessingUrlParams] = useState(false);

  // Permission checks
  const userCanCreate = canCreate(currentUser, 'costs');
  const userCanEdit = canEdit(currentUser, 'costs');
  const userCanDelete = canDelete(currentUser, 'costs');

  // Read URL parameters on mount
  useEffect(() => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    
    // Check if we have URL parameters to process
    if (urlStartDate || urlEndDate) {
      setIsProcessingUrlParams(true);
    }
    
    let shouldFetch = false;
    let newStartDate = startDate;
    let newEndDate = endDate;
    
    if (urlStartDate && urlStartDate !== startDate) {
      setStartDate(urlStartDate);
      newStartDate = urlStartDate;
      shouldFetch = true;
    }
    if (urlEndDate && urlEndDate !== endDate) {
      setEndDate(urlEndDate);
      newEndDate = urlEndDate;
      shouldFetch = true;
    }
    
    // Trigger fetch immediately if dates were set from URL
    if (shouldFetch) {
      const newFilters = {
        search: searchTerm,
        category: selectedCategory,
        startDate: newStartDate,
        endDate: newEndDate,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      
      dispatch(setFilters(newFilters));
      fetchCosts(newFilters).finally(() => {
        setIsProcessingUrlParams(false); // Clear the flag when done
      });
    } else {
      setIsProcessingUrlParams(false); // Clear the flag if no URL params to process
    }
  }, [searchParams]);

  useEffect(() => {
    // Always fetch cost categories on mount
    fetchCostCategories();
  }, []);

  useEffect(() => {
    // Only fetch costs on mount if we're not processing URL parameters
    if (!isProcessingUrlParams) {
      const urlStartDate = searchParams.get('startDate');
      const urlEndDate = searchParams.get('endDate');
      
      // Only fetch if there are no URL parameters at all
      if (!urlStartDate && !urlEndDate) {
        fetchCosts();
      }
    }
  }, [isProcessingUrlParams]);

  // Handle date filter changes
  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    
    // Apply filters immediately with the new date values
    const newFilters = {
      search: searchTerm,
      category: selectedCategory,
      startDate: newStartDate,
      endDate: newEndDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };
    
    dispatch(setFilters(newFilters));
    fetchCosts(newFilters);
  };

  useEffect(() => {
    // Apply filters when search term or category changes (not dates - they use manual submit)
    // Don't run if we're processing URL parameters to avoid overriding filtered data
    if (!isProcessingUrlParams) {
      const timeoutId = setTimeout(() => {
        handleApplyFilters();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, selectedCategory, isProcessingUrlParams]);

  const fetchCosts = async (customFilters?: Record<string, string>, customPagination?: { page?: number; limit?: number }) => {
    try {
      dispatch(setLoading(true));
      
      const queryParams = new URLSearchParams({
        page: (customPagination?.page ?? pagination.page).toString(),
        limit: (customPagination?.limit ?? pagination.limit).toString(),
        search: customFilters?.search ?? filters.search,
        category: customFilters?.category ?? filters.category,
        startDate: customFilters?.startDate ?? filters.startDate,
        endDate: customFilters?.endDate ?? filters.endDate,
        sortBy: customFilters?.sortBy ?? filters.sortBy,
        sortOrder: customFilters?.sortOrder ?? filters.sortOrder,
      });

      // Remove empty parameters
      Array.from(queryParams.entries()).forEach(([key, value]) => {
        if (!value) queryParams.delete(key);
      });

      const response = await axios.get(`/api/costs?${queryParams}`);
      dispatch(setCosts(response.data.costs));
      dispatch(setPagination(response.data.pagination));
    } catch (error) {
      console.error('Error fetching costs:', error);
              toast.error(t('messages.loadFailed'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchCostCategories = async () => {
    try {
      const response = await axios.get('/api/cost-categories');
      dispatch(setCostCategories(response.data.costCategories));
    } catch (error) {
      console.error('Error fetching cost categories:', error);
    }
  };

  const handleApplyFilters = () => {
    const newFilters = {
      search: searchTerm,
      category: selectedCategory,
      startDate,
      endDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };
    
    dispatch(setFilters(newFilters));
    fetchCosts(newFilters);
  };

  const handlePageChange = (page: number) => {
    dispatch(setPagination({ ...pagination, page }));
    fetchCosts(undefined, { page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    dispatch(setPagination({ ...pagination, limit: pageSize, page: 1 }));
    fetchCosts(undefined, { limit: pageSize, page: 1 });
  };

  const getTotalCosts = () => {
    return costs.reduce((total, cost) => total + cost.amount, 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-sm sm:text-base text-gray-300">{t('subtitle')}</p>
          </div>
          
          {userCanCreate && (
            <button
              onClick={() => router.push('/costs/add')}
              className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" />
              {t('addCost')}
            </button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
              {/* Category Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('search.category')}:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                >
                  <option value="">{t('search.allCategories')}</option>
                  {costCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateChange}
                label={t('search.dateRange')}
                className="w-full sm:w-auto"
              />

              {/* Clear Filters */}
              {(startDate || endDate || selectedCategory) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedCategory('');
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/20 rounded-md transition-colors whitespace-nowrap w-full sm:w-auto"
                >
                  {t('filters.clearFilters')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Indicator */}
        {(startDate || endDate || selectedCategory) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-blue-300">{t('filters.activeFilters')}:</span>
              <div className="flex flex-wrap items-center gap-2">
                {selectedCategory && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs sm:text-sm">
                    {t('search.category')}: {costCategories.find(cat => cat._id === selectedCategory)?.name}
                  </span>
                )}
                {(startDate || endDate) && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs sm:text-sm">
                    {t('search.dateRange')}: {
                      startDate && endDate 
                        ? `${startDate} to ${endDate}`
                        : startDate 
                          ? `from ${startDate}`
                          : `until ${endDate}`
                    }
                  </span>
                )}
                <span className="text-xs text-blue-400">
                  {t('summary.showingCosts', { count: pagination.total, total: pagination.total })} • {t('summary.totalCosts')}: {formatCurrency(getTotalCosts(), currencySettings)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 overflow-visible">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                              <p className="text-gray-300 text-sm sm:text-base">{t('messages.loading')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full min-w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('table.date')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('table.category')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('table.amount')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('table.relatedTo')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('table.notes')}
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {t('table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {costs.map((cost) => (
                      <tr 
                        key={cost._id} 
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => router.push(`/costs/${cost._id}`)}
                      >
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                    {(() => { const d=new Date(cost.date); const dd=String(d.getUTCDate()).padStart(2,'0'); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const yy=d.getUTCFullYear(); return `${dd}/${mm}/${yy}`; })()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-white">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cost.category.color }}
                            />
                            <span>{cost.category.name}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {formatCurrency(cost.amount, currencySettings)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {cost.relatedReservation && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                              {tCommon('reservation')}
                            </span>
                          )}
                          {cost.relatedProduct && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                              {tCommon('product')}
                            </span>
                          )}
                          {!cost.relatedReservation && !cost.relatedProduct && (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-300">
                          <div className="max-w-xs truncate">
                            {cost.notes || '—'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/costs/${cost._id}`);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                              title={t('actions.view')}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            
                            {userCanEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/costs/${cost._id}/edit`);
                                }}
                                className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                                title={t('actions.edit')}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                            
                            {userCanDelete && (
                              <ApprovalHandler
                                actionType="delete"
                                resourceType="cost"
                                resourceId={cost._id}
                                resourceName={`Cost - ${cost.category.name} (${formatCurrency(cost.amount, currencySettings)})`}
                                originalData={cost}
                                onDirectAction={async () => {
                                  await axios.delete(`/api/costs/${cost._id}`);
                                }}
                                onSuccess={() => {
                                  toast.success(t('messages.deleteSuccess'));
                                  dispatch(removeCost(cost._id));
                                  fetchCosts(); // Refresh the list
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  title={t('actions.delete')}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </ApprovalHandler>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {costs.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <DocumentIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-base sm:text-lg mb-2">{t('empty.title')}</p>
                    <p className="text-gray-500 text-xs sm:text-sm">
                      {(startDate || endDate || selectedCategory) 
                        ? t('empty.adjustFilters')
                        : t('empty.description')
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-3 sm:px-6 py-4 bg-white/5 border-t border-white/10">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    pageSize={pagination.limit}
                    totalCount={pagination.total}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                    showPageSizeSelector={true}
                    pageSizeOptions={[10, 25, 50, 100]}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Main page component with Suspense boundary
export default function CostsPage() {
  const { t: tCommon } = useTranslation('common');
  
  return (
    <Suspense fallback={
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">{tCommon('loading')}</div>
          </div>
        </div>
      </Layout>
    }>
      <CostsContent />
    </Suspense>
  );
} 