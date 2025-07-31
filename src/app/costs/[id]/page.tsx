'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  ArrowLeftIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TagIcon,
  UserIcon,
  PaperClipIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import { RootState } from '@/store/store';
import { canEdit, canDelete } from '@/utils/permissions';
import { formatCurrency } from '@/utils/currency';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';

interface Cost {
  _id: string;
  date: string;
  category?: {
    _id: string;
    name: string;
    color: string;
  };
  amount: number;
  relatedReservation?: {
    _id: string;
    pickupDate: string;
    returnDate: string;
    client?: {
      firstName: string;
      lastName: string;
    };
    items: Array<{
      _id: string;
      name: string;
      primaryPhoto?: string;
      category?: string;
    }>;
  };
  relatedProduct?: {
    _id: string;
    name: string;
    primaryPhoto?: string;
  };
  notes?: string;
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ViewCostPage() {
  const params = useParams();
  const router = useRouter();
  const costId = params.id as string;
  
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const currencySettings = useSelector((state: RootState) => state.settings);
  
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<{name: string; url: string; type: string} | null>(null);
  const [imagePreview, setImagePreview] = useState({
    show: false,
    src: '',
    alt: ''
  });

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    return `/api/uploads/${imagePath}`;
  };

  // Permission checks
  const userCanEdit = canEdit(currentUser, 'costs');
  const userCanDelete = canDelete(currentUser, 'costs');

  useEffect(() => {
    if (costId) {
      fetchCost();
    }
  }, [costId]);

  const fetchCost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/costs/${costId}`);
      console.log('Fetched cost data:', response.data.cost);
      console.log('Attachments:', response.data.cost.attachments);
      setCost(response.data.cost);
    } catch (error: any) {
      console.error('Error fetching cost:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch cost');
      router.push('/costs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!cost) return;
    
    try {
      await axios.delete(`/api/costs/${cost._id}`);
      toast.success('Cost deleted successfully');
      router.push('/costs');
    } catch (error: any) {
      console.error('Error deleting cost:', error);
      toast.error(error.response?.data?.error || 'Failed to delete cost');
      throw error;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (file: { type: string; name: string }) => {
    if (file.type?.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'document';
  };

  const handleFileClick = (attachment: any) => {
    if (getFileType(attachment) === 'image') {
      setImagePreview({
        show: true,
        src: encodeURI(attachment.url),
        alt: attachment.name
      });
    } else {
      // Open file in new tab
      window.open(encodeURI(attachment.url), '_blank');
    }
  };

  const handleDownload = (attachment: any) => {
    // Create a temporary link element to force download
    const downloadLink = document.createElement('a');
    downloadLink.href = encodeURI(attachment.url);
    downloadLink.download = attachment.name || attachment.url.split('/').pop() || 'download';
    downloadLink.target = '_blank'; // Add target blank as fallback
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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

  if (!cost) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-white mb-2">Cost Not Found</h2>
          <p className="text-gray-400 mb-4">The requested cost could not be found.</p>
          <button
            onClick={() => router.push('/costs')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Costs
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Cost Details</h1>
              <p className="text-gray-300">View and manage cost information</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userCanEdit && (
              <button
                onClick={() => router.push(`/costs/${cost._id}/edit`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Edit Cost
              </button>
            )}
            
            {userCanDelete && (
              <ApprovalHandler
                actionType="delete"
                resourceType="cost"
                resourceId={cost._id}
                resourceName={`Cost - ${formatCurrency(cost.amount, currencySettings)}`}
                originalData={cost}
                onDirectAction={handleDelete}
                onSuccess={() => router.push('/costs')}
              >
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
                  Delete
                </button>
              </ApprovalHandler>
            )}
          </div>
        </div>

        {/* Main Content Container */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20">
          {/* Cost Overview Header */}
          <div className="border-b border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {formatCurrency(cost.amount, currencySettings)}
                    </h2>
                    <p className="text-gray-300">
                      {format(new Date(cost.date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {cost.category && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cost.category.color }}
                      />
                      <span className="text-sm text-white font-medium">{cost.category.name}</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-400">
                    Created by {cost.createdBy?.name || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Notes Section */}
                {cost.notes && (
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <DocumentIcon className="h-5 w-5 mr-2 text-blue-400" />
                      Notes
                    </h3>
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{cost.notes}</p>
                  </div>
                )}

                {/* Related Reservation */}
                {cost.relatedReservation && (
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-green-400" />
                      Related Reservation
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Customer</p>
                          <p className="text-white font-medium">
                            {cost.relatedReservation.client ? 
                              `${cost.relatedReservation.client.firstName} ${cost.relatedReservation.client.lastName}` : 
                              'Unknown Customer'
                            }
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/reservations/${cost.relatedReservation?._id}`)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                      
                      {cost.relatedReservation.items && cost.relatedReservation.items.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Reserved Items ({cost.relatedReservation.items.length})</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {cost.relatedReservation.items.map((item: any, index: number) => {
                              console.log('Product item:', item);
                              console.log('Primary photo URL:', item.primaryPhoto);
                              return (
                                <div key={index} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                                  {item.primaryPhoto && (
                                    <img
                                      src={getImageUrl(item.primaryPhoto)}
                                      alt={item.name}
                                      className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setImagePreview({
                                        show: true,
                                        src: getImageUrl(item.primaryPhoto),
                                        alt: item.name
                                      })}
                                      onError={(e) => {
                                        console.log('Image failed to load:', item.primaryPhoto);
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{item.name || 'Unknown Product'}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Related Product */}
                {cost.relatedProduct && (
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TagIcon className="h-5 w-5 mr-2 text-yellow-400" />
                      Related Product
                    </h3>
                    
                    <div className="space-y-4">
                      {cost.relatedProduct.primaryPhoto && (
                        <div className="w-full h-48 bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={getImageUrl(cost.relatedProduct.primaryPhoto)}
                            alt={cost.relatedProduct.name || 'Product'}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (cost.relatedProduct?.primaryPhoto) {
                                setImagePreview({
                                  show: true,
                                  src: getImageUrl(cost.relatedProduct.primaryPhoto),
                                  alt: cost.relatedProduct.name || 'Product'
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">Product Name</p>
                          <p className="text-white font-medium">{cost.relatedProduct.name || 'Unknown Product'}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/products/${cost.relatedProduct?._id}`)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Attachments */}
                {cost.attachments && cost.attachments.length > 0 && (
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <PaperClipIcon className="h-5 w-5 mr-2 text-purple-400" />
                      Attachments ({cost.attachments.length})
                    </h3>
                    
                    <div className="space-y-3">
                      {cost.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors group"
                        >
                          <div className="flex-shrink-0">
                            {getFileType(attachment) === 'image' ? (
                              <img
                                src={encodeURI(attachment.url)}
                                alt={attachment.name}
                                className="w-12 h-12 object-cover rounded cursor-pointer"
                                onClick={() => handleFileClick(attachment)}
                              />
                            ) : (
                              <div 
                                className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center cursor-pointer"
                                onClick={() => handleFileClick(attachment)}
                              >
                                <PaperClipIcon className="h-6 w-6 text-gray-300" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{attachment.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleFileClick(attachment)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                              title="Preview"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(attachment)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Created</p>
                        <p className="text-gray-400 text-sm">Created: {format(new Date(cost.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Last Updated</p>
                        <p className="text-gray-400 text-sm">Updated: {format(new Date(cost.updatedAt), 'dd/MM/yyyy HH:mm')}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">Cost ID</p>
                        <p className="text-white text-sm font-mono">
                          #{cost._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Preview Modal */}
        {imagePreview.show && (
          <div 
            className="fixed top-0 left-0 w-screen h-screen bg-black/90 backdrop-blur-lg flex items-center justify-center p-4"
            onClick={() => setImagePreview({ show: false, src: '', alt: '' })}
            style={{ 
              zIndex: 999999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
          >
            <div 
              className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl flex flex-col"
              style={{
                width: '90vw',
                height: '90vh',
                maxWidth: '90vw',
                maxHeight: '90vh'
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-white font-medium text-sm truncate px-4">{imagePreview.alt}</h3>
                </div>
                <button
                  onClick={() => setImagePreview({ show: false, src: '', alt: '' })}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="Close"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400 group-hover:text-white" />
                </button>
              </div>

              {/* Image Container */}
              <div className="relative bg-black/20 rounded-xl overflow-hidden border border-white/10 flex-1 flex items-center justify-center min-h-0">
                <img
                  src={imagePreview.src}
                  alt={imagePreview.alt}
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <PaperClipIcon className="h-4 w-4" />
                  <span>Attachment Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload({ url: imagePreview.src, name: imagePreview.alt })}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 