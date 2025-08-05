'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  EyeOpenIcon,
  GridIcon,
  RowsIcon,
  MagnifyingGlassIcon,
  GearIcon,
} from '@radix-ui/react-icons';
import { RootState } from '@/store/store';
import { setItems, removeItem } from '@/store/reducers/itemSlice';
import { setCategories } from '@/store/reducers/categorySlice';
import { formatCurrency } from '@/utils/currency';
import Pagination from '@/components/ui/Pagination';
import Layout from '@/components/Layout';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useTranslation } from 'react-i18next';

export default function ProductsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const items = useSelector((state: RootState) => state.item.items);
  const categories = useSelector((state: RootState) => state.category.categories);
  const currencySettings = useSelector((state: RootState) => state.settings);
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    category: 'all',
    subCategory: 'all',
  });

  // Subcategories state
  const [subCategories, setSubCategories] = useState<any[]>([]);

  // Column visibility state for table view
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    name: true,
    category: true,
    subCategory: true,
    rentalCost: true,
    buyCost: true,
    sellPrice: true,
    size: true,
    quantity: true,
    status: true,
    createdAt: false,
    updatedAt: false,
    createdBy: false,
    actions: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/categories');
      if (response.data && response.data.length > 0) {
        dispatch(setCategories(response.data));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [dispatch]);

  // Fetch subcategories for selected category
  const fetchSubCategories = useCallback(async (categoryId: string) => {
    try {
      const response = await axios.get(`/api/categories/${categoryId}/subcategories`);
      if (response.data && response.data.length > 0) {
        setSubCategories(response.data);
      } else {
        setSubCategories([]);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubCategories([]);
    }
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((categoryId: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category: categoryId,
      subCategory: 'all' // Reset subcategory when category changes
    }));
    
    // Fetch subcategories if a specific category is selected
    if (categoryId !== 'all') {
      fetchSubCategories(categoryId);
    } else {
      setSubCategories([]);
    }
  }, [fetchSubCategories]);

  // Load data on component mount
  useEffect(() => {
    const loadColumnPreferences = async () => {
      try {
        const response = await axios.get('/api/user-preferences/columns/products');
        if (response.data.success && response.data.columnPreferences) {
          // Merge with default values to ensure all properties are defined
          setColumnVisibility(prevState => ({
            ...prevState,
            ...response.data.columnPreferences
          }));
        }
      } catch (error) {
        console.error('Failed to load column preferences:', error);
      }
    };

    loadColumnPreferences();
    fetchCategories();
  }, [fetchCategories]);

  // Fetch products with useCallback
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      };

      if (filters.category !== 'all') {
        params.category = filters.category;
      }
          if (filters.subCategory !== 'all') {
      params.subCategory = filters.subCategory;
    }

      const response = await axios.get('/api/products', { params });

      if (response.data.products) {
        dispatch(setItems(response.data.products));
        setTotalCount(response.data.pagination?.total || response.data.products.length);
      } else {
        setError(t('messages.loadFailed'));
        toast.error(t('messages.loadFailed'));
      }
    } catch (error) {
      setError(t('messages.loadFailed'));
      console.error('Error fetching products:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`${t('messages.loadFailed')}: ${error.response.data.message || error.message}`);
      } else {
        toast.error(`${t('messages.loadFailed')}: ${t('messages.networkError')}`);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, filters, dispatch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/products/${productId}`);
      
      if (response.status === 200) {
        dispatch(removeItem(productId));
        toast.success('Product deleted successfully');
        // Refresh the list
        fetchProducts();
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const toggleColumn = (column: string) => {
    const newVisibility = {
      ...columnVisibility,
      [column]: !columnVisibility[column as keyof typeof columnVisibility],
    };
    setColumnVisibility(newVisibility);
    saveColumnPreferences(newVisibility);
  };

  const saveColumnPreferences = async (preferences: typeof columnVisibility) => {
    try {
      setSavingPreferences(true);
      await axios.put('/api/user-preferences/columns/products', {
        columnVisibility: preferences,
      });
      toast.success('Column preferences saved');
    } catch (error) {
      console.error('Failed to save column preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Use items directly since API already handles filtering
  const filteredItems = items;

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    return `/api/uploads/${imagePath}`;
  };

  if (loading && !mounted) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">{t('table.loadingProducts')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchProducts}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
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
            <p className="text-sm sm:text-base text-gray-300">Manage your product inventory</p>
          </div>
          <Link
            href="/products/add"
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors w-full sm:w-auto"
          >
            <PlusIcon className="h-4 w-4" />
            {t('addProduct')}
          </Link>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
            {/* Category Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('filters.category')}:</label>
              <select
                value={filters.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
              >
                <option value="all">All Categories</option>
                {categories.map((category: any) => (
                  <option key={category._id} value={category._id} className="bg-gray-800">
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Filter - Only show when category is selected */}
            {filters.category !== 'all' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">{t('filters.subCategory')}:</label>
                <select
                  value={filters.subCategory}
                  onChange={(e) => setFilters(prev => ({ ...prev, subCategory: e.target.value }))}
                    className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                >
                  <option value="all">All Subcategories</option>
                  {subCategories.map((subcat) => (
                    <option key={subcat._id} value={subcat._id}>
                      {subcat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-md p-1 w-full sm:w-auto">
              <button
                onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors flex-1 sm:flex-none ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <GridIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                  className={`p-2 rounded transition-colors flex-1 sm:flex-none ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <RowsIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Items Per Page */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-300 whitespace-nowrap">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                  className="px-2 sm:px-3 py-1 sm:py-2 bg-white/10 border border-white/20 rounded-md text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
              >
                <option value="12" className="bg-gray-800">12</option>
                <option value="24" className="bg-gray-800">24</option>
                <option value="48" className="bg-gray-800">48</option>
                <option value="96" className="bg-gray-800">96</option>
              </select>
            </div>

            {/* Column Visibility Toggle (only for table view) */}
            {viewMode === 'table' && (
                <div className="relative w-full sm:w-auto">
                <button
                  onClick={handleDropdownToggle}
                    className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors w-full sm:w-auto"
                >
                  <GearIcon className="h-4 w-4" />
                    <span className="text-sm">Columns</span>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Products Content */}
        {viewMode === 'grid' ? (
          // Grid View
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">{t('table.noProducts')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredItems.map((item: any) => (
                  <div key={item._id} className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden hover:bg-white/10 transition-colors">
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-800">
                      {item.primaryPhoto ? (
                        <img
                          src={getImageUrl(item.primaryPhoto)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-500">No Image</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-medium text-white text-sm mb-2 truncate">{item.name}</h3>
                      <p className="text-xs text-gray-400 mb-2">
                        {item.category?.name || t('productInfo.noCategory')}
                        {item.subCategory && ` - ${item.subCategory}`}
                      </p>
                      
                      {/* Pricing Info */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{t('productInfo.rentalPerDay')}:</span>
                          <span className="text-sm font-medium text-green-400">
                            {formatCurrency(item.rentalCost, currencySettings)}
                          </span>
                        </div>
                        {Number(item.buyCost) > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{t('productInfo.buyCost')}:</span>
                            <span className="text-xs text-gray-300">
                              {formatCurrency(item.buyCost, currencySettings)}
                            </span>
                          </div>
                        )}
                        {Number(item.sellPrice) > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{t('productInfo.sellPrice')}:</span>
                            <span className="text-xs text-gray-300">
                              {formatCurrency(item.sellPrice, currencySettings)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {Number(item.size) > 0 && (
                            <span className="text-xs text-gray-400">
                              {t('productInfo.size')}: <span className="text-white">{item.size}</span>
                            </span>
                          )}
                          {Number(item.quantity) > 0 && (
                            <span className="text-xs text-gray-400">
                              {t('productInfo.stock')}: <span className="text-white">{item.quantity}</span>
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.status === 'Published'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/products/${item._id}`)}
                          className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white text-xs rounded transition-colors"
                        >
                          <EyeOpenIcon className="h-3 w-3 mx-auto" />
                        </button>
                        <button
                          onClick={() => router.push(`/products/${item._id}/edit`)}
                          className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white text-xs rounded transition-colors"
                        >
                          <Pencil1Icon className="h-3 w-3 mx-auto" />
                        </button>
                        <ApprovalHandler
                          actionType="delete"
                          resourceType="item"
                          resourceId={item._id}
                          resourceName={item.name}
                          originalData={item}
                          onDirectAction={async () => {
                            await axios.delete(`/api/products/${item._id}`);
                          }}
                          onSuccess={() => {
                            toast.success('Product deleted successfully');
                            fetchProducts(); // Refresh the list
                          }}
                        >
                          <button
                            className="flex-1 px-3 py-1.5 bg-white/5 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs rounded transition-colors"
                          >
                            <TrashIcon className="h-3 w-3 mx-auto" />
                          </button>
                        </ApprovalHandler>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Table View
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
            {loading ? (
              <div className="p-4 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm sm:text-base">{t('table.loadingProducts')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      {columnVisibility.id && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          ID
                        </th>
                      )}
                      {columnVisibility.name && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.name')}
                        </th>
                      )}
                      {columnVisibility.category && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.category')}
                        </th>
                      )}
                      {columnVisibility.subCategory && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.subCategory')}
                        </th>
                      )}
                      {columnVisibility.rentalCost && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.rentalCost')}/Day
                        </th>
                      )}
                      {columnVisibility.buyCost && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.buyCost')}
                        </th>
                      )}
                      {columnVisibility.sellPrice && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.sellPrice')}
                        </th>
                      )}
                      {columnVisibility.size && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.size')}
                        </th>
                      )}
                      {columnVisibility.quantity && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          In Stock
                        </th>
                      )}
                      {columnVisibility.status && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.status')}
                        </th>
                      )}
                      {columnVisibility.createdAt && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.createdAt')}
                        </th>
                      )}
                      {columnVisibility.actions && (
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          {t('columns.actions')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredItems.map((item: any) => (
                      <tr key={item._id} className="hover:bg-white/5">
                        {columnVisibility.id && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item._id.slice(-6)}
                          </td>
                        )}
                        {columnVisibility.name && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {item.primaryPhoto && (
                                <img
                                  src={getImageUrl(item.primaryPhoto)}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-lg object-cover mr-3"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                  }}
                                />
                              )}
                              <div>
                                <div className="text-sm font-medium text-white">{item.name}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        {columnVisibility.category && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.category?.name || tCommon('notAvailable')}
                          </td>
                        )}
                        {columnVisibility.subCategory && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.subCategory || tCommon('notAvailable')}
                          </td>
                        )}
                        {columnVisibility.rentalCost && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatCurrency(item.rentalCost, currencySettings)}
                          </td>
                        )}
                        {columnVisibility.buyCost && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.buyCost ? formatCurrency(item.buyCost, currencySettings) : tCommon('notAvailable')}
                          </td>
                        )}
                        {columnVisibility.sellPrice && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.sellPrice ? formatCurrency(item.sellPrice, currencySettings) : tCommon('notAvailable')}
                          </td>
                        )}
                        {columnVisibility.size && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.size || tCommon('notAvailable')}
                          </td>
                        )}
                        {columnVisibility.quantity && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {item.quantity}
                          </td>
                        )}
                        {columnVisibility.status && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              item.status === 'Published'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        )}
                        {columnVisibility.createdAt && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatDate(item.createdAt)}
                          </td>
                        )}
                        {columnVisibility.actions && (
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/products/${item._id}`)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <EyeOpenIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => router.push(`/products/${item._id}/edit`)}
                                className="text-yellow-400 hover:text-yellow-300"
                              >
                                <Pencil1Icon className="h-4 w-4" />
                              </button>
                              <ApprovalHandler
                                actionType="delete"
                                resourceType="item"
                                resourceId={item._id}
                                resourceName={item.name}
                                originalData={item}
                                onDirectAction={async () => {
                                  await axios.delete(`/api/products/${item._id}`);
                                }}
                                onSuccess={() => {
                                  toast.success('Product deleted successfully');
                                  fetchProducts(); // Refresh the list
                                }}
                              >
                                <button
                                  className="text-red-400 hover:text-red-300"
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
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={itemsPerPage}
            totalCount={totalCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
          />
        )}

        {/* Column visibility dropdown for table view */}
        {viewMode === 'table' && dropdownOpen && mounted && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-20 right-6 bg-gray-800 border border-white/10 rounded-lg shadow-xl p-4 min-w-48">
              <h3 className="text-sm font-medium text-white mb-3">
                Toggle Columns
                {savingPreferences && (
                  <span className="ml-2 text-xs text-blue-400">Saving...</span>
                )}
              </h3>
              
              <div className="space-y-2">
                {Object.entries(columnVisibility).map(([key, visible]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => toggleColumn(key)}
                      className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-gray-300 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 