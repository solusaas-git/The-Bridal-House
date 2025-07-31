'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import axios from 'axios';
import Image from 'next/image';
import {
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
  EyeOpenIcon,
  DownloadIcon,
  Cross2Icon,
  FileIcon,
  CalendarIcon,
} from '@radix-ui/react-icons';
import Layout from '@/components/Layout';
import { formatCurrency } from '@/utils/currency';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';

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
  eventDate: Date;
  eventTime?: string;
  eventLocation?: string;
  total?: number;
  paid?: number;
  remaining?: number;
  pickupDate?: Date;
  returnDate?: Date;
}

interface Attachment {
  name: string;
  size: number;
  url?: string;
  link?: string; // Some attachments might use 'link' instead of 'url'
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
  attachments: Attachment[];
}

// Payment Header Component
const PaymentHeader = ({ payment, onEdit, onDelete, currencySettings }: { 
  payment: Payment; 
  onEdit: () => void; 
  onDelete: () => Promise<void>; 
  currencySettings: any;
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Payment #{payment._id.slice(-6).toUpperCase()}</h1>
              <p className="text-gray-300">
                {payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : 'Unknown Customer'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Amount</h3>
              <p className="text-xl font-semibold text-white">
                {payment.amount ? formatCurrency(payment.amount, currencySettings) : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Method</h3>
              <p className="text-lg text-white capitalize">{payment.paymentMethod || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                payment.paymentType === 'Final' ? 'bg-green-100 text-green-800' :
                payment.paymentType === 'Advance' ? 'bg-yellow-100 text-yellow-800' :
                payment.paymentType === 'Security' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {payment.paymentType}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Pencil1Icon className="h-4 w-4 mr-2" />
            Edit
          </button>
          <ApprovalHandler
            actionType="delete"
            resourceType="payment"
            resourceId={payment._id}
            resourceName={`Payment #${payment._id.slice(-6).toUpperCase()}`}
            originalData={payment}
            onDirectAction={onDelete}
            onSuccess={() => {
              toast.success('Payment deleted successfully');
              window.location.href = '/payments';
            }}
          >
            <button
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </button>
          </ApprovalHandler>
        </div>
      </div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-white/20 text-white'
        : 'text-gray-300 hover:text-white hover:bg-white/10'
    }`}
  >
    {children}
  </button>
);

// Payment Tabs Component
const PaymentTabs = ({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: string; 
  onTabChange: (tab: string) => void; 
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
    <div className="flex space-x-2">
      <TabButton active={activeTab === 'details'} onClick={() => onTabChange('details')}>
        Details
      </TabButton>
      <TabButton active={activeTab === 'attachments'} onClick={() => onTabChange('attachments')}>
        Attachments
      </TabButton>
    </div>
  </div>
);

// Payment Details Component
const PaymentDetails = ({ payment }: { payment: Payment }) => {
  const currencySettings = useSelector((state: RootState) => state.settings);
  
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Payment Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400">Customer</label>
            <p className="text-white mt-1">
              {payment.client ? `${payment.client.firstName} ${payment.client.lastName}` : 'N/A'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Amount</label>
            <p className="text-white mt-1">{payment.amount ? formatCurrency(payment.amount, currencySettings) : 'N/A'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Payment Method</label>
            <p className="text-white mt-1 capitalize">{payment.paymentMethod || 'N/A'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Payment Type</label>
            <p className="text-white mt-1 capitalize">{payment.paymentType || 'N/A'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Reference</label>
            <p className="text-white mt-1">{payment.reference || 'No reference provided'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400">Payment Date</label>
            <p className="text-white mt-1">
              {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd/MM/yyyy HH:mm') : 'N/A'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Description</label>
            <p className="text-white mt-1">{payment.note || 'No description provided'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Created At</label>
            <p className="text-white mt-1">
              {/* Assuming payment object has createdAt and updatedAt */}
              {/* For now, using a placeholder or removing if not available */}
              {/* {format(new Date(payment.createdAt), 'dd/MM/yyyy HH:mm')} */}
              N/A
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Last Updated</label>
            <p className="text-white mt-1">
              {/* Assuming payment object has createdAt and updatedAt */}
              {/* For now, using a placeholder or removing if not available */}
              {/* {format(new Date(payment.updatedAt), 'dd/MM/yyyy HH:mm')} */}
              N/A
            </p>
          </div>

          {/* Assuming payment object has createdBy */}
          {/* {payment.createdBy && (
            <div>
              <label className="text-sm font-medium text-gray-400">Created By</label>
              <p className="text-white mt-1">{payment.createdBy.username}</p>
            </div>
          )} */}

          {/* Reservation Details */}
          <div className="space-y-1">
            <p className="text-sm text-gray-400">Reservation</p>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-white/60" />
              <p className="text-white">
                {payment.reservation ? `#${payment.reservation.reservationNumber || payment.reservation._id.slice(-6)}` : 'No reservation'}
              </p>
            </div>
            {payment.reservation && (
              <>
                <div className="text-sm text-gray-400 mt-1">
                  {payment.reservation.eventDate && new Date(payment.reservation.eventDate).toLocaleDateString()}
                  {payment.reservation.eventTime && ` at ${payment.reservation.eventTime}`}
                </div>
                {payment.reservation.eventLocation && (
                  <div className="text-sm text-gray-400">{payment.reservation.eventLocation}</div>
                )}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Total</div>
                    <div className="text-white">{payment.reservation.total ? formatCurrency(payment.reservation.total, currencySettings) : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Paid</div>
                    <div className="text-green-500">{formatCurrency(payment.reservation.paid || 0, currencySettings)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Remaining</div>
                    <div className="text-yellow-500">{payment.reservation.remaining ? formatCurrency(payment.reservation.remaining, currencySettings) : 'N/A'}</div>
                  </div>
                </div>
                {payment.reservation.pickupDate && payment.reservation.returnDate && (
                  <div className="mt-2 text-xs text-gray-400">
                    {new Date(payment.reservation.pickupDate).toLocaleDateString()} - {new Date(payment.reservation.returnDate).toLocaleDateString()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Payment Attachments Component
const PaymentAttachments = ({ attachments }: { attachments: Attachment[] }) => {
  const [previewFile, setPreviewFile] = useState<{ file: Attachment; url: string; type: string } | null>(null);
  


  const getFileType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (['pdf'].includes(extension || '')) return 'pdf';
    if (['doc', 'docx'].includes(extension || '')) return 'document';
    if (['txt'].includes(extension || '')) return 'text';
    return 'file';
  };

  const handlePreview = (file: Attachment) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
    // Handle both 'url' and 'link' fields and add null checks
    let fileUrl = file.url || (file as any).link;
    
    // If no URL field, try to construct one from the filename (legacy fallback)
    if (!fileUrl && file.name) {
      console.warn('⚠️ Attachment missing URL field, attempting fallback:', file);
      fileUrl = `uploads/payment/${file.name}`;
    }
    
    if (!fileUrl) {
      toast.error('File URL not found - attachment data is incomplete');
      console.error('❌ Attachment missing URL:', file);
      return;
    }
    
    const finalUrl = fileUrl.startsWith('http') ? fileUrl : `${backendUrl}/api/uploads/${fileUrl}`;
    const fileType = getFileType(file.name);
    
    setPreviewFile({ file, url: finalUrl, type: fileType });
  };

  const handleDownload = (file: Attachment) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
    // Handle both 'url' and 'link' fields and add null checks
    let fileUrl = file.url || (file as any).link;
    
    // If no URL field, try to construct one from the filename (legacy fallback)
    if (!fileUrl && file.name) {
      console.warn('⚠️ Attachment missing URL field, attempting fallback:', file);
      fileUrl = `uploads/payment/${file.name}`;
    }
    
    if (!fileUrl) {
      toast.error('File URL not found - attachment data is incomplete');
      console.error('❌ Attachment missing URL:', file);
      return;
    }
    
    const finalUrl = fileUrl.startsWith('http') ? fileUrl : `${backendUrl}/api/uploads/${fileUrl}`;
    
    const link = document.createElement('a');
    link.href = finalUrl;
    link.download = file.name;
    link.target = '_blank'; // Add target blank as fallback
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    const { url, type } = previewFile;

    switch (type) {
      case 'image':
        return (
          <Image
            src={url}
            alt={previewFile.file.name}
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              console.error('Image load error:', e);
              toast.error('Failed to load image');
              closePreview();
            }}
          />
        );
      case 'pdf':
        return (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full border-none rounded-lg"
            title={previewFile.file.name}
            onError={() => {
              console.error('PDF failed to load:', url);
            }}
          />
        );
      case 'text':
        return (
          <iframe
            src={url}
            className="w-full h-full border-none bg-white"
            title={previewFile.file.name}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileIcon className="h-16 w-16 text-white/60 mx-auto mb-4" />
              <p className="text-white mb-4">Preview not available for this file type</p>
              <button
                onClick={() => handleDownload(previewFile.file)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Download File
              </button>
            </div>
          </div>
        );
    }
  };

  // Filter attachments that have valid URLs or can use fallback
  const validAttachments = attachments.filter(file => 
    file.url || (file as any).link || (file.name && typeof file.name === 'string')
  );
  
  const imageFiles = validAttachments.filter(file => getFileType(file.name) === 'image');
  const documentFiles = validAttachments.filter(file => getFileType(file.name) !== 'image');

  if (!attachments || attachments.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
        <div className="text-center py-12">
          <FileIcon className="h-12 w-12 text-white/40 mx-auto mb-4" />
          <p className="text-gray-400">No attachments found</p>
        </div>
      </div>
    );
  }

  if (validAttachments.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
        <div className="text-center py-12">
          <FileIcon className="h-12 w-12 text-white/40 mx-auto mb-4" />
          <p className="text-gray-400">Attachments found but cannot be accessed</p>
          <p className="text-xs text-gray-500 mt-2">
            {attachments.length} attachment(s) exist but have incomplete file URL data
          </p>
          <div className="mt-4 space-y-2">
            {attachments.map((file, index) => (
              <div key={index} className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs">
                <div className="text-red-400">📄 {file.name}</div>
                <div className="text-red-300/60">File reference exists but URL missing</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
      <div className="space-y-8">
        {imageFiles.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-white mb-6 flex items-center">
              <span className="mr-2">🖼️</span>
              Images ({imageFiles.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {imageFiles.map((file, index) => {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055';
                // Handle both 'url' and 'link' fields and add null checks
                let fileUrl = file.url || (file as any).link;
                
                // If no URL field, try to construct one from the filename (legacy fallback)
                if (!fileUrl && file.name) {
                  console.warn('⚠️ Image attachment missing URL field, attempting fallback:', file);
                  fileUrl = `uploads/payment/${file.name}`;
                }
                
                if (!fileUrl) return null; // Skip if still no URL
                
                const imageUrl = fileUrl.startsWith('http') ? fileUrl : `${backendUrl}/api/uploads/${fileUrl}`;
                
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
                          console.error('Image load error for:', file.name, 'URL:', imageUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-icon') as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                              // Add text indicator for broken image
                              const text = fallback.querySelector('.broken-text') as HTMLElement;
                              if (!text) {
                                const brokenText = document.createElement('div');
                                brokenText.className = 'broken-text text-xs text-red-400 mt-1 text-center';
                                brokenText.textContent = 'File not found';
                                fallback.appendChild(brokenText);
                              }
                            }
                          }
                        }}
                      />
                      <div className="fallback-icon w-full h-full flex items-center justify-center bg-white/10" style={{ display: 'none' }}>
                        <FileIcon className="h-8 w-8 text-white/60" />
                      </div>
                    </div>
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
                    <div className="mt-2">
                      <p className="text-xs text-gray-400 truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={closePreview}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <Cross2Icon className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                  <p className="text-white text-sm font-medium">{previewFile.file.name}</p>
                  <p className="text-gray-300 text-xs">
                    {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="w-full h-full flex items-center justify-center p-8">
                {renderPreviewContent()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Payment View Page
const PaymentViewPage = () => {
  const params = useParams();
  const router = useRouter();
  const currencySettings = useSelector((state: RootState) => state.settings);
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  const fetchPayment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/payments/${paymentId}`);
      if (response.data.success) {
        
        setPayment(response.data.payment);
      } else {
        toast.error('Payment not found');
        router.push('/payments');
      }
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      toast.error('Failed to load payment details');
      router.push('/payments');
    } finally {
      setLoading(false);
    }
  }, [paymentId, router]);

  useEffect(() => {
    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId, fetchPayment]);

  const handleEdit = () => {
    router.push(`/payments/${paymentId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/payments/${paymentId}`);
      toast.success('Payment deleted successfully');
      router.push('/payments');
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const handleBack = () => {
    router.push('/payments');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading payment data...</div>
        </div>
      </Layout>
    );
  }

  if (!payment) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 text-lg">Payment not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Payments
          </button>
        </div>

        {/* Payment Header */}
              <PaymentHeader
        payment={payment}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currencySettings={currencySettings}
      />

        {/* Tabs */}
        <PaymentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        {activeTab === 'details' && <PaymentDetails payment={payment} />}
        {activeTab === 'attachments' && <PaymentAttachments attachments={payment.attachments || []} />}
      </div>
    </Layout>
  );
};

export default PaymentViewPage; 