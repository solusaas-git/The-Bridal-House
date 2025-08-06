'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cross2Icon, MagnifyingGlassIcon, PlusIcon, CalendarIcon } from '@radix-ui/react-icons';
import { format, addDays, subDays, differenceInDays } from 'date-fns';
import { RootState } from '@/store/store';
import { addReservation, setReservations } from '@/store/reducers/reservationSlice';
import { setItems } from '@/store/reducers/itemSlice';
import { setCustomers } from '@/store/reducers/customerSlice';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency';
import Layout from '@/components/Layout';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

interface FormData {
  type: string;
  clientId: string;
  items: string[];
  weddingDate: string;
  pickupDate: string;
  returnDate: string;
  availabilityDate: string;
  pickupTime: string;
  returnTime: string;
  availabilityTime: string;
  status: string;
  additionalCost: number;
  bufferBefore: number;
  bufferAfter: number;
  availability: number;
  securityDepositAmount: number;
  advanceAmount: number;
  notes: string;
}

export default function AddReservationPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { t } = useTranslation('reservations');
  const { t: tCommon } = useTranslation('common');
  
  const customers = useSelector((state: RootState) => state.customer.customers);
  const products = useSelector((state: RootState) => state.item.items);
  const reservations = useSelector((state: RootState) => state.reservation.reservations);
  const currencySettings = useSelector((state: RootState) => state.settings);

  const [formData, setFormData] = useState<FormData>({
    type: 'Final',
    clientId: '',
    items: [],
    weddingDate: '',
    pickupDate: '',
    returnDate: '',
    availabilityDate: '',
    pickupTime: '09:00',
    returnTime: '18:00',
    availabilityTime: '10:00',
    status: 'Draft',
    additionalCost: 0,
    bufferBefore: 0,
    bufferAfter: 1,
    availability: 2,
    securityDepositAmount: 0,
    advanceAmount: 0,
    notes: '',
  });

  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [customItemsTotal, setCustomItemsTotal] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Client search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Category filter state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');

  const steps = [
            { number: 1, title: t('add.steps.clientSelection') },
        { number: 2, title: t('add.steps.itemsAndDates') },
        { number: 3, title: t('add.steps.financialDetails') },
  ];

  // Fetch initial data
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchReservations();
  }, []);

  // Search customers with debouncing
  const searchCustomers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    // If a customer is selected and search term matches their name, don't search
    if (selectedClient && searchTerm.trim() === `${selectedClient.firstName} ${selectedClient.lastName}`) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await axios.get('/api/customers', {
        params: {
          search: searchTerm,
          limit: 10, // Limit search results for dropdown
        },
      });

      if (response.data.success) {
        setFilteredCustomers(response.data.customers);
        setShowCustomerDropdown(true);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setFilteredCustomers([]);
    } finally {
      setSearchLoading(false);
    }
  }, [selectedClient]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(customerSearch);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [customerSearch, searchCustomers]);

  // Update dates when client is selected
  useEffect(() => {
    if (selectedClient?.weddingDate) {
      const weddingDate = new Date(selectedClient.weddingDate);
      setFormData(prev => ({
        ...prev,
        weddingDate: format(weddingDate, 'yyyy-MM-dd'),
      }));
    }
  }, [selectedClient?.weddingDate]);

  // Update pickup/return/availability dates when wedding date or buffers change
  useEffect(() => {
    if (formData.weddingDate) {
      const weddingDate = new Date(formData.weddingDate);
      const pickupDate = subDays(weddingDate, formData.bufferBefore);
      const returnDate = addDays(weddingDate, formData.bufferAfter);
      const availabilityDate = addDays(weddingDate, formData.availability + formData.bufferAfter);

      setFormData(prev => ({
        ...prev,
        pickupDate: format(pickupDate, 'yyyy-MM-dd'),
        returnDate: format(returnDate, 'yyyy-MM-dd'),
        availabilityDate: format(availabilityDate, 'yyyy-MM-dd'),
      }));
    }
  }, [formData.weddingDate, formData.bufferBefore, formData.bufferAfter, formData.availability]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      if (data.success) {
        dispatch(setCustomers(data.customers));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000'); // Get all products
      const data = await response.json();
      if (data.products) {
        console.log(`📦 Loaded ${data.products.length} products`);
        dispatch(setItems(data.products));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/reservations?limit=1000'); // Get all reservations
      const data = await response.json();
      if (data.success && data.reservations) {
        console.log(`🗓️ Loaded ${data.reservations.length} reservations`);
        dispatch(setReservations(data.reservations));
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  // Check item availability based on wedding date vs availability date of other reservations
  const isItemAvailable = useCallback((product: any) => {
    if (!formData.weddingDate) return true;

    const weddingDate = new Date(formData.weddingDate);
    weddingDate.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

    // Debug: Log the check for problematic items
    if (product.name && product.name.toLowerCase().includes('dress')) {
      console.log(`🔍 Checking availability for: ${product.name} (ID: ${product._id})`);
      console.log(`📅 Wedding date: ${weddingDate.toDateString()}`);
      console.log(`📦 Total reservations: ${reservations?.length || 0}`);
    }

    // Check if item is reserved and conflicts with our wedding date
    const conflicts = reservations?.filter(reservation => {
      // Skip cancelled reservations
      if (reservation.status === 'Cancelled') return false;
      
      // Check if this product is in this reservation
      const hasItem = reservation.items?.some((item: any) => {
        const itemId = typeof item === 'string' ? item : item._id;
        const matches = itemId === product._id;
        
        if (matches && product.name && product.name.toLowerCase().includes('dress')) {
          console.log(`🎯 Found reservation with this item:`, {
            reservationId: reservation._id,
            status: reservation.status,
            availabilityDate: reservation.availabilityDate,
            itemInReservation: item
          });
        }
        
        return matches;
      });
      
      if (!hasItem) return false;
      
      // Check for wedding date conflicts first (same wedding date = conflict regardless of pickup times)
      if (reservation.client && (reservation.client as any).weddingDate) {
        const reservationWeddingDate = new Date((reservation.client as any).weddingDate);
        reservationWeddingDate.setHours(0, 0, 0, 0);
        
        if (weddingDate.getTime() === reservationWeddingDate.getTime()) {
          if (product.name && product.name.toLowerCase().includes('dress')) {
            console.log(`🚨 Wedding date conflict:`, {
              ourWeddingDate: weddingDate.toDateString(),
              existingWeddingDate: reservationWeddingDate.toDateString(),
              conflict: 'Same wedding date - item unavailable'
            });
          }
          return true; // Conflict: same wedding date
        }
      }

      // Check if our wedding date falls within the reservation period (pickup to availability)
      if (reservation.pickupDate && reservation.availabilityDate) {
        const reservationPickupDate = new Date(reservation.pickupDate);
        const reservationAvailabilityDate = new Date(reservation.availabilityDate);
        reservationPickupDate.setHours(0, 0, 0, 0);
        reservationAvailabilityDate.setHours(0, 0, 0, 0);
        
        // Item is NOT available if our wedding date falls within the pickup period (before availability date)
        const isConflict = weddingDate >= reservationPickupDate && weddingDate < reservationAvailabilityDate;
        
        if (product.name && product.name.toLowerCase().includes('dress')) {
          console.log(`📊 Date range comparison:`, {
            ourWeddingDate: weddingDate.toDateString(),
            reservationPickupDate: reservationPickupDate.toDateString(),
            reservationAvailabilityDate: reservationAvailabilityDate.toDateString(),
            isConflict,
            formula: `${reservationPickupDate.toDateString()} <= ${weddingDate.toDateString()} < ${reservationAvailabilityDate.toDateString()} = ${isConflict}`
          });
        }
        
        return isConflict;
      }
      
      // Fallback: if only availability date exists, use old logic
      if (reservation.availabilityDate) {
        const reservationAvailabilityDate = new Date(reservation.availabilityDate);
        reservationAvailabilityDate.setHours(0, 0, 0, 0);
        
        const isConflict = weddingDate <= reservationAvailabilityDate;
        
        if (product.name && product.name.toLowerCase().includes('dress')) {
          console.log(`📊 Availability-only comparison:`, {
            ourWeddingDate: weddingDate.toDateString(),
            reservationAvailabilityDate: reservationAvailabilityDate.toDateString(),
            isConflict,
            formula: `${weddingDate.toDateString()} <= ${reservationAvailabilityDate.toDateString()} = ${isConflict}`
          });
        }
        
        return isConflict;
      }
      
      // If no availability date, assume it conflicts to be safe
      if (product.name && product.name.toLowerCase().includes('dress')) {
        console.log(`⚠️ No availability date found, assuming conflict`);
      }
      return true;
    });

    const isAvailable = conflicts?.length === 0;
    
    if (product.name && product.name.toLowerCase().includes('dress')) {
      console.log(`✅ Final result for ${product.name}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      console.log(`🔄 Conflicts found: ${conflicts?.length || 0}`);
      console.log('---');
    }

    return isAvailable;
  }, [formData.weddingDate, reservations]);

  // Get unique categories from products
  const getCategories = useCallback(() => {
    if (!products) return [];
    
    const categories = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        if (typeof product.category === 'object' && (product.category as any)?.name) {
          categories.add((product.category as any).name);
        } else if (typeof product.category === 'string') {
          categories.add(product.category);
        }
      }
    });
    
    return Array.from(categories).sort();
  }, [products]);

  // Get filtered and available products - show all available items by default
  const getFilteredProducts = useCallback(() => {
    if (!products) return [];
    
    return products.filter(product => {
      // First check availability
      const isAvailable = isItemAvailable(product);
      
      // Then apply category filter
      const matchesCategory = selectedCategoryTab === 'all' || (() => {
        const categoryName = typeof product.category === 'object' && (product.category as any)?.name
          ? (product.category as any).name
          : product.category;
        return categoryName === selectedCategoryTab;
      })();
      
      // Then apply search filter if there's a search term
      const matchesSearch = !itemSearchTerm || 
        product.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        (typeof product.category === 'object' && (product.category as any)?.name
          ? (product.category as any).name.toLowerCase().includes(itemSearchTerm.toLowerCase())
          : product.category?.toString().toLowerCase().includes(itemSearchTerm.toLowerCase()));
      
      return isAvailable && matchesCategory && matchesSearch;
    });
  }, [products, reservations, selectedCategoryTab, itemSearchTerm, isItemAvailable]);

  // Memoized filtered products to prevent unnecessary re-calculations
  const filteredProducts = useMemo(() => getFilteredProducts(), [
    products, 
    reservations, 
    selectedCategoryTab, 
    itemSearchTerm, 
    isItemAvailable
  ]);

  // Memoized financial calculations to prevent recalculation on every render
  const calculateFinancials = useMemo(() => {
    // Only count items from the main category (677ee9fdd52d692ac0ea6339) in totals
    const mainCategoryItems = selectedItems.filter(item => {
      // Handle both populated and non-populated category references
      const categoryId = typeof item.category === 'object' && item.category?._id 
        ? item.category._id 
        : item.category;
      return categoryId === '677ee9fdd52d692ac0ea6339';
    });
    
    const calculatedItemsTotal = mainCategoryItems.reduce(
      (sum, item) => sum + (item.rentalCost || 0),
      0
    );
    
    const itemsTotal = customItemsTotal !== null ? customItemsTotal : calculatedItemsTotal;
    const additionalCost = Number(formData.additionalCost) || 0;
    const subtotal = itemsTotal + additionalCost;
    const securityDeposit = Number(formData.securityDepositAmount) || 0;
    const advance = Number(formData.advanceAmount) || 0;
    const total = subtotal;

    return {
      calculatedItemsTotal,
      itemsTotal,
      additionalCost,
      subtotal,
      securityDeposit,
      advance,
      total,
    };
  }, [selectedItems, customItemsTotal, formData.additionalCost, formData.securityDepositAmount, formData.advanceAmount]);

  const handleItemsTotalChange = (value: string) => {
    const numValue = parseFloat(value);
    setCustomItemsTotal(isNaN(numValue) ? null : numValue);
  };

  const handleSecurityDepositChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      securityDepositAmount: parseFloat(value) || 0
    }));
  };

  const handleAdvanceChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      advanceAmount: parseFloat(value) || 0
    }));
  };

  const handleItemToggle = (product: any) => {
    const isSelected = selectedItems.some(item => item._id === product._id);
    if (isSelected) {
      setSelectedItems(prev => prev.filter(item => item._id !== product._id));
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(id => id !== product._id)
      }));
    } else {
      setSelectedItems(prev => [...prev, product]);
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, product._id]
      }));
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedClient(customer);
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
    setFilteredCustomers([]); // Clear search results
    setFormData(prev => ({ ...prev, clientId: customer._id }));
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    // If clearing the search and we have a selected customer, clear it
    if (value === '' && selectedClient) {
      setSelectedClient(null);
      setFormData(prev => ({ ...prev, clientId: '' }));
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Validation for each step
  const validateStep = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return selectedClient !== null;
      case 2:
        return selectedItems.length > 0 && formData.pickupDate && formData.returnDate;
      case 3:
        return true; // Financial details are optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const financials = calculateFinancials;

    try {
      setLoading(true);
      const diffDays = differenceInDays(new Date(formData.weddingDate), new Date(selectedClient.weddingDate));
      
      const reservationData = {
        client: selectedClient._id,
        type: formData.type,
        status: formData.status,
        paymentStatus: 'Pending',
        pickupDate: `${formData.pickupDate}T${formData.pickupTime}`,
        returnDate: `${formData.returnDate}T${formData.returnTime}`,
        availabilityDate: `${formData.availabilityDate}T${formData.availabilityTime}`,
        items: selectedItems?.map((item) => item._id),
        additionalCost: Number(formData.additionalCost),
        // Store all calculated financial values
        itemsTotal: financials.itemsTotal,
        subtotal: financials.subtotal,
        securityDeposit: financials.securityDeposit,
        securityDepositAmount: formData.securityDepositAmount,
        advance: financials.advance,
        advanceAmount: formData.advanceAmount,
        total: financials.total,
        payments: [], // Will be populated later
        notes: formData.notes,
        bufferAfter: formData.bufferAfter + diffDays,
        bufferBefore: formData.bufferBefore,
        availability: formData.availability,
      };

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });

      const data = await response.json();
      
      if (data.success) {
        dispatch(addReservation(data.reservation));
        toast.success(t('add.messages.createSuccess'));
        router.push('/reservations');
      } else {
        toast.error(data.message || t('add.messages.createError'));
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error(t('add.messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderClientSelection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('edit.clientSection.title')}
        </label>
        <div className="relative customer-search-container">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => handleCustomerSearch(e.target.value)}
            placeholder={selectedClient ? "Customer selected - type to search for another" : t('edit.clientSection.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="px-4 py-3 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-2"></div>
                  Searching...
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full flex items-center px-4 py-3 text-left hover:bg-white/10 transition-colors text-white border-b border-white/10 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      <div className="text-sm text-gray-400">{customer.phone} • {customer.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
          
          {/* Show "No customers found" only when searching with no results and no customer selected */}
          {showCustomerDropdown && !searchLoading && filteredCustomers.length === 0 && customerSearch.length >= 2 && !selectedClient && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50">
              <div className="px-4 py-3 text-center text-gray-400">
                                  No customers found
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedClient && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-white">
              {selectedClient.firstName} {selectedClient.lastName}
            </h3>
            <button
              onClick={() => {
                setSelectedClient(null);
                setCustomerSearch('');
                setFormData(prev => ({ ...prev, clientId: '' }));
              }}
              className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Clear selection"
            >
              <Cross2Icon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">{tCommon('phone')}</label>
              <p className="text-white">{selectedClient.phone}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400">{tCommon('email')}</label>
              <p className="text-white">{selectedClient.email || 'N/A'}</p>
            </div>
            {selectedClient.weddingDate && (
              <div>
                <label className="text-sm text-gray-400">{t('details.clientInfo.weddingDate')}</label>
                <p className="text-white">
                  {format(new Date(selectedClient.weddingDate), 'dd/MM/yyyy')}
                </p>
              </div>
            )}
            {selectedClient.weddingCity && (
              <div>
                <label className="text-sm text-gray-400">{tCommon('city')}</label>
                <p className="text-white">{selectedClient.weddingCity}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {tCommon('type')}
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        >
                          <option value="Final">{t('details.types.final')}</option>
                <option value="Fitting">{t('details.types.fitting')}</option>
        </select>
      </div>
    </div>
  );

  const renderItemSelection = () => (
    <div className="space-y-6">
      {/* Wedding Date and Buffer Info */}
      {selectedClient && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white mb-2">{t('add.dateTimeSection.title')}</h3>
            <p className="text-sm text-gray-400">
              {t('add.dateTimeSection.subtitle')}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('details.clientInfo.weddingDate')}</label>
            <input
              type="date"
              value={formData.weddingDate}
              onChange={(e) =>
                setFormData({ ...formData, weddingDate: e.target.value })
              }
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-400">{t('columns.pickupDate')}</p>
                <p className="text-lg font-medium text-white">
                  {formData.pickupDate
                    ? format(new Date(formData.pickupDate), 'dd/MM/yyyy')
                    : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('columns.pickupDate')} {tCommon('time')} *
                </label>
                <input
                  type="time"
                  value={formData.pickupTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pickupTime: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('edit.datesSection.bufferBefore')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.bufferBefore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bufferBefore: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-400">{t('columns.returnDate')}</p>
                <p className="text-lg font-medium text-white">
                  {formData.returnDate
                    ? format(new Date(formData.returnDate), 'dd/MM/yyyy')
                    : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('columns.returnDate')} {tCommon('time')} *
                </label>
                <input
                  type="time"
                  value={formData.returnTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      returnTime: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('edit.datesSection.bufferAfter')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.bufferAfter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bufferAfter: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-400">{t('columns.availabilityDate')}</p>
                <p className="text-lg font-medium text-white">
                  {formData.availabilityDate
                    ? format(new Date(formData.availabilityDate), 'dd/MM/yyyy')
                    : ''}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('edit.datesSection.availabilityTime')} *
                </label>
                <input
                  type="time"
                  value={formData.availabilityTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      availabilityTime: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  {t('edit.datesSection.availability')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.availability}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      availability: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategoryTab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
                         {tCommon('all')} ({filteredProducts.length})
          </button>
          {getCategories().map((category) => {
            const categoryCount = filteredProducts.filter(p => {
              const categoryName = typeof p.category === 'object' && (p.category as any)?.name
                ? (p.category as any).name
                : p.category;
              return categoryName === category;
            }).length || 0;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategoryTab(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategoryTab === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                {category} ({categoryCount})
              </button>
            );
          })}
        </div>

        {/* Item Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={itemSearchTerm}
            onChange={(e) => setItemSearchTerm(e.target.value)}
            placeholder={`${tCommon('search')} items...`}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Available Items Grid */}
        <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredProducts.map((product: any) => {
            const isSelected = selectedItems.some(item => item._id === product._id);
            return (
              <div
                key={product._id}
                className={`relative rounded-lg border ${
                  isSelected
                    ? 'border-blue-500'
                    : 'border-white/10'
                } overflow-hidden group cursor-pointer`}
                onClick={() => handleItemToggle(product)}
              >
                <div className="aspect-[4/3] relative">
                  {product.primaryPhoto ? (
                    <img
                      src={`/api/uploads/${product.primaryPhoto}`}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9IiMzNzQxNTEiLz4KPHR7d3QgeD0iMTI4IiB5PSIxMjgiIGZpbGw9IiM2QjcyODkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4=';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gray-600 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                                 <div className="p-4">
                   <h3 className="text-white font-medium">
                     {product.name}
                     {product.size && (
                       <span className="text-gray-400 ml-2">({product.size})</span>
                     )}
                   </h3>
                   <p className="text-sm text-gray-400">
                     {typeof product.category === 'object' && (product.category as any)?.name 
                       ? (product.category as any).name 
                       : product.category || tCommon('noCategory')}
                   </p>
                   <p className="text-sm font-medium text-white mt-2">
                     {formatCurrency(product.rentalCost || 0, currencySettings)}
                   </p>
                   {/* Availability status */}
                   <div className="mt-2 text-xs">
                     <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                       {t('details.itemsSection.availableForDates')}
                     </span>
                   </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderFinancialDetails = () => {
    const financials = calculateFinancials;

    return (
      <div className="space-y-6">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Draft">{t('details.statuses.draft')}</option>
            <option value="Confirmed">{t('details.statuses.confirmed')}</option>
            <option value="Cancelled">{t('details.statuses.cancelled')}</option>
          </select>
        </div>

        {/* Additional Costs */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            {t('edit.financialSection.additionalCost')}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {getCurrencySymbol(currencySettings)}
            </span>
            <input
              type="number"
              value={formData.additionalCost}
              onChange={(e) =>
                setFormData({ ...formData, additionalCost: parseFloat(e.target.value) || 0 })
              }
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {tCommon('notes')}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={t('edit.generalSettings.notesPlaceholder')}
          />
        </div>

        {/* Financial Summary */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
                      <h3 className="text-lg font-medium text-white">{t('details.financialSummary.title')}</h3>

          <div className="space-y-4">
            {/* Items Total - Editable */}
            <div className="flex justify-between text-sm items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-300">{t('edit.financialSection.itemsTotal')}</span>
                {financials.calculatedItemsTotal !== financials.itemsTotal && (
                  <span className="text-xs text-blue-400">
                    ({tCommon('calculated')}: {formatCurrency(financials.calculatedItemsTotal, currencySettings)})
                  </span>
                )}
              </div>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {getCurrencySymbol(currencySettings)}
                </span>
                <input
                  type="number"
                  min="0"
                  value={customItemsTotal !== null ? customItemsTotal : financials.calculatedItemsTotal}
                  onChange={(e) => handleItemsTotalChange(e.target.value)}
                  placeholder={formatCurrency(financials.calculatedItemsTotal, currencySettings)}
                  className="w-full pl-8 pr-4 py-2 rounded border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Security Deposit */}
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-300">{t('edit.financialSection.securityDeposit')}</span>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {getCurrencySymbol(currencySettings)}
                </span>
                <input
                  type="number"
                  min="0"
                  value={formData.securityDepositAmount}
                  onChange={(e) => handleSecurityDepositChange(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Advance Amount */}
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-300">{t('details.financialSummary.advance')}</span>
              <div className="relative w-40">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {getCurrencySymbol(currencySettings)}
                </span>
                <input
                  type="number"
                  min="0"
                  value={formData.advanceAmount}
                  onChange={(e) => handleAdvanceChange(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            {/* Additional Costs */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{t('edit.financialSection.additionalCost')}</span>
              <span className="text-white">
                {formatCurrency(financials.additionalCost, currencySettings)}
              </span>
            </div>

            {/* Subtotal */}
            <div className="flex justify-between text-sm font-medium border-t border-white/10 pt-4">
              <span className="text-gray-300">{t('edit.financialSection.subtotal')}</span>
              <span className="text-white">
                {formatCurrency(financials.subtotal, currencySettings)}
              </span>
            </div>

            {/* Total */}
            <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-4">
              <span className="text-white">{tCommon('total')}</span>
              <span className="text-white">
                {formatCurrency(financials.total, currencySettings)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderClientSelection();
      case 2:
        return renderItemSelection();
      case 3:
        return renderFinancialDetails();
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-white">{t('add.title')}</h1>
            <Link
              href="/reservations"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors self-start sm:self-auto"
            >
              <Cross2Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </Link>
          </div>

          {/* Step Indicator */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
              {steps?.map((stepItem, index) => (
                <div
                  key={stepItem.number}
                  className={`flex-1 relative ${
                    index !== steps.length - 1 ? '' : ''
                  }`}
                >
                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium mb-2 transition-colors ${
                        step >= stepItem.number
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {stepItem.number}
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-medium transition-colors text-center ${
                        step >= stepItem.number ? 'text-white' : 'text-gray-400'
                      }`}
                    >
                      {stepItem.title}
                    </span>
                  </div>
                  {index !== steps.length - 1 && (
                    <div
                      className={`absolute top-4 sm:top-5 left-[calc(50%+20px)] sm:left-[calc(50%+24px)] w-[calc(100%-40px)] sm:w-[calc(100%-48px)] h-[2px] ${
                        step > stepItem.number ? 'bg-blue-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 sm:p-8">
            {renderCurrentStep()}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10">
              <button
                onClick={() => setStep(Math.max(1, step - 1))}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto ${
                  step === 1 ? 'invisible' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {t('add.navigation.previous')}
              </button>

              {step === 3 ? (
                <button
                  onClick={handleSubmit}
                  disabled={!validateStep(step) || loading}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto ${
                    validateStep(step) && !loading
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-blue-500/50 cursor-not-allowed'
                  }`}
                >
                  {loading ? t('add.navigation.creating') : t('add.navigation.createReservation')}
                </button>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!validateStep(step)}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-white text-sm font-medium transition-colors w-full sm:w-auto ${
                    validateStep(step)
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-blue-500/50 cursor-not-allowed'
                  }`}
                >
                  {t('add.navigation.next')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 