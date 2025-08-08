'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UpdateIcon,
} from '@radix-ui/react-icons';
import Layout from '@/components/Layout';
import { formatCurrency } from '@/utils/currency';
import AttachmentsSection from '@/components/shared/AttachmentsSection';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import type { IAttachment } from '@/models';
import { useTranslation } from 'react-i18next';

// Types
interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
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

interface Payment {
  _id: string;
  client: Customer;
  reservation?: Reservation;
  paymentDate?: Date;
  amount?: number;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Check';
  paymentType?: 'Advance' | 'Security' | 'Final' | 'Other';
  reference?: string;
  note?: string;
  attachments: IAttachment[];
}

// Component to show real-time financial information for reservations
const ReservationFinancials: React.FC<{ reservation: Reservation; customerId?: string }> = ({ 
  reservation, 
  customerId 
}) => {
  const { t } = useTranslation('payments');
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
        <div className="text-sm text-gray-400">{t('edit.reservation.loading')}</div>
      </div>
    );
  }

  const { totalPaid, remaining, paymentStatus, financials } = paymentDetails;

  return (
    <div className="text-right">
      <div className="text-sm text-gray-400">
        {t('edit.reservation.itemsCount', { count: reservation.items?.length || 0 })}
      </div>
      <div className="font-medium text-green-400">
        {t('edit.reservation.total')}: {formatCurrency(financials.total, currencySettings)}
      </div>
      <div className="text-xs text-green-500 mt-1">
        {t('edit.reservation.paid')}: {formatCurrency(totalPaid, currencySettings)}
      </div>
      <div className="text-xs text-yellow-400">
        {t('edit.reservation.remaining')}: {formatCurrency(remaining, currencySettings)}
      </div>
      <div className={`text-xs mt-1 px-2 py-1 rounded ${
        paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' :
        paymentStatus === 'Partial' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-red-500/20 text-red-400'
      }`}>
        {t(`edit.reservation.paymentStatus.${paymentStatus.toLowerCase()}`)}
      </div>
    </div>
  );
};

const EditPaymentPage = () => {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;
  const { t } = useTranslation('payments');
  const { t: tCommon } = useTranslation('common');

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State variables used in functions
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingReservations, setLoadingReservations] = useState(false);
  
  // Customer search states (matching customers page pattern)
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [customerReservations, setCustomerReservations] = useState<Reservation[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [existingFiles, setExistingFiles] = useState<IAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletedAttachments, setDeletedAttachments] = useState<IAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    client: '',
    reservation: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentTime: new Date().toISOString().split('T')[1].substring(0, 5),
    paymentMethod: 'Cash' as const,
    paymentType: 'Advance' as const,
    reference: '',
    note: ''
  });

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

  const fetchPayment = useCallback(async () => {
    if (!paymentId || paymentId === 'new') return;

    try {
      setLoading(true);
      const response = await axios.get(`/api/payments/${paymentId}`);
      
      if (response.data.success) {
        const payment = response.data.payment;
        console.log('Payment loaded:', payment);
        
        // Set the payment state so the form renders
        setPayment(payment);
        
        // Pre-populate form with existing payment data
        setFormData({
          client: payment.client?._id || '',
          reservation: payment.reservation?._id || '',
          amount: payment.amount?.toString() || '',
          paymentMethod: payment.paymentMethod || 'Cash',
          paymentType: payment.paymentType || 'Advance',
          paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : '',
          paymentTime: payment.paymentDate ? payment.paymentDate.split('T')[1]?.substring(0, 5) || '00:00' : '00:00',
          reference: payment.reference || '',
          note: payment.note || '',
        });

        // Set existing attachments - map from 'url' to 'link' field
        const attachments = (payment.attachments || []).map((att: { name?: string; size?: number; url?: string; link?: string }) => ({
          name: att.name || '',
          size: att.size || 0,
          url: att.url || att.link || '' // Handle both 'url' and 'link' fields
        }));
        
        // Remove duplicates based on URL to fix database inconsistencies
        const uniqueAttachments = attachments.filter((att: IAttachment, index: number, self: IAttachment[]) => 
          index === self.findIndex((a: IAttachment) => a.url === att.url && a.url !== '')
        );
        

        
        setExistingFiles(uniqueAttachments);
        
        // Set customer information
        if (payment.client) {
          console.log('Setting customer from payment:', payment.client);
          setSelectedCustomer(payment.client);
          setCustomerSearch(`${payment.client.firstName} ${payment.client.lastName}`);
          
          // Fetch reservations for this customer
          try {
            console.log('Fetching reservations for customer:', payment.client._id);
            const reservationsResponse = await axios.get(`/api/reservations/by-customer/${payment.client._id}`);
            console.log('Reservations response:', reservationsResponse.data);
            
            if (reservationsResponse.data.success) {
              setCustomerReservations(reservationsResponse.data.reservations);
              console.log('Customer reservations set:', reservationsResponse.data.reservations);
              
              // Set selected reservation if it exists
              if (payment.reservation) {
                console.log('Setting reservation from payment:', payment.reservation);
                setSelectedReservation(payment.reservation);
              }
            } else {
              console.log('No reservations found for customer');
              setCustomerReservations([]);
            }
          } catch (error) {
            console.error('Error fetching customer reservations:', error);
            setCustomerReservations([]);
          }
        }
        
      } else {
        toast.error(response.data.message || 'Failed to load payment');
        router.push('/payments');
      }
    } catch (error) {
      console.error('Error fetching payment:', error);
      toast.error('Failed to load payment');
      router.push('/payments');
    } finally {
      setLoading(false);
    }
  }, [paymentId, router]);

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    // The useEffect will handle the actual search with debouncing
  };

  const handleCustomerSelect = async (customer: Customer) => {
    console.log('Customer selected:', customer);
    setSelectedCustomer(customer);
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
    setFilteredCustomers([]);
    
    // Update form data
    setFormData(prev => ({ ...prev, client: customer._id }));
    
    // Fetch reservations for this customer
    try {
      console.log('Fetching reservations for customer:', customer._id);
      const response = await axios.get(`/api/reservations/by-customer/${customer._id}`);
      console.log('Reservations response:', response.data);
      
      if (response.data.success) {
        setCustomerReservations(response.data.reservations);
        console.log('Customer reservations set:', response.data.reservations);
        
        // If this payment already has a reservation, select it
        if (formData.reservation) {
          const existingReservation = response.data.reservations.find(
            (res: Reservation) => res._id === formData.reservation
          );
          if (existingReservation) {
            console.log('Found existing reservation:', existingReservation);
            setSelectedReservation(existingReservation);
          }
        }
      } else {
        console.log('No reservations found in response');
        setCustomerReservations([]);
      }
    } catch (error) {
      console.error('Error fetching customer reservations:', error);
      setCustomerReservations([]);
    }
  };

  const handleReservationSelect = async (reservation: Reservation) => {
    console.log('Reservation selected:', reservation);
    setSelectedReservation(reservation);
    setFormData(prev => ({ ...prev, reservation: reservation._id }));
    
    // Fetch payments for this customer to calculate remaining amount
    if (selectedCustomer) {
      console.log('Fetching payments for customer:', selectedCustomer._id);
      const customerPayments = await fetchCustomerPayments(selectedCustomer._id);
      console.log('Customer payments fetched:', customerPayments);
      
      const paymentDetails = calculatePaymentDetails(reservation, customerPayments);
      console.log('Payment details calculated:', paymentDetails);
    }
  };

  useEffect(() => {
    if (paymentId) {
      fetchPayment();
      fetchCustomers();
    }
  }, [paymentId, fetchPayment]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await axios.get('/api/customers');
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchReservations = async (customerId: string) => {
    if (!customerId) {
      setReservations([]);
      return;
    }

    try {
      setLoadingReservations(true);
      const response = await axios.get(`/api/reservations/by-customer/${customerId}`);
      if (response.data.success) {
        setReservations(response.data.reservations);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Fetch reservations when customer changes
    if (name === 'client') {
      setFormData(prev => ({ ...prev, reservation: '' }));
      fetchReservations(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const submitData = new FormData();
      
      // Add form fields
      submitData.append('client', formData.client);
      if (formData.reservation) {
        submitData.append('reservation', formData.reservation);
      }
      submitData.append('amount', formData.amount);
      submitData.append('paymentMethod', formData.paymentMethod);
      submitData.append('paymentType', formData.paymentType);
      if (formData.paymentDate) {
        submitData.append('paymentDate', formData.paymentDate);
      }
      if (formData.paymentTime) {
        submitData.append('paymentTime', formData.paymentTime);
      }
      if (formData.reference) {
        submitData.append('reference', formData.reference);
      }
      if (formData.note) {
        submitData.append('note', formData.note);
      }

      // Add existing attachments to keep
      submitData.append('existingAttachments', JSON.stringify(existingFiles));

      // Add new files
      newFiles.forEach((file) => {
        submitData.append('attachments', file);
      });

      const response = await axios.put(`/api/payments/${paymentId}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Payment updated successfully');
        router.push(`/payments/${paymentId}`);
      } else {
        toast.error(response.data.message || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Failed to update payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/payments/${paymentId}`);
  };

  const handleAddFiles = (files: File[]) => {
    setNewFiles(prev => [...prev, ...files]);
  };

  // Fix the handleRemoveExisting function parameter type
  const handleRemoveExisting = (file: IAttachment, fileIndex: number) => {
    // Remove by index instead of URL to avoid deleting duplicates
    const filesToKeep = existingFiles.filter((_, index) => index !== fileIndex);
    setExistingFiles(filesToKeep);
    setDeletedAttachments(prev => [...prev, file]);
  };

  const handleRemoveNew = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDirectSubmit = async () => {
    // Validation
    if (!formData.client || !formData.amount || !formData.paymentDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount.toString()) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      formDataToSend.append('client', formData.client);
      if (formData.reservation) formDataToSend.append('reservation', formData.reservation);
      formDataToSend.append('paymentDate', formData.paymentDate);
      if (formData.paymentTime) formDataToSend.append('paymentTime', formData.paymentTime);
      formDataToSend.append('amount', formData.amount.toString());
      if (formData.paymentMethod) formDataToSend.append('paymentMethod', formData.paymentMethod);
      if (formData.paymentType) formDataToSend.append('paymentType', formData.paymentType);
      if (formData.reference) formDataToSend.append('reference', formData.reference);
      if (formData.note) formDataToSend.append('note', formData.note);
      
      // Add existing attachments (those not deleted)
      formDataToSend.append('existingAttachments', JSON.stringify(existingFiles));

      // Add new attachments
      newFiles.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const response = await axios.put(`/api/payments/${paymentId}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Payment updated successfully');
      router.push(`/payments/${paymentId}`);
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error(error.response?.data?.error || t('edit.messages.updateError'));
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // Enhanced financial calculation functions
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
            {t('edit.backToPayment')}
          </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('edit.title')}</h1>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">{t('edit.loading')}</span>
          </div>
        )}

        {/* Form */}
        {!loading && payment && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Customer and Reservation */}
              <div className="space-y-6">
                {/* Customer Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.customer')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      placeholder={t('edit.form.customerSearchPlaceholder')}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {searchLoading ? (
                          <div className="px-4 py-3 text-center text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto mb-2"></div>
                            {t('edit.form.searching')}
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
                          {t('edit.form.noCustomersFound')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reservation Selection */}
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.reservation')}</label>
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
                new Date(reservation.eventDate).toLocaleDateString('en-GB') :
                                        reservation.pickupDate ? 
                new Date(reservation.pickupDate).toLocaleDateString('en-GB') :
                                        reservation.weddingDate ?
                new Date(reservation.weddingDate).toLocaleDateString('en-GB') :
                                        t('edit.form.dateNotSet')
                                      }
                                      {reservation.eventTime && ` at ${reservation.eventTime}`}
                                    </div>
                                    {reservation.eventLocation && (
                                      <div className="text-sm text-gray-400">{reservation.eventLocation}</div>
                                    )}
                                    <div className="text-xs text-blue-300 mt-1">
                                      {t('edit.form.type')}: {reservation.type || t('edit.form.wedding')}
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
                          <p className="text-yellow-200 text-sm">{t('edit.reservation.noReservationsFound')}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-600/20 border border-gray-500/50 rounded-lg">
                      <p className="text-gray-300 text-sm">{t('edit.reservation.selectCustomerFirst')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">{t('edit.form.amount')} *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">{t('edit.form.paymentMethod')}</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash" className="text-black">{t('edit.form.paymentMethods.cash')}</option>
                  <option value="Bank Transfer" className="text-black">{t('edit.form.paymentMethods.bankTransfer')}</option>
                  <option value="Credit Card" className="text-black">{t('edit.form.paymentMethods.creditCard')}</option>
                  <option value="Check" className="text-black">{t('edit.form.paymentMethods.check')}</option>
                </select>
              </div>

              {/* Payment Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">{t('edit.form.paymentDate')}</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="paymentDate"
                      value={formData.paymentDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">{t('edit.form.paymentTime')}</label>
                  <div className="relative">
                    <input
                      type="time"
                      name="paymentTime"
                      value={formData.paymentTime}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Type and Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">{t('edit.form.paymentType')}</label>
                  <select
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Advance">{t('edit.form.paymentTypes.advance')}</option>
            
                    <option value="Final">{t('edit.form.paymentTypes.final')}</option>
                    <option value="Other">{t('edit.form.paymentTypes.other')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-200">{t('edit.form.reference')}</label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    placeholder={t('edit.form.referencePlaceholder')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.notes')}</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows={3}
                  placeholder={t('edit.form.notesPlaceholder')}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.attachments')}</label>
                <AttachmentsSection
                  existingFiles={existingFiles}
                  newFiles={newFiles}
                  onAddFiles={handleAddFiles}
                  onRemoveExisting={handleRemoveExisting}
                  onRemoveNew={handleRemoveNew}
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/20">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 sm:px-6 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors text-sm w-full sm:w-auto"
                >
                  {t('edit.form.cancel')}
                </button>
                <ApprovalHandler
                  actionType="edit"
                  resourceType="payment"
                  resourceId={paymentId}
                  resourceName={`Payment #${paymentId}`}
                  originalData={payment}
                  newData={{
                    client: formData.client,
                    reservation: formData.reservation,
                    amount: formData.amount,
                    paymentMethod: formData.paymentMethod,
                    paymentType: formData.paymentType,
                    paymentDate: formData.paymentDate,
                    paymentTime: formData.paymentTime,
                    reference: formData.reference,
                    note: formData.note,
                    existingAttachments: existingFiles,
                    newFiles: newFiles,
                    deletedAttachments: deletedAttachments
                  }}
                  onDirectAction={handleDirectSubmit}
                  onSuccess={() => {
                    toast.success(t('edit.messages.updateSuccess'));
                    router.push(`/payments/${paymentId}`);
                  }}
                >
                  <button
                    type="button"
                    disabled={submitting}
                    className="inline-flex items-center justify-center px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('edit.form.updating')}
                      </>
                    ) : (
                      t('edit.form.updatePayment')
                    )}
                  </button>
                </ApprovalHandler>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EditPaymentPage; 