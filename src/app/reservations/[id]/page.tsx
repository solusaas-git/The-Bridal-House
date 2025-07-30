'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import { 
  Cross2Icon, 
  DownloadIcon, 
  PlusIcon, 
  Pencil1Icon,
  CalendarIcon,
  PersonIcon,
  ListBulletIcon,
  DashboardIcon
} from '@radix-ui/react-icons';
import { RootState } from '@/store/store';
import { formatCurrency } from '@/utils/currency';
import Layout from '@/components/Layout';

interface Reservation {
  _id: string;
  type: string;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    weddingDate?: string;
    idNumber?: string;
  };
  items: Array<{
    _id: string;
    name: string;
    rentalCost: number;
    category: string;
    primaryPhoto?: string;
  }>;
  pickupDate: string;
  returnDate: string;
  availabilityDate?: string;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  total: number;
  itemsTotal: number;
  subtotal: number;
  additionalCost: number;
  securityDepositAmount: number;
  advanceAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Partially Paid' | 'Not Paid';
  notes?: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function ViewReservationPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;

  const currencySettings = useSelector((state: RootState) => state.settings);

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [associatedPayments, setAssociatedPayments] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // Image hover popup state
  const [hoveredImage, setHoveredImage] = useState<{
    src: string;
    alt: string;
    x: number;
    y: number;
  } | null>(null);

  // Modal states
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showViewPaymentModal, setShowViewPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const tabs = [
    { id: 'general', label: 'General Info', icon: PersonIcon },
    { id: 'items', label: 'Reserved Items', icon: ListBulletIcon },
    { id: 'payments', label: 'Associated Payments', icon: DashboardIcon },
  ];

  useEffect(() => {
    fetchReservation();
    setMounted(true);
  }, [reservationId]);

  const fetchPayments = async () => {
    if (!reservation?._id) return;
    
    try {
      const response = await fetch(`/api/payments?reservation=${reservation._id}`);
      const data = await response.json();
      
      if (data.success) {
        setAssociatedPayments(data.payments || []);
      } else {
        console.error('Failed to fetch payments:', data.message);
        setAssociatedPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setAssociatedPayments([]);
    }
  };

  useEffect(() => {
    if (reservation?._id) {
      fetchPayments();
    }
  }, [reservation]);

  const fetchReservation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reservations/${reservationId}`);
      const data = await response.json();
      
      if (data.success) {
        setReservation(data.reservation);
      } else {
        setError(data.message || 'Failed to fetch reservation');
      }
    } catch (error) {
      setError('Failed to fetch reservation');
      console.error('Error fetching reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancials = () => {
    if (!reservation) return null;

    // Check if stored calculated values exist, otherwise calculate them
    const hasStoredValues = reservation.itemsTotal && reservation.subtotal && reservation.total;
    
    if (hasStoredValues) {
      return {
        itemsTotal: reservation.itemsTotal,
        subtotal: reservation.subtotal,
        advance: reservation.advanceAmount || 0,
        securityDeposit: reservation.securityDepositAmount || 0,
        total: reservation.total,
      };
    } else {
      // Fallback calculation
      const itemsTotal = reservation.items?.reduce(
        (sum, item) => sum + (item.rentalCost || 0),
        0
      ) || 0;

      const additionalCost = reservation.additionalCost || 0;
      const subtotal = itemsTotal + additionalCost;
      const securityDeposit = reservation.securityDepositAmount || 0;
      const advance = reservation.advanceAmount || 0;
      const total = subtotal;

      return {
        itemsTotal,
        subtotal,
        advance,
        securityDeposit,
        total,
      };
    }
  };

  const calculatePaymentDetails = () => {
    const financials = calculateFinancials();
    if (!financials) return null;

    const totalPaid = associatedPayments?.reduce((sum, payment) => {
      if (payment.type !== 'Refund') {
        return sum + payment.amount;
      }
      return sum;
    }, 0) || 0;

    const remaining = financials.total - totalPaid;
    const percentage = financials.total > 0 ? (totalPaid / financials.total) * 100 : 0;

    let paymentStatus = 'Unpaid';
    if (totalPaid >= financials.total) {
      paymentStatus = 'Paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'Partial';
    }

    return {
      totalPaid,
      remaining,
      percentage,
      paymentStatus,
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
  };

  const handleImageHover = (e: React.MouseEvent, imageUrl: string, alt: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredImage({
      src: imageUrl,
      alt: alt,
      x: rect.right + 10, // Position to the right of the image
      y: rect.top - 50, // Position slightly above the image
    });
  };

  const handleImageLeave = () => {
    setHoveredImage(null);
  };

  const handleAddPayment = () => {
    setShowAddPaymentModal(true);
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
    setShowViewPaymentModal(true);
  };

  const handlePaymentAdded = () => {
    setShowAddPaymentModal(false);
    fetchPayments(); // Refresh payments list
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'Draft': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'Cancelled': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'Partial': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'Unpaid': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-300">Loading reservation...</div>
        </div>
      </Layout>
    );
  }

  if (error || !reservation) {
    return (
      <Layout>
        <div className="text-center text-red-400">
          <p>Error: {error || 'Reservation not found'}</p>
          <Link
            href="/reservations"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Reservations
          </Link>
        </div>
      </Layout>
    );
  }

  const financials = calculateFinancials();
  const paymentDetails = calculatePaymentDetails();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            {/* 1. Client Info */}
            {reservation.client && (
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-white mb-4">Client Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-400">Name</h5>
                      <p className="mt-1 text-sm text-white">
                        {reservation.client.firstName} {reservation.client.lastName}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-400">Phone</h5>
                      <p className="mt-1 text-sm text-white">{reservation.client.phone}</p>
                    </div>
                  </div>

                  {/* Column 2: Personal Info */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-400">CIN</h5>
                      <p className="mt-1 text-sm text-white">{reservation.client.idNumber || 'Not provided'}</p>
                    </div>
                    {reservation.client.weddingDate && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-400">Wedding Date</h5>
                        <p className="mt-1 text-sm text-white">{formatDate(reservation.client.weddingDate)}</p>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Rental Dates */}
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-400">Pickup Date</h5>
                      <p className="mt-1 text-sm text-white">{formatDate(reservation.pickupDate)}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-400">Return Date</h5>
                      <p className="mt-1 text-sm text-white">{formatDate(reservation.returnDate)}</p>
                    </div>
                    {reservation.availabilityDate && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-400">Availability Date</h5>
                        <p className="mt-1 text-sm text-white">{formatDate(reservation.availabilityDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Financial Summary */}
            {financials && (
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-white mb-4">Financial Summary</h4>
                <div className="space-y-2 text-white">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Items Total:</span>
                    <span>{formatCurrency(financials.itemsTotal, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Additional Cost:</span>
                    <span>{formatCurrency(reservation.additionalCost || 0, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-white/20 pt-2">
                    <span className="text-gray-400">Subtotal:</span>
                    <span>{formatCurrency(financials.subtotal, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Security Deposit:</span>
                    <span>{formatCurrency(financials.securityDeposit, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Advance:</span>
                    <span>{formatCurrency(financials.advance, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-white/20 pt-2">
                    <span className="text-gray-400">Total:</span>
                    <span>{formatCurrency(financials.total, currencySettings)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Notes */}
            {reservation.notes && (
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-white mb-4">Notes</h4>
                <p className="text-sm text-white bg-white/10 p-3 rounded-md">{reservation.notes}</p>
              </div>
            )}

            {/* 4. Reservation Info */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-white mb-4">Reservation Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-400">Reservation ID</h5>
                    <p className="mt-1 text-sm text-white font-mono">{reservation._id}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-400">Type</h5>
                    <p className="mt-1 text-sm text-white">{reservation.type}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-400">Status</h5>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(reservation.status)}`}>
                      {reservation.status}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-400">Created Date</h5>
                    <p className="mt-1 text-sm text-white">{formatDate(reservation.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'items':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Reserved Items</h4>
            {reservation.items && reservation.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservation.items.map((item) => {
                  const imageUrl = item.primaryPhoto ? `/api/uploads/${item.primaryPhoto}` : null;
                  return (
                    <div key={item._id} className="bg-white/5 p-4 rounded-lg">
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                              onMouseEnter={(e) => handleImageHover(e, imageUrl, item.name)}
                              onMouseLeave={handleImageLeave}
                              onError={(e) => {
                                // Replace failed image with placeholder div
                                const placeholder = document.createElement('div');
                                placeholder.className = 'w-16 h-16 rounded-lg bg-gray-600 flex items-center justify-center';
                                placeholder.innerHTML = '<span class="text-xs text-gray-400">IMG</span>';
                                (e.target as HTMLImageElement).parentNode?.replaceChild(placeholder, e.target as HTMLImageElement);
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-600 flex items-center justify-center">
                              <span className="text-xs text-gray-400">IMG</span>
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium text-white truncate">{item.name}</h5>
                              <p className="text-sm text-gray-400">{item.category}</p>
                            </div>
                            <span className="text-sm font-medium text-white ml-4 flex-shrink-0">
                              {formatCurrency(item.rentalCost || 0, currencySettings)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400">No items found for this reservation.</p>
            )}
            
            {financials && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <div className="flex justify-between font-medium text-lg text-white">
                  <span className="text-gray-400">Total Items Cost:</span>
                  <span>{formatCurrency(financials.itemsTotal, currencySettings)}</span>
                </div>
              </div>
            )}
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-white">Associated Payments</h4>
              <button
                onClick={handleAddPayment}
                className="inline-flex items-center px-3 py-2 border border-blue-500/30 text-sm leading-4 font-medium rounded-md text-blue-400 bg-blue-500/20 hover:bg-blue-500/30"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Payment
              </button>
            </div>

            {/* Payment Status */}
            {paymentDetails && (
              <div className="bg-white/5 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-400">Payment Status</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadgeColor(paymentDetails.paymentStatus)}`}>
                    {paymentDetails.paymentStatus}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-white">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Amount:</span>
                    <span>{formatCurrency(financials?.total || 0, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paid:</span>
                    <span className="text-green-400">{formatCurrency(paymentDetails.totalPaid, currencySettings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Remaining:</span>
                    <span className={paymentDetails.remaining > 0 ? 'text-red-400' : 'text-green-400'}>
                      {formatCurrency(paymentDetails.remaining, currencySettings)}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(paymentDetails.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {paymentDetails.percentage.toFixed(1)}% paid
                  </p>
                </div>
              </div>
            )}

            {/* Payments List */}
            {associatedPayments.length > 0 ? (
              <div className="space-y-3">
                {associatedPayments.map((payment: any) => (
                  <div key={payment._id} className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{payment.type}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.type === 'Refund' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}>
                            {payment.method}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {format(new Date(payment.createdAt), 'PPP')}
                        </p>
                        {payment.note && (
                          <p className="text-sm text-gray-300 mt-1">{payment.note}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="mb-2">
                          <span className={`text-lg font-medium ${
                            payment.type === 'Refund' ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {payment.type === 'Refund' ? '-' : '+'}
                            {formatCurrency(payment.amount, currencySettings)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewPayment(payment)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            View
                          </button>
                          <Link
                            href={`/payments/${payment._id}/edit`}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No payments found for this reservation.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="mt-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Reservation Details</h1>
            <p className="text-gray-400">
              {reservation.client ? 
                `${reservation.client.firstName} ${reservation.client.lastName}` : 
                'No client assigned'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/reservations/${reservation._id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Pencil1Icon className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <Link
              href="/reservations"
              className="inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md text-gray-300 bg-white/10 hover:bg-white/20"
            >
              Back to List
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-white/20">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-lg p-6">
        {renderTabContent()}
      </div>

      {/* Image Hover Popup */}
      {mounted && hoveredImage && createPortal(
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            left: `${hoveredImage.x}px`,
            top: `${hoveredImage.y}px`,
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl p-2 max-w-xs">
            <img
              src={hoveredImage.src}
              alt={hoveredImage.alt}
              className="w-64 h-64 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjEyOCIgeT0iMTI4IiBmaWxsPSIjNkI3Mjg5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIE5vdCBGb3VuZDwvdGV4dD4KPHN2Zz4=';
              }}
            />
            <div className="mt-2 text-center">
              <p className="text-white text-sm font-medium truncate">{hoveredImage.alt}</p>
            </div>
          </div>
        </div>,
                  document.body
        )}

        {/* Add Payment Modal */}
        {showAddPaymentModal && (
          <AddPaymentModal
            isOpen={showAddPaymentModal}
            onClose={() => setShowAddPaymentModal(false)}
            onPaymentAdded={handlePaymentAdded}
            reservationId={reservation._id}
            clientId={reservation.client?._id}
          />
        )}

        {/* View Payment Modal */}
        {showViewPaymentModal && selectedPayment && (
          <ViewPaymentModal
            isOpen={showViewPaymentModal}
            onClose={() => setShowViewPaymentModal(false)}
            payment={selectedPayment}
          />
        )}
      </div>
    </Layout>
  );
}

// Add Payment Modal Component
const AddPaymentModal = ({ 
  isOpen, 
  onClose, 
  onPaymentAdded, 
  reservationId, 
  clientId 
}: {
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
  reservationId: string;
  clientId?: string;
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'Cash',
    paymentType: 'Advance',
    reference: '',
    note: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return [];

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploadDir', 'uploads/payment');

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (data.success) {
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            url: data.path,
          });
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }

    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload files first
      const attachments = await uploadFiles();

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          client: clientId,
          reservation: reservationId,
          attachments,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        onPaymentAdded();
      } else {
        alert('Failed to create payment: ' + data.message);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Add Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Check">Check</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Payment Type
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Advance">Advance</option>
                <option value="Security">Security Deposit</option>
                <option value="Final">Final Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Reference
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({...formData, reference: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Note
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-white">{file.name}</span>
                        <span className="text-xs text-gray-400">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              >
                {loading || uploading ? 'Creating...' : 'Create Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// View Payment Modal Component
const ViewPaymentModal = ({ 
  isOpen, 
  onClose, 
  payment 
}: {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
}) => {
  const currencySettings = useSelector((state: RootState) => state.settings);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Payment Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
                         <div>
               <label className="block text-sm font-medium text-gray-400">Amount</label>
               <p className="text-white font-medium">{formatCurrency(payment.amount, currencySettings)}</p>
             </div>

            <div>
              <label className="block text-sm font-medium text-gray-400">Payment Method</label>
              <p className="text-white">{payment.paymentMethod}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400">Payment Type</label>
              <p className="text-white">{payment.paymentType}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400">Payment Date</label>
              <p className="text-white">{format(new Date(payment.paymentDate), 'PPP')}</p>
            </div>

            {payment.reference && (
              <div>
                <label className="block text-sm font-medium text-gray-400">Reference</label>
                <p className="text-white">{payment.reference}</p>
              </div>
            )}

            {payment.note && (
              <div>
                <label className="block text-sm font-medium text-gray-400">Note</label>
                <p className="text-white">{payment.note}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400">Created</label>
              <p className="text-white">{format(new Date(payment.createdAt), 'PPP')}</p>
            </div>

            {payment.attachments && payment.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-400">Attachments</label>
                <div className="space-y-1 mt-1">
                  {payment.attachments.map((attachment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 p-2 rounded">
                      <span className="text-white text-sm">{attachment.name}</span>
                      <a
                        href={`/api/uploads/${attachment.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 