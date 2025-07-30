'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Cross2Icon, MagnifyingGlassIcon, PlusIcon, CheckIcon } from '@radix-ui/react-icons';
import { format, addDays, subDays, differenceInDays } from 'date-fns';
import axios from 'axios';
import { RootState } from '@/store/store';
import { updateReservation, setReservations } from '@/store/reducers/reservationSlice';
import { setCustomers } from '@/store/reducers/customerSlice';
import { setItems } from '@/store/reducers/itemSlice';
import { formatCurrency, getCurrencySymbol } from '@/utils/currency';
import Layout from '@/components/Layout';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { toast } from 'react-toastify';

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

export default function EditReservationPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useParams();
  const reservationId = params.id as string;
  
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

  const [reservation, setReservation] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');
  const [customItemsTotal, setCustomItemsTotal] = useState<number | null>(null);
  
  // Image popup state
  const [imagePopup, setImagePopup] = useState<{
    show: boolean;
    src: string;
    alt: string;
    x: number;
    y: number;
  }>({
    show: false,
    src: '',
    alt: '',
    x: 0,
    y: 0,
  });

  const steps = [
    { number: 1, title: 'Client Selection' },
    { number: 2, title: 'Items & Dates' },
    { number: 3, title: 'Financial Details' },
  ];

  // Fetch reservation data and load initial data
  useEffect(() => {
    fetchReservation();
    fetchProducts();
    fetchCustomers();
    fetchReservations();
  }, [reservationId]);

  // Update dates when client or buffers change
  useEffect(() => {
    if (selectedClient?.weddingDate && !formData.weddingDate) {
      const weddingDate = new Date(selectedClient.weddingDate);
      const pickupDate = subDays(weddingDate, formData.bufferBefore);
      const returnDate = addDays(weddingDate, formData.bufferAfter);
      const availabilityDate = addDays(weddingDate, formData.availability + formData.bufferAfter);

      setFormData(prev => ({
        ...prev,
        weddingDate: format(weddingDate, 'yyyy-MM-dd'),
        pickupDate: format(pickupDate, 'yyyy-MM-dd'),
        returnDate: format(returnDate, 'yyyy-MM-dd'),
        availabilityDate: format(availabilityDate, 'yyyy-MM-dd'),
      }));
    }
  }, [selectedClient?.weddingDate, formData.bufferBefore, formData.bufferAfter, formData.availability]);

  const fetchReservation = async () => {
    try {
      setFetchLoading(true);
      const response = await fetch(`/api/reservations/${reservationId}`);
      const data = await response.json();
      
      if (data.success) {
        const reservationData = data.reservation;
        setReservation(reservationData);
        
        // Set client
        if (reservationData.client) {
          setSelectedClient(reservationData.client);
          setClientSearchTerm(`${reservationData.client.firstName} ${reservationData.client.lastName}`);
        }
        
        // Set items
        if (reservationData.items) {
          setSelectedItems(reservationData.items);
        }
        
        // Set form data
        setFormData({
          type: reservationData.type || 'Final',
          clientId: reservationData.client?._id || '',
          items: reservationData.items?.map((item: any) => item._id) || [],
          weddingDate: reservationData.client?.weddingDate ? format(new Date(reservationData.client.weddingDate), 'yyyy-MM-dd') : '',
          pickupDate: reservationData.pickupDate ? format(new Date(reservationData.pickupDate), 'yyyy-MM-dd') : '',
          returnDate: reservationData.returnDate ? format(new Date(reservationData.returnDate), 'yyyy-MM-dd') : '',
          availabilityDate: reservationData.availabilityDate ? format(new Date(reservationData.availabilityDate), 'yyyy-MM-dd') : '',
          pickupTime: reservationData.pickupDate ? format(new Date(reservationData.pickupDate), 'HH:mm') : '09:00',
          returnTime: reservationData.returnDate ? format(new Date(reservationData.returnDate), 'HH:mm') : '18:00',
          availabilityTime: reservationData.availabilityDate ? format(new Date(reservationData.availabilityDate), 'HH:mm') : '10:00',
          status: reservationData.status || 'Draft',
          additionalCost: reservationData.additionalCost || 0,
          bufferBefore: reservationData.bufferBefore || 0,
          bufferAfter: reservationData.bufferAfter || 1,
          availability: reservationData.availability || 2,
          securityDepositAmount: reservationData.securityDepositAmount || 0,
          advanceAmount: reservationData.advanceAmount || 0,
          notes: reservationData.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching reservation:', error);
    } finally {
      setFetchLoading(false);
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

    // Check if item is reserved and conflicts with our wedding date
    const conflicts = reservations?.filter(reservation => {
      // Skip cancelled reservations
      if (reservation.status === 'Cancelled') return false;
      
      // Skip the current reservation being edited
      if (reservation._id === reservationId) return false;
      
      // Check if this product is in this reservation
      const hasItem = reservation.items?.some((item: any) => {
        const itemId = typeof item === 'string' ? item : item._id;
        return itemId === product._id;
      });
      
      if (!hasItem) return false;
      
      // Check for wedding date conflicts first (same wedding date = conflict regardless of pickup times)
      if (reservation.client && (reservation.client as any).weddingDate) {
        const reservationWeddingDate = new Date((reservation.client as any).weddingDate);
        reservationWeddingDate.setHours(0, 0, 0, 0);
        
        if (weddingDate.getTime() === reservationWeddingDate.getTime()) {
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
        
        return isConflict;
      }
      
      // Fallback: if only availability date exists, use old logic
      if (reservation.availabilityDate) {
        const reservationAvailabilityDate = new Date(reservation.availabilityDate);
        reservationAvailabilityDate.setHours(0, 0, 0, 0);
        
        const isConflict = weddingDate <= reservationAvailabilityDate;
        
        return isConflict;
      }
      
      // If no availability date, assume it conflicts to be safe
      return true;
    });

    return conflicts?.length === 0;
  }, [formData.weddingDate, reservations, reservationId]);

  const filteredClients = customers.filter((client: any) => {
    if (clientSearchTerm.length < 2) return false;
    const searchLower = clientSearchTerm.toLowerCase();
    return (
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.phone?.includes(clientSearchTerm)
    );
  });

  // Get categories for tabs
  const getCategories = useCallback(() => {
    const categorySet = new Set<string>();
    products.forEach((product: any) => {
      const categoryName = typeof product.category === 'object' && (product.category as any)?.name
        ? (product.category as any).name
        : product.category;
      if (categoryName) categorySet.add(categoryName);
    });
    return Array.from(categorySet);
  }, [products]);

  // Filter products based on search, category, and availability
  const getFilteredProducts = useCallback(() => {
    return products.filter((product: any) => {
      // Text search
      if (itemSearchTerm) {
        const searchLower = itemSearchTerm.toLowerCase();
        const matchesText = product.name?.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower);
        if (!matchesText) return false;
      }

      // Category filter
      if (selectedCategoryTab !== 'all') {
        const categoryName = typeof product.category === 'object' && (product.category as any)?.name
          ? (product.category as any).name
          : product.category;
        if (categoryName !== selectedCategoryTab) return false;
      }

      // Availability filter
      if (!isItemAvailable(product)) {
        return false;
      }

      return true;
    });
  }, [products, itemSearchTerm, selectedCategoryTab, isItemAvailable]);

  const filteredProducts = useMemo(() => getFilteredProducts(), [getFilteredProducts]);

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, clientId: client._id }));
    setClientSearchTerm(`${client.firstName} ${client.lastName}`);
    setShowClientDropdown(false);
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

  const calculateFinancials = () => {
    const calculatedItemsTotal = selectedItems.reduce((sum, item) => sum + (item.rentalCost || 0), 0);
    const itemsTotal = customItemsTotal ?? calculatedItemsTotal;
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
  };

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

  // Image popup handlers
  const handleImageHover = (event: React.MouseEvent, imageSrc: string, altText: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setImagePopup({
      show: true,
      src: imageSrc,
      alt: altText,
      x: rect.right + 10,
      y: rect.top,
    });
  };

  const handleImageLeave = () => {
    setImagePopup(prev => ({ ...prev, show: false }));
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Please select at least one item');
      return;
    }

    const financials = calculateFinancials();

    const reservationData = {
      type: formData.type,
      client: selectedClient._id,
      items: selectedItems.map(item => item._id),
      pickupDate: `${formData.pickupDate}T${formData.pickupTime}`,
      returnDate: `${formData.returnDate}T${formData.returnTime}`,
      availabilityDate: `${formData.availabilityDate}T${formData.availabilityTime}`,
      status: formData.status,
      notes: formData.notes,
      additionalCost: financials.additionalCost,
      itemsTotal: financials.itemsTotal,
      subtotal: financials.subtotal,
      total: financials.total,
      securityDepositAmount: formData.securityDepositAmount,
      advanceAmount: formData.advanceAmount,
      bufferBefore: formData.bufferBefore,
      bufferAfter: formData.bufferAfter,
      availability: formData.availability,
    };

    setLoading(true);
    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });

      const data = await response.json();
      
      if (data.success) {
        dispatch(updateReservation(data.reservation));
        router.push(`/reservations/${reservationId}`);
      } else {
        alert(data.message || 'Failed to update reservation');
      }
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Failed to update reservation');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white">Client Selection</h3>
            
            {/* Client Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-white/50" />
              </div>
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => {
                  setClientSearchTerm(e.target.value);
                  setShowClientDropdown(e.target.value.length >= 2);
                }}
                className="block w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              
              {/* Client Dropdown */}
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-gray-900/95 backdrop-blur-lg border border-white/20 shadow-xl max-h-60 rounded-lg py-1 text-base overflow-auto">
                  {filteredClients.map((client: any) => (
                    <div
                      key={client._id}
                      onClick={() => handleClientSelect(client)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <span className="font-medium text-white">{client.firstName} {client.lastName}</span>
                        <span className="text-white/70 ml-2">{client.email}</span>
                      </div>
                      <div className="text-sm text-white/50">{client.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Client Display */}
            {selectedClient && (
              <div className="bg-white/5 border border-white/10 p-6 rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-white">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearchTerm('');
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
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="text-white">{selectedClient.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white">{selectedClient.email || 'N/A'}</p>
                  </div>
                  {selectedClient.weddingDate && (
                    <div>
                      <label className="text-sm text-gray-400">Wedding Date</label>
                      <p className="text-white">
                        {format(new Date(selectedClient.weddingDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )}
                  {selectedClient.weddingCity && (
                    <div>
                      <label className="text-sm text-gray-400">Wedding City</label>
                      <p className="text-white">{selectedClient.weddingCity}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reservation Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="Final" className="bg-gray-800">Final</option>
                <option value="Fitting" className="bg-gray-800">Fitting</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Wedding Date and Buffer Info */}
            {selectedClient && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-white mb-2">Date & Time Selection</h3>
                  <p className="text-sm text-gray-400">
                    Select both date and time for pickup, return, and availability. Times will be stored with the reservation.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Wedding Date</label>
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
                      <p className="text-sm text-gray-400">Pickup Date</p>
                      <p className="text-lg font-medium text-white">
                        {formData.pickupDate
                          ? format(new Date(formData.pickupDate), 'dd/MM/yyyy')
                          : ''}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Pickup Time
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
                        Days Before Wedding
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
                      <p className="text-sm text-gray-400">Return Date</p>
                      <p className="text-lg font-medium text-white">
                        {formData.returnDate
                          ? format(new Date(formData.returnDate), 'dd/MM/yyyy')
                          : ''}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Return Time
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
                        Days After Wedding
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
                      <p className="text-sm text-gray-400">Availability Date</p>
                      <p className="text-lg font-medium text-white">
                        {formData.availabilityDate
                          ? format(new Date(formData.availabilityDate), 'dd/MM/yyyy')
                          : ''}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        Availability Time
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
                        Availability Duration
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

            {/* Selected Items Display */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-white">Selected Items</h4>
                <button
                  onClick={() => setShowItemSelector(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Items
                </button>
              </div>

              {/* Currently Selected Items */}
              {selectedItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedItems.map((item: any) => (
                    <div key={item._id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center space-x-4">
                      <div className="flex-shrink-0 w-16 h-16">
                        {item.primaryPhoto ? (
                          <img
                            src={`/api/uploads/${item.primaryPhoto}`}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onMouseEnter={(e) => handleImageHover(e, `/api/uploads/${item.primaryPhoto}`, item.name)}
                            onMouseLeave={handleImageLeave}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9IiMzNzQxNTEiLz4KPHR7d3QgeD0iMTI4IiB5PSIxMjgiIGZpbGw9IiM2QjcyODkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4=';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-600 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-white font-medium truncate">{item.name}</h5>
                        <p className="text-sm text-gray-400">
                          {typeof item.category === 'object' && (item.category as any)?.name 
                            ? (item.category as any).name 
                            : item.category || 'No category'}
                        </p>
                        <p className="text-sm font-medium text-white mt-1">
                          {formatCurrency(item.rentalCost || 0, currencySettings)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleItemToggle(item)}
                        className="flex-shrink-0 p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove item"
                      >
                        <Cross2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
                  <p className="text-gray-400">No items selected</p>
                  <button
                    onClick={() => setShowItemSelector(true)}
                    className="mt-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Click "Add Items" to select items for this reservation
                  </button>
                </div>
              )}
            </div>

            {/* Item Selection Modal */}
            {showItemSelector && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Add Items to Reservation</h3>
                    <button
                      onClick={() => setShowItemSelector(false)}
                      className="text-white/70 hover:text-white transition-colors"
                    >
                      <Cross2Icon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => setSelectedCategoryTab('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedCategoryTab === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      All ({products.filter(p => isItemAvailable(p)).length})
                    </button>
                    {getCategories().map((category) => {
                      const categoryCount = products.filter(p => {
                        const categoryName = typeof p.category === 'object' && (p.category as any)?.name
                          ? (p.category as any).name
                          : p.category;
                        return categoryName === category && isItemAvailable(p);
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
                  <div className="relative mb-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                      placeholder="Search items..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Available Items Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {filteredProducts.map((product: any) => {
                      const isSelected = selectedItems.some(item => item._id === product._id);
                      const isAvailable = isItemAvailable(product);
                      return (
                        <div
                          key={product._id}
                          className={`relative rounded-lg border ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/20'
                              : 'border-white/10 hover:border-white/30'
                          } overflow-hidden group cursor-pointer transition-all`}
                          onClick={() => handleItemToggle(product)}
                        >
                          <div className="aspect-[4/3] relative">
                            {product.primaryPhoto ? (
                              <img
                                src={`/api/uploads/${product.primaryPhoto}`}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-cover hover:opacity-80 transition-opacity"
                                onMouseEnter={(e) => handleImageHover(e, `/api/uploads/${product.primaryPhoto}`, product.name)}
                                onMouseLeave={handleImageLeave}
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
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <CheckIcon className="w-5 h-5 text-white bg-blue-500 rounded-full p-1" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="text-white font-medium text-sm truncate">{product.name}</h3>
                            <p className="text-xs text-gray-400 truncate">
                              {typeof product.category === 'object' && (product.category as any)?.name 
                                ? (product.category as any).name 
                                : product.category || 'No category'}
                            </p>
                            <p className="text-sm font-medium text-white mt-1">
                              {formatCurrency(product.rentalCost || 0, currencySettings)}
                            </p>
                            {/* Availability status */}
                            <div className="mt-2 text-xs">
                              <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                                Available for selected dates
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No available items found for the selected criteria</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Try adjusting your search terms, category filter, or wedding date
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowItemSelector(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowItemSelector(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        const financials = calculateFinancials();
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
                <option value="Draft" className="bg-gray-800">Draft</option>
                <option value="Confirmed" className="bg-gray-800">Confirmed</option>
                <option value="Cancelled" className="bg-gray-800">Cancelled</option>
              </select>
            </div>

            {/* Additional Costs */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Additional Cost
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
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter any additional notes..."
              />
            </div>

            {/* Financial Summary */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium text-white">Financial Summary</h3>

              <div className="space-y-4">
                {/* Items Total - Editable */}
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">Items Total</span>
                    {financials.calculatedItemsTotal !== financials.itemsTotal && (
                      <span className="text-xs text-blue-400">
                        (Calculated: {formatCurrency(financials.calculatedItemsTotal, currencySettings)})
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
                      value={customItemsTotal ?? financials.calculatedItemsTotal}
                      onChange={(e) => handleItemsTotalChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-300">
                  <span>Additional Cost</span>
                  <span>{formatCurrency(financials.additionalCost, currencySettings)}</span>
                </div>

                <div className="flex justify-between text-base font-medium text-white border-t border-white/10 pt-2">
                  <span>Subtotal</span>
                  <span>{formatCurrency(financials.subtotal, currencySettings)}</span>
                </div>

                {/* Security Deposit */}
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-300">Security Deposit</span>
                  <div className="relative w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {getCurrencySymbol(currencySettings)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={formData.securityDepositAmount}
                      onChange={(e) => handleSecurityDepositChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Advance Payment */}
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-300">Advance Payment</span>
                  <div className="relative w-40">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {getCurrencySymbol(currencySettings)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={formData.advanceAmount}
                      onChange={(e) => handleAdvanceChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold text-blue-400 border-t border-white/10 pt-3">
                  <span>Total</span>
                  <span>{formatCurrency(financials.total, currencySettings)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (fetchLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-white">Loading reservation...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!reservation) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-400 text-lg mb-4">Reservation not found</p>
            <Link
              href="/reservations"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Back to Reservations
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Edit Reservation</h1>
            <Link
              href={`/reservations/${reservationId}`}
              className="text-white/70 hover:text-white transition-colors"
            >
              <Cross2Icon className="w-6 h-6" />
            </Link>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((stepItem, index) => (
              <div key={stepItem.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    step >= stepItem.number
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/10 text-white/70 border border-white/20'
                  }`}
                >
                  {stepItem.number}
                </div>
                <div className="ml-2 text-sm font-medium text-white">
                  {stepItem.title}
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-4 w-8 h-px bg-white/30" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl p-6">
        {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className="px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/20 rounded-lg shadow-sm hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
            >
              Previous
            </button>
            
            {step < steps.length ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedClient}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <ApprovalHandler
                actionType="edit"
                resourceType="reservation"
                resourceId={reservationId}
                resourceName={`Reservation #${reservationId}`}
                originalData={reservation}
                newData={(() => {
                  const financials = calculateFinancials();
                  return {
                    type: formData.type,
                    client: selectedClient._id,
                    items: selectedItems.map(item => item._id),
                    pickupDate: `${formData.pickupDate}T${formData.pickupTime}`,
                    returnDate: `${formData.returnDate}T${formData.returnTime}`,
                    availabilityDate: `${formData.availabilityDate}T${formData.availabilityTime}`,
                    status: formData.status,
                    notes: formData.notes,
                    additionalCost: financials.additionalCost,
                    itemsTotal: financials.itemsTotal,
                    subtotal: financials.subtotal,
                    total: financials.total,
                    securityDepositAmount: formData.securityDepositAmount,
                    advanceAmount: formData.advanceAmount,
                    bufferBefore: formData.bufferBefore,
                    bufferAfter: formData.bufferAfter,
                    availability: formData.availability,
                  };
                })()}
                onDirectAction={async () => {
                  await handleSubmit();
                }}
                onSuccess={() => {
                  toast.success('Reservation updated successfully');
                  router.push(`/reservations/${reservationId}`);
                }}
              >
                <button
                  type="button"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-md transition-colors flex items-center gap-2"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {loading ? 'Updating...' : 'Update Reservation'}
                </button>
              </ApprovalHandler>
            )}
          </div>
      </div>

        
      </div>

      {/* Image Popup */}
      {imagePopup.show && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: `${imagePopup.x}px`,
            top: `${imagePopup.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-lg p-2 shadow-2xl">
            <img
              src={imagePopup.src}
              alt={imagePopup.alt}
              className="w-64 h-48 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9IiMzNzQxNTEiLz4KPHR7d3QgeD0iMTI4IiB5PSIxMjgiIGZpbGw9IiM2QjcyODkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4=';
              }}
            />
            <div className="mt-2 text-xs text-white/80 text-center truncate">
              {imagePopup.alt}
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  );
} 