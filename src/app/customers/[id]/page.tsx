'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import { 
  ArrowLeftIcon, 
  FileIcon,
  EyeOpenIcon,
  DownloadIcon,
  Cross2Icon
} from '@radix-ui/react-icons';
import Layout from '@/components/Layout';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address: string;
  idNumber: string;
  weddingDate?: string;
  weddingTime?: string;
  weddingLocation?: string;
  weddingCity: string;
  whatsapp?: string;
  type: 'Client' | 'Prospect';
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{
    name: string;
    size: number;
    link: string;
  }>;
}

interface IAttachment {
  name: string;
  size: number;
  link: string;
}

interface Reservation {
  _id: string;
  items: Array<{
    _id: string;
    name: string;
    primaryPhoto?: string;
  }>;
  createdAt: string;
  service?: string;
  status?: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

interface Payment {
  _id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

// CustomerHeader Component
const CustomerHeader = ({ title, onBack, onEdit, showEditButton = true }: {
  title: string;
  onBack: () => void;
  onEdit: () => void;
  showEditButton?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button
        onClick={onBack}
        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
      </button>
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-gray-300">View and manage customer information</p>
      </div>
    </div>
    {showEditButton && (
      <button
        onClick={onEdit}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        Edit Customer
      </button>
    )}
  </div>
);

// TabButton Component
const TabButton = ({ active, children, onClick }: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-gray-400 hover:text-white'
    }`}
  >
    {children}
  </button>
);

// CustomerTabs Component
const CustomerTabs = ({ activeTab, onTabChange }: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) => {
  const tabs = [
    { id: 'details', label: 'Customer Details' },
    { id: 'reservations', label: 'Reservations' },
    { id: 'payments', label: 'Payments' },
    { id: 'attachments', label: 'Attachments' },
  ];

  return (
    <div className="border-b border-white/20">
      <div className="flex space-x-8 px-6">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>
    </div>
  );
};

// CustomerDetails Component
const CustomerDetails = ({ customer }: { customer: Customer }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-400">Full Name</label>
        <p className="text-white">{customer.firstName} {customer.lastName}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Email</label>
        <p className="text-white">{customer.email || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Phone</label>
        <p className="text-white">{customer.phone}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">WhatsApp</label>
        <p className="text-white">{customer.whatsapp || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Type</label>
        <p className="text-white">{customer.type}</p>
      </div>
    </div>
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-400">Address</label>
        <p className="text-white">{customer.address}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">CIN/Passport ID</label>
        <p className="text-white">{customer.idNumber}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Wedding Date</label>
        <p className="text-white">{customer.weddingDate ? new Date(customer.weddingDate).toLocaleDateString() : 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Wedding Time</label>
        <p className="text-white">{customer.weddingTime || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Wedding Location</label>
        <p className="text-white">{customer.weddingLocation || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-400">Wedding City</label>
        <p className="text-white">{customer.weddingCity}</p>
      </div>
    </div>
  </div>
);

// CustomerReservations Component
const CustomerReservations = ({ reservations }: { reservations: Reservation[] }) => {
  if (!reservations || reservations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No reservations found for this customer.</p>
      </div>
    );
  }

  const constructImageUrl = (primaryPhoto: string) => {
    if (!primaryPhoto) return '';
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
    
    // Handle different possible primaryPhoto formats
    if (primaryPhoto.startsWith('http')) {
      return primaryPhoto; // Already a full URL
    }
    
    // If the path starts with /api/uploads, use it as is
    if (primaryPhoto.startsWith('/api/uploads')) {
      return primaryPhoto;
    }
    // If the path starts with /, add /api/uploads prefix
    if (primaryPhoto.startsWith('/')) {
      return `${backendUrl}/api/uploads/${primaryPhoto}`;
    }
    // Otherwise, add both /api/uploads/ prefix
    return `${backendUrl}/api/uploads/${primaryPhoto}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/20">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Id
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Items
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Service
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {reservations.map((reservation, index) => {
            if (!reservation || !reservation.items || reservation.items.length === 0) {
              return (
                <tr key={reservation?._id || index} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400" colSpan={5}>
                    No items found for this reservation
                  </td>
                </tr>
              );
            }

            const mainItem = reservation.items[0];
            const imageUrl = constructImageUrl(mainItem?.primaryPhoto || '');
            
            return (
              <tr key={reservation._id} className="hover:bg-white/5">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  <div className="flex items-center gap-3">
                    {mainItem?.primaryPhoto ? (
                      <div className="relative h-10 w-10">
                        <Image
                          src={imageUrl}
                          alt={mainItem?.name || 'Item'}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => {
                            // Replace image with fallback icon on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        {/* Fallback icon if image fails */}
                        <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-lg" 
                             style={{ display: 'none' }}>
                          <FileIcon className="h-5 w-5 text-white/60" />
                        </div>
                      </div>
                    ) : (
                      // Show fallback when no primaryPhoto exists
                      <div className="h-10 w-10 flex items-center justify-center bg-white/10 rounded-lg">
                        <FileIcon className="h-5 w-5 text-white/60" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-white text-sm">
                        {mainItem?.name || 'Unknown Item'}
                      </span>
                      {reservation.items.length > 1 && (
                        <span className="text-gray-400 text-xs">
                          +{reservation.items.length - 1} more items
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {reservation.createdAt ? reservation.createdAt.split('T')[0] : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {reservation.createdAt ? reservation.createdAt.split('T')[1]?.split('.')[0] : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {reservation.service || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {reservation.status || 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// CustomerPayments Component
const CustomerPayments = ({ payments }: { payments: Payment[] }) => {
  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No payments found for this customer.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/20">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Id
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Method
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {payments.map((payment, index) => {
            if (!payment) {
              return (
                <tr key={index} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400" colSpan={3}>
                    Payment data not available
                  </td>
                </tr>
              );
            }

            return (
              <tr key={payment._id || index} className="hover:bg-white/5">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  #{index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {payment.paymentDate ? payment.paymentDate.split('T')[0] : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {payment.amount ? formatCurrency(payment.amount) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {payment.paymentMethod || 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// CustomerAttachments Component
const CustomerAttachments = ({ attachments }: { attachments: IAttachment[] }) => {
  const [previewFile, setPreviewFile] = useState<{ file: IAttachment; url: string; type: string } | null>(null);

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No attachments found for this customer.</p>
      </div>
    );
  }

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['txt', 'md'].includes(extension)) {
      return 'text';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'document';
    }
    return 'other';
  };

  const handlePreview = (file: IAttachment) => {
    const fileType = getFileType(file.name);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
    const url = file.link.startsWith('http') ? file.link : `${backendUrl}/api/uploads/${file.link}`;
    
    console.log('🖼️ Preview URL:', url);
    console.log('🖼️ File type:', fileType);
    console.log('🖼️ Original file.link:', file.link);
    
    setPreviewFile({ file, url, type: fileType });
  };

  const handleDownload = (file: IAttachment) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
    const fullUrl = file.link.startsWith('http') ? file.link : `${backendUrl}/api/uploads/${file.link}`;
    
    // Create a temporary link element to force download
    const downloadLink = document.createElement('a');
    downloadLink.href = fullUrl;
    downloadLink.download = file.name || file.link.split('/').pop() || 'download';
    downloadLink.target = '_blank'; // Add target blank as fallback
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    const { file, url, type } = previewFile;

    switch (type) {
      case 'image':
        return (
          <div className="relative max-w-full max-h-[80vh] overflow-auto">
            <Image
              src={url}
              alt={file.name}
              width={800}
              height={600}
              className="max-w-full h-auto object-contain"
              onError={(e) => {
                console.error('❌ Failed to load image:', url);
                console.error('❌ Image error event:', e);
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', url);
              }}
            />
          </div>
        );
      
      case 'pdf':
        return (
          <div className="w-full h-[80vh]">
            <iframe
              src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-0 rounded-lg"
              title={file.name}
              onError={() => {
                console.error('PDF failed to load:', url);
              }}
            />
          </div>
        );
      
      case 'text':
        return (
          <div className="max-w-full max-h-[80vh] overflow-auto bg-gray-900 p-4 rounded">
            <iframe
              src={url}
              className="w-full h-96 border-0 bg-white"
              title={file.name}
            />
          </div>
        );
      
      default:
        return (
          <div className="text-center p-8">
            <FileIcon className="h-16 w-16 text-white/60 mx-auto mb-4" />
            <p className="text-white mb-4">Preview not available for this file type</p>
            <p className="text-gray-400 text-sm mb-4">{file.name}</p>
            <button
              type="button"
              onClick={() => handleDownload(file)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Download to View
            </button>
          </div>
        );
    }
  };

  // Separate images from documents
  const imageFiles = attachments.filter(file => getFileType(file.name) === 'image');
  const documentFiles = attachments.filter(file => getFileType(file.name) !== 'image');

  return (
    <div className="space-y-8">
      {/* Images Section - Thumbnail Grid */}
      {imageFiles.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-white mb-6 flex items-center">
            <span className="mr-2">🖼️</span>
            Images ({imageFiles.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {imageFiles.map((file, index) => {
              const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
              const imageUrl = file.link.startsWith('http') ? file.link : `${backendUrl}/api/uploads/${file.link}`;
              
              return (
                <div key={index} className="relative group">
                  <div className="aspect-square overflow-hidden rounded-lg bg-white/5 border border-white/10">
                    <Image
                      src={imageUrl}
                      alt={file.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => handlePreview(file)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    {/* Fallback for failed images */}
                    <div 
                      className="w-full h-full flex items-center justify-center bg-white/10"
                      style={{ display: 'none' }}
                    >
                      <FileIcon className="h-8 w-8 text-white/60" />
                    </div>
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        title="Preview"
                      >
                        <EyeOpenIcon className="h-4 w-4 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        title="Download"
                      >
                        <DownloadIcon className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                  
                  {/* File name tooltip */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Section - List with Preview Buttons */}
      {documentFiles.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-white mb-6 flex items-center">
            <span className="mr-2">📄</span>
            Documents ({documentFiles.length})
          </h4>
          <div className="space-y-3">
            {documentFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <FileIcon className="h-6 w-6 text-white/60" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white truncate max-w-[300px]">
                      {file.name}
                    </span>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="capitalize">{getFileType(file.name)} file</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePreview(file)}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-md transition-colors flex items-center space-x-2"
                    title="Preview"
                  >
                    <EyeOpenIcon className="h-4 w-4" />
                    <span className="text-sm">Preview</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="p-2 hover:bg-white/10 rounded-md transition-colors"
                    title="Download"
                  >
                    <DownloadIcon className="h-4 w-4 text-white/60 hover:text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">
                {previewFile.file.name}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewFile.file)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Download"
                >
                  <DownloadIcon className="h-4 w-4 text-white/60 hover:text-white" />
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Close"
                >
                  <Cross2Icon className="h-4 w-4 text-white/60 hover:text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 overflow-auto">
              {renderPreviewContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main ViewCustomerPage Component
const ViewCustomerPage = () => {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch customer details
        const customerResponse = await axios.get(`/api/customers/${customerId}`);
        if (customerResponse.data.success) {
          setCustomer(customerResponse.data.customer);
        } else {
          setError('Customer not found');
          return;
        }

        // Fetch reservations
        try {
          const reservationsResponse = await axios.get(`/api/reservations/by-customer/${customerId}`);
          if (reservationsResponse.data.success) {
            setReservations(reservationsResponse.data.reservations);
          }
        } catch {
          console.log('No reservations found for this customer');
        }

        // Fetch payments
        try {
          const paymentsResponse = await axios.get(`/api/payments/by-customer/${customerId}`);
          if (paymentsResponse.data.success) {
            setPayments(paymentsResponse.data.payments);
          }
        } catch {
          console.log('No payments found for this customer');
        }

      } catch (error) {
        console.error('Error fetching customer data:', error);
        setError('Failed to load customer data');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const handleBack = () => {
    router.push('/customers');
  };

  const handleEdit = () => {
    router.push(`/customers/${customerId}/edit`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <CustomerDetails customer={customer!} />;
      case 'reservations':
        return <CustomerReservations reservations={reservations} />;
      case 'payments':
        return <CustomerPayments payments={payments} />;
      case 'attachments':
        return <CustomerAttachments attachments={customer?.attachments || []} />;
      default:
        return <CustomerDetails customer={customer!} />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-2">Customer Not Found</h2>
          <p className="text-gray-400 mb-4">The customer you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <CustomerHeader
          title="Customer Details"
          onBack={handleBack}
          onEdit={handleEdit}
        />
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20">
          <CustomerTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ViewCustomerPage; 