'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
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
import { Cross2Icon, FileIcon, DownloadIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import { RootState } from '@/store/store';
import { canEdit, canDelete } from '@/utils/permissions';
import { formatCurrency } from '@/utils/currency';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('costs');
  const { t: tCommon } = useTranslation('common');
  
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const currencySettings = useSelector((state: RootState) => state.settings);
  
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ file: any; url: string; type: string } | null>(null);

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
      toast.error(error.response?.data?.error || t('details.messages.loadFailed'));
      router.push('/costs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!cost) return;
    
    try {
      await axios.delete(`/api/costs/${cost._id}`);
      toast.success(t('details.messages.deleteSuccess'));
      router.push('/costs');
    } catch (error: any) {
      console.error('Error deleting cost:', error);
      toast.error(error.response?.data?.error || t('details.messages.deleteFailed'));
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

  const handleFileClick = (attachment: any) => {
    const fileName = attachment.name;
    const fileType = getFileType(fileName);
    const url = attachment.url.startsWith('http') ? attachment.url : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055'}/api/uploads/${attachment.url}`;
    
    setPreviewFile({ file: attachment, url, type: fileType });
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    const { file, url, type } = previewFile;
    const fileName = file.name;

    switch (type) {
      case 'image':
        return (
          <div className="relative max-w-full max-h-[80vh] overflow-auto">
            <img
              src={url}
              alt={fileName}
              className="max-w-full h-auto object-contain"
              onError={() => {
                console.error('Failed to load image:', url);
              }}
            />
          </div>
        );
      
      case 'pdf':
        return (
          <div className="w-full h-[80vh]">
            <iframe
              src={`${url}#scrollbar=1&zoom=page-fit`}
              className="w-full h-full border-0"
              title={fileName}
            />
          </div>
        );
      
      case 'text':
        return (
          <div className="max-w-full max-h-[80vh] overflow-auto bg-gray-900 p-4 rounded">
            <iframe
              src={url}
              className="w-full h-96 border-0 bg-white"
              title={fileName}
            />
          </div>
        );
      
      default:
        return (
          <div className="text-center p-8">
            <FileIcon className="h-16 w-16 text-white/60 mx-auto mb-4" />
            <p className="text-white mb-4">{t('details.attachments.previewNotAvailable')}</p>
            <p className="text-gray-400 text-sm mb-4">{fileName}</p>
            <button
              type="button"
              onClick={() => handleDownload(file)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              {t('details.attachments.downloadToView')}
            </button>
          </div>
        );
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
          <h2 className="text-xl font-semibold text-white mb-2">{t('details.costNotFound')}</h2>
          <p className="text-gray-400 mb-4">{tCommon('requestedItemNotFound')}</p>
          <button
            onClick={() => router.push('/costs')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {t('details.backToCosts')}
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
              <h1 className="text-2xl font-bold text-white">{t('details.title')}</h1>
              <p className="text-gray-300">{tCommon('viewAndManage')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userCanEdit && (
              <button
                onClick={() => router.push(`/costs/${cost._id}/edit`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                {t('details.editCost')}
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
                  {t('details.deleteCost')}
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
                    {t('details.info.createdBy')} {cost.createdBy?.name || tCommon('unknown')}
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
                      {t('details.info.notes')}
                    </h3>
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{cost.notes}</p>
                  </div>
                )}

                {/* Related Reservation */}
                {cost.relatedReservation && (
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-green-400" />
                      {t('details.related.reservation')}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">{t('details.related.client')}</p>
                          <p className="text-white font-medium">
                            {cost.relatedReservation.client ? 
                              `${cost.relatedReservation.client.firstName} ${cost.relatedReservation.client.lastName}` : 
                              tCommon('unknown')
                            }
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/reservations/${cost.relatedReservation?._id}`)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          {tCommon('viewDetails')}
                        </button>
                      </div>
                      
                      {cost.relatedReservation.items && cost.relatedReservation.items.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">{t('details.related.items')} ({cost.relatedReservation.items.length})</p>
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
                                      onClick={() => setPreviewFile({
                                        file: { name: item.name, size: 0, type: 'image' },
                                        url: getImageUrl(item.primaryPhoto),
                                        type: 'image'
                                      })}
                                      onError={(e) => {
                                        console.log('Image failed to load:', item.primaryPhoto);
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{item.name || tCommon('unknownProduct')}</p>
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
                      {t('details.related.product')}
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
                                setPreviewFile({
                                  file: { name: cost.relatedProduct.name || 'Product', size: 0, type: 'image' },
                                  url: getImageUrl(cost.relatedProduct.primaryPhoto),
                                  type: 'image'
                                });
                              }
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-400">{tCommon('productName')}</p>
                          <p className="text-white font-medium">{cost.relatedProduct.name || tCommon('unknownProduct')}</p>
                        </div>
                        <button
                          onClick={() => router.push(`/products/${cost.relatedProduct?._id}`)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          {tCommon('viewDetails')}
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
                      {t('details.attachments.title')} ({cost.attachments.length})
                    </h3>
                    
                    <div className="space-y-3">
                      {cost.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors group"
                        >
                          <div className="flex-shrink-0">
                            {getFileType(attachment.name) === 'image' ? (
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
                              title={t('details.attachments.preview')}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(attachment)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                              title={t('details.attachments.download')}
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
                    {t('details.info.costInfo')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">{t('details.info.createdAt')}</p>
                        <p className="text-gray-400 text-sm">{t('details.info.createdAt')}: {format(new Date(cost.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">{t('details.info.lastUpdated')}</p>
                        <p className="text-gray-400 text-sm">{t('details.info.lastUpdated')}: {format(new Date(cost.updatedAt), 'dd/MM/yyyy HH:mm')}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">{tCommon('id')}</p>
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

        {/* Preview Modal - Rendered as Portal */}
        {previewFile && createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
            <div className={`relative w-full h-full bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden ${
              previewFile.type === 'pdf' 
                ? 'max-w-7xl max-h-[95vh]' 
                : 'max-w-6xl max-h-[90vh]'
            }`}>
              {/* Header with file info and close button */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-black/70 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600/20 p-2 rounded-lg">
                    <FileIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{previewFile.file.name}</p>
                    <p className="text-gray-300 text-xs">
                      {formatFileSize(previewFile.file.size)} • {previewFile.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePreview}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                >
                  <Cross2Icon className="h-6 w-6 text-white" />
                </button>
              </div>
              
              {/* Content area with optimized layout based on file type */}
              <div className={`w-full h-full ${
                previewFile.type === 'pdf'
                  ? 'pt-16 pb-2 px-2' // Minimal padding for PDFs to maximize viewing area
                  : 'pt-16 pb-8 px-8 flex items-center justify-center' // Centered layout for images
              }`}>
                {renderPreviewContent()}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </Layout>
  );
} 