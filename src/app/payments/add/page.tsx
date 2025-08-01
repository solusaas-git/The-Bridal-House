'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ArrowLeftIcon,
} from '@radix-ui/react-icons';

import AttachmentsSection from '@/components/shared/AttachmentsSection';
import Layout from '@/components/Layout';
import { formatCurrency } from '@/utils/currency';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface Reservation {
  _id: string;
  reservationNumber: string;
  eventDate: string;
  pickupDate?: string;
  weddingDate?: string;
  eventTime?: string;
  eventLocation?: string;
  type?: string;
  client: Customer;
  items?: Array<{
    _id: string;
    name: string;
    rentalCost: number;
  }>;
  // Financial fields that might be stored directly on reservation
  itemsTotal?: number;
  subtotal?: number;
  advance?: number;
  securityDeposit?: number;
  total?: number;
  // Legacy financial structure support
  financials?: {
    itemsTotal: number;
    subtotal: number;
    advance: number;
    securityDeposit: number;
    total: number;
  };
  additionalCost?: number;
  securityDepositPercentage?: number;
  advancePercentage?: number;
}

interface PaymentFormData {
  client: string;
  reservation: string;
  amount: string;
  paymentDate: string;
  paymentTime: string;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Check';
  paymentType: 'Advance' | 'Security' | 'Final' | 'Other';
  reference: string;
  note: string;
}

// Component to show real-time financial information for reservations
const ReservationFinancials: React.FC<{ reservation: Reservation; customerId?: string }> = ({ 
  reservation, 
  customerId 
}) => {
  const currencySettings = useSelector((state: RootState) => state.settings);
  const [paymentDetails, setPaymentDetails] = useState<{
    totalPaid: number;
    remaining: number;
    paymentStatus: string;
    financials: {
      itemsTotal: number;
      subtotal: number;
      advance: number;
      securityDeposit: number;
      total: number;
    };
  } | null>(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!customerId) return;
      
      try {
        const response = await axios.get(`/api/payments/by-customer/${customerId}`);
        if (response.data.success) {
          const customerPayments = response.data.payments;
          console.log('Fetched customer payments:', customerPayments);
          console.log('Current reservation ID:', reservation._id);
          
          const financials = {
            itemsTotal: reservation.itemsTotal || 0,
            subtotal: reservation.subtotal || 0,
            advance: reservation.advance || 0,
            securityDeposit: reservation.securityDeposit || 0,
            total: reservation.total || 0,
          };
          
          const associatedPayments = customerPayments.filter(
            (payment: { reservation?: { _id: string }; paymentType?: string; amount: number }) => {
              console.log('Checking payment:', payment.reservation?._id, 'vs reservation:', reservation._id);
              return payment.reservation && payment.reservation._id === reservation._id;
            }
          );
          
          console.log('Associated payments:', associatedPayments);
          
          const totalPaid = associatedPayments.reduce((sum: number, payment: { paymentType?: string; amount: number }) => {
            if (payment.paymentType !== "Refund") {
              return sum + payment.amount;
            }
            return sum;
          }, 0);

          console.log('Total paid:', totalPaid, 'Total cost:', financials.total);

          const remaining = financials.total - totalPaid;
          let paymentStatus = "Unpaid";
          if (totalPaid >= financials.total) {
            paymentStatus = "Paid";
          } else if (totalPaid > 0) {
            paymentStatus = "Partial";
          }

          setPaymentDetails({
            totalPaid,
            remaining,
            paymentStatus,
            financials
          });
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
      }
    };

    fetchPaymentDetails();
  }, [reservation._id, customerId, reservation.itemsTotal, reservation.subtotal, reservation.advance, reservation.securityDeposit, reservation.total]);

  if (!paymentDetails) {
    return (
      <div className="text-right">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  const { totalPaid, remaining, paymentStatus, financials } = paymentDetails;

  return (
    <div className="text-right">
      <div className="text-sm text-gray-400">
        {reservation.items?.length || 0} items
      </div>
      <div className="font-medium text-green-400">
        Total: {formatCurrency(financials.total, currencySettings)}
      </div>
      <div className="text-xs text-green-500 mt-1">
        Paid: {formatCurrency(totalPaid, currencySettings)}
      </div>
      <div className="text-xs text-yellow-400">
        Remaining: {formatCurrency(remaining, currencySettings)}
      </div>
      <div className={`text-xs mt-1 px-2 py-1 rounded ${
        paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' :
        paymentStatus === 'Partial' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-red-500/20 text-red-400'
      }`}>
        {paymentStatus}
      </div>
    </div>
  );
};

const AddPaymentPage = () => {
  const router = useRouter();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  // Customer search states (matching customers page pattern)
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [customerReservations, setCustomerReservations] = useState<Reservation[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [formData, setFormData] = useState<PaymentFormData>({
    client: '',
    reservation: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentTime: new Date().toISOString().split('T')[1].substring(0, 5), // Default to current time
    paymentMethod: 'Cash',
    paymentType: 'Advance',
    reference: '',
    note: '',
  });

  // Load customers and reservations on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load customers and reservations in parallel
        const [customersRes, reservationsRes] = await Promise.all([
          axios.get('/api/customers', { params: { limit: 1000 } }), // Load all customers initially
          axios.get('/api/reservations') // You might need to create this endpoint
        ]);
        
        if (customersRes.data.success) {
          setCustomers(customersRes.data.customers);
        }
        
        if (reservationsRes.data.success) {
          setReservations(reservationsRes.data.reservations);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Search customers (matching customers page pattern)
  const searchCustomers = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    // If a customer is selected and search term matches their name, don't search
    if (selectedCustomer && searchTerm.trim() === `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) {
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
  }, [selectedCustomer]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(customerSearch);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [customerSearch, searchCustomers]);

  // Financial calculation functions from old app
  const calculateFinancials = (reservation: Reservation) => {
    console.log('Calculating financials for reservation:', reservation);
    
    // Try multiple ways to get financial data
    let financials = {
      itemsTotal: 0,
      subtotal: 0,
      advance: 0,
      securityDeposit: 0,
      total: 0,
    };

    // Option 1: Direct fields on reservation
    if (reservation.total && reservation.total > 0) {
      financials = {
        itemsTotal: reservation.itemsTotal || 0,
        subtotal: reservation.subtotal || 0,
        advance: reservation.advance || 0,
        securityDeposit: reservation.securityDeposit || 0,
        total: reservation.total,
      };
      console.log('Using direct fields:', financials);
    }
    // Option 2: Legacy financials object
    else if (reservation.financials) {
      financials = reservation.financials;
      console.log('Using financials object:', financials);
    }
    // Option 3: Calculate from items if available
    else if (reservation.items && reservation.items.length > 0) {
      const itemsTotal = reservation.items.reduce((sum, item) => sum + (item.rentalCost || 0), 0);
      const additionalCost = reservation.additionalCost || 0;
      const subtotal = itemsTotal + additionalCost;
      
      // Use percentages if available, otherwise use default
      const securityDepositPercentage = reservation.securityDepositPercentage || 30;
      const advancePercentage = reservation.advancePercentage || 50;
      
      const securityDeposit = (subtotal * securityDepositPercentage) / 100;
      const advance = (subtotal * advancePercentage) / 100;
      const total = subtotal + securityDeposit + advance;
      
      financials = {
        itemsTotal,
        subtotal,
        advance,
        securityDeposit,
        total,
      };
      console.log('Calculated from items:', financials);
    }
    
    console.log('Final financials:', financials);
    return financials;
  };

  const calculatePaymentDetails = (reservation: Reservation, allPayments: Array<{
    _id: string;
    reservation?: { _id: string };
    amount: number;
    paymentType?: string;
  }>) => {
    const financials = calculateFinancials(reservation);
    const associatedPayments = allPayments.filter(
      (item) => item.reservation && item.reservation._id === reservation._id
    );
    const totalPaid = associatedPayments?.reduce((sum, payment) => {
      if (payment.paymentType !== "Refund") {
        return sum + payment.amount;
      }
      return sum;
    }, 0) || 0;

    const remaining = financials.total - totalPaid;
    const percentage = financials.total > 0 ? (totalPaid / financials.total) * 100 : 0;

    let paymentStatus = "Unpaid";
    if (totalPaid >= financials.total) {
      paymentStatus = "Paid";
    } else if (totalPaid > 0) {
      paymentStatus = "Partial";
    }

    const hasRefund = associatedPayments?.some(
      (payment) => payment.paymentType === "Refund"
    );
    if (hasRefund) {
      paymentStatus = "Refunded";
    }

    return {
      totalPaid,
      remaining,
      percentage,
      paymentStatus,
      financials
    };
  };

  // Fetch payments for selected customer to calculate accurate amounts
  const fetchCustomerPayments = useCallback(async (customerId: string) => {
    try {
      const response = await axios.get(`/api/payments/by-customer/${customerId}`);
      if (response.data.success) {
        return response.data.payments;
      }
      return [];
    } catch (error) {
      console.error('Error fetching customer payments:', error);
      return [];
    }
  }, []);

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    // The useEffect will handle the actual search with debouncing
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
    setFilteredCustomers([]); // Clear search results
    setFormData(prev => ({ ...prev, client: customer._id }));
    
    // Filter reservations for this customer - add null safety check
    const customerRes = reservations.filter(res => res.client && res.client._id === customer._id);
    setCustomerReservations(customerRes);
    
    // Clear selected reservation
    setSelectedReservation(null);
    setFormData(prev => ({ ...prev, reservation: '' }));
  };

  const handleReservationSelect = async (reservation: Reservation) => {
    console.log('Selected reservation:', reservation);
    setSelectedReservation(reservation);
    setFormData(prev => ({ ...prev, reservation: reservation._id }));
    
    // Fetch payments for this customer to calculate remaining amount
    if (selectedCustomer) {
      console.log('Fetching payments for customer:', selectedCustomer._id);
      const customerPayments = await fetchCustomerPayments(selectedCustomer._id);
      console.log('Customer payments fetched:', customerPayments);
      
      const paymentDetails = calculatePaymentDetails(reservation, customerPayments);
      console.log('Payment details calculated:', paymentDetails);
      
      // Auto-populate the amount field with remaining amount
      if (paymentDetails.remaining > 0) {
        console.log('Auto-filling amount with remaining:', paymentDetails.remaining);
        setFormData(prev => ({ ...prev, amount: paymentDetails.remaining.toString() }));
      }
    }
  };

  const fetchReservations = async (customerId: string) => {
    try {
      const response = await axios.get(`/api/reservations/by-customer/${customerId}`);
      if (response.data.success) {
        setReservations(response.data.reservations);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
      setReservations([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If customer changes, fetch their reservations
    if (name === 'client' && value) {
      fetchReservations(value);
    }
  };

  const handleFilesAdded = (files: File[]) => {
    setNewFiles(prev => [...prev, ...files]);
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    
    if (!selectedReservation) {
      toast.error('Please select a reservation');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);

      const submitData = new FormData();
      
      // Append form data
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '') {
          submitData.append(key, value);
        }
      });

      // Append files
      newFiles.forEach((file) => {
        submitData.append('attachments', file);
      });

      const response = await axios.post('/api/payments', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Payment created successfully');
        router.push('/payments');
      } else {
        toast.error(response.data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/payments');
  };

  const handleBack = () => {
    router.push('/payments');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleBack}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Payments
          </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Add New Payment</h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-200">Customer*</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  placeholder="Search customers by name, phone, or email..."
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
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
                {showCustomerDropdown && !searchLoading && filteredCustomers.length === 0 && customerSearch.length >= 2 && !selectedCustomer && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50">
                    <div className="px-4 py-3 text-center text-gray-400">
                      No customers found
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reservation Selection */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-200">Reservation*</label>
              {selectedCustomer ? (
                <div className="space-y-2">
                  {customerReservations.length > 0 ? (
                    <div className="grid gap-2">
                      {customerReservations.map((reservation) => {
                        return (
                          <button
                            key={reservation._id}
                            type="button"
                            onClick={() => handleReservationSelect(reservation)}
                            className={`p-4 rounded-lg border text-left transition-colors ${
                              selectedReservation?._id === reservation._id
                                ? 'bg-blue-600/20 border-blue-500/50'
                                : 'bg-white/5 border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-white">#{reservation.reservationNumber}</div>
                                <div className="text-sm text-gray-400 mt-1">
                                  {/* Try different date fields - eventDate, pickupDate, or weddingDate */}
                                  {reservation.eventDate ? 
                                    new Date(reservation.eventDate).toLocaleDateString() : 
                                    reservation.pickupDate ? 
                                    new Date(reservation.pickupDate).toLocaleDateString() :
                                    reservation.weddingDate ?
                                    new Date(reservation.weddingDate).toLocaleDateString() :
                                    'Date not set'
                                  }
                                  {reservation.eventTime && ` at ${reservation.eventTime}`}
                                </div>
                                {reservation.eventLocation && (
                                  <div className="text-sm text-gray-400">{reservation.eventLocation}</div>
                                )}
                                <div className="text-xs text-blue-300 mt-1">
                                  Type: {reservation.type || 'Wedding'}
                                </div>
                              </div>
                              <ReservationFinancials 
                                reservation={reservation} 
                                customerId={selectedCustomer?._id} 
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-600/20 border border-yellow-500/50 rounded-lg">
                      <p className="text-yellow-200 text-sm">No reservations found for this customer.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-600/20 border border-gray-500/50 rounded-lg">
                  <p className="text-gray-300 text-sm">Please select a customer first to view their reservations.</p>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Amount*</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Payment Date*</label>
                <input
                  type="date"
                  name="paymentDate"
                  value={formData.paymentDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Payment Time*</label>
                <input
                  type="time"
                  name="paymentTime"
                  value={formData.paymentTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-200">Payment Method*</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="Cash" className="bg-gray-800">Cash</option>
                <option value="Bank Transfer" className="bg-gray-800">Bank Transfer</option>
                <option value="Credit Card" className="bg-gray-800">Credit Card</option>
                <option value="Check" className="bg-gray-800">Check</option>
              </select>
            </div>

            {/* Payment Type and Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Payment Type*</label>
                <select
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Advance" className="bg-gray-800">Advance</option>
                  <option value="Security" className="bg-gray-800">Security</option>
                  <option value="Final" className="bg-gray-800">Final</option>
                  <option value="Other" className="bg-gray-800">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Reference</label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="Payment reference or transaction ID"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-200">Notes</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={3}
                placeholder="Additional payment notes..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Attachments */}
            <AttachmentsSection
              existingFiles={[]}
              newFiles={newFiles}
              onAddFiles={handleFilesAdded}
              onRemoveNew={handleRemoveNewFile}
            />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors text-sm w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
              >
                {loading ? 'Creating...' : 'Create Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AddPaymentPage; 