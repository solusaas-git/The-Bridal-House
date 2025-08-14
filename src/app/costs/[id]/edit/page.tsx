'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon,
  ArrowLeftIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Cross2Icon, FileIcon, DownloadIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import { RootState } from '@/store/store';
import { setCostCategories, updateCost } from '@/store/reducers/costSlice';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useTranslation } from 'react-i18next';

interface CostFormData {
  date: string;
  category: string;
  amount: string;
  relatedType: 'reservation' | 'product' | '';
  relatedReservation: string;
  relatedProduct: string;
  notes: string;
}

interface AttachmentFile {
  file: File;
  preview: string;
}

interface ExistingAttachment {
  _id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

interface SearchResult {
  _id: string;
  name?: string;
  customer?: { name: string };
  weddingDate?: string;
  totalAmount?: number;
  pickupDate?: string;
  returnDate?: string;
  primaryPhoto?: string;
  items?: Array<{ 
    _id: string;
    name: string; 
    primaryPhoto?: string;
    category?: string;
  }>;
  client?: { firstName: string; lastName: string; weddingDate?: string };
}

export default function EditCostPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  const costId = params.id as string;
  const { costCategories } = useSelector((state: RootState) => state.cost);
  const { t } = useTranslation('costs');
  const { t: tCommon } = useTranslation('common');

  const [originalData, setOriginalData] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<CostFormData>({
    date: '',
    category: '',
    amount: '',
    relatedType: '',
    relatedReservation: '',
    relatedProduct: '',
    notes: ''
  });

  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([]);
  const [deletedAttachments, setDeletedAttachments] = useState<ExistingAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: any; url: string; type: string } | null>(null);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    return `/api/uploads/${imagePath}`;
  };



  const handleFilePreview = (file: ExistingAttachment | File, isExisting: boolean = true) => {
    let fileName: string;
    let url: string;
    
    if (isExisting) {
      // Existing attachment
      const attachment = file as ExistingAttachment;
      fileName = attachment.name;
      url = attachment.url.startsWith('http') ? attachment.url : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055'}/api/uploads/${attachment.url}`;
    } else {
      // New file
      const fileObj = file as File;
      fileName = fileObj.name;
      url = URL.createObjectURL(fileObj);
    }
    
    const fileType = getFileType(fileName);
    setPreviewFile({ file, url, type: fileType });
  };

  const closePreview = () => {
    if (previewFile?.url && !previewFile.url.startsWith('http')) {
      // Clean up object URL for new files
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    const { file, url, type } = previewFile;
    const fileName = file.name || 'Unknown file';

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
            <p className="text-white mb-4">Preview not available for this file type</p>
            <p className="text-gray-400 text-sm mb-4">{fileName}</p>
            <button
              type="button"
              onClick={() => {
                const downloadUrl = previewFile.url;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                link.click();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Download to View
            </button>
          </div>
        );
    }
  };

  // Compute newData for approval system
  const newData = {
    ...formData,
    existingAttachments,
    newFiles: attachments.map(att => att.file), // Extract File objects from AttachmentFile structure
    deletedAttachments: deletedAttachments
  };

  useEffect(() => {
    fetchCostCategories();
    fetchCost();
  }, [costId]);

  const fetchCost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/costs/${costId}`);
      const cost = response.data.cost;
      
      setOriginalData(cost);
      setFormData({
    date: (()=>{ const d=new Date(cost.date); const yyyy=d.getUTCFullYear(); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}`; })(),
        category: cost.category._id,
        amount: cost.amount.toString(),
        relatedType: cost.relatedReservation ? 'reservation' : (cost.relatedProduct ? 'product' : ''),
        relatedReservation: cost.relatedReservation?._id || '',
        relatedProduct: cost.relatedProduct?._id || '',
        notes: cost.notes || ''
      });
      
      setExistingAttachments(cost.attachments || []);

      // Set selected item for display
      if (cost.relatedReservation) {
        setSelectedItem({
          _id: cost.relatedReservation._id,
          client: cost.relatedReservation.client,
          weddingDate: cost.relatedReservation.client?.weddingDate,
          pickupDate: cost.relatedReservation.pickupDate,
          returnDate: cost.relatedReservation.returnDate,
          items: cost.relatedReservation.items
        });
      } else if (cost.relatedProduct) {
        setSelectedItem({
          _id: cost.relatedProduct._id,
          name: cost.relatedProduct.name,
          primaryPhoto: cost.relatedProduct.primaryPhoto
        });
      }
    } catch (error: unknown) {
      console.error('Error fetching cost:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch cost';
      toast.error(errorMessage);
      router.push('/costs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCostCategories = async () => {
    try {
      const response = await axios.get('/api/cost-categories');
      dispatch(setCostCategories(response.data.costCategories));
    } catch (error) {
      console.error('Error fetching cost categories:', error);
    }
  };

  // Search for reservations or products based on selected type
  const handleSearch = async (query: string) => {
    if (!query.trim() || !formData.relatedType) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const endpoint = formData.relatedType === 'reservation' ? '/api/reservations' : '/api/products';
      console.log('Searching:', endpoint, 'with query:', query);
      
      const response = await axios.get(endpoint, {
        params: {
          search: query,
          limit: 5,
        }
      });

      const data = formData.relatedType === 'reservation' 
        ? response.data.reservations 
        : response.data.products;
      
      console.log('Search results:', data);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, formData.relatedType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If changing related type, clear the related selections
    if (name === 'relatedType') {
      setFormData(prev => ({
        ...prev,
        [name]: value as 'reservation' | 'product' | '',
        relatedReservation: '',
        relatedProduct: '',
      }));
      setSelectedItem(null);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleItemSelect = (item: SearchResult) => {
    setSelectedItem(item);
    setSearchQuery('');
    setSearchResults([]);
    
    if (formData.relatedType === 'reservation') {
      setFormData(prev => ({ ...prev, relatedReservation: item._id }));
    } else {
      setFormData(prev => ({ ...prev, relatedProduct: item._id }));
    }
  };

  const clearSelectedItem = () => {
    setSelectedItem(null);
    setFormData(prev => ({
      ...prev,
      relatedReservation: '',
      relatedProduct: '',
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const preview = URL.createObjectURL(file);
      setAttachments(prev => [...prev, { file, preview }]);
    });
  };

  const removeNewAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].preview);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const removeExistingAttachment = (attachment: ExistingAttachment) => {
    setExistingAttachments(prev => prev.filter(att => att._id !== attachment._id));
    setDeletedAttachments(prev => [...prev, attachment]);
  };

  const handleDirectSubmit = async () => {
    // Validation
    if (!formData.date || !formData.category || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setSaving(true);

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      formDataToSend.append('date', formData.date);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('notes', formData.notes);
      
      if (formData.relatedReservation) {
        formDataToSend.append('relatedReservation', formData.relatedReservation);
      }
      if (formData.relatedProduct) {
        formDataToSend.append('relatedProduct', formData.relatedProduct);
      }

      // Add existing attachments (those not deleted)
      formDataToSend.append('existingAttachments', JSON.stringify(existingAttachments));

      // Add new attachments
      attachments.forEach(attachment => {
        formDataToSend.append('newAttachments', attachment.file);
      });

      const response = await axios.put(`/api/costs/${costId}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch(updateCost(response.data.cost));
      toast.success(t('edit.messages.updateSuccess'));
      router.push(`/costs/${costId}`);
    } catch (error: any) {
      console.error('Error updating cost:', error);
      toast.error(error.response?.data?.error || t('edit.messages.updateError'));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const getFileType = (file: File | ExistingAttachment | string) => {
    if (typeof file === 'string') {
      // Handle filename string
      const extension = file.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
      if (extension === 'pdf') return 'pdf';
      if (['txt', 'md'].includes(extension)) return 'text';
      if (['doc', 'docx'].includes(extension)) return 'document';
      return 'other';
    } else {
      // Handle File or ExistingAttachment object
      const type = 'type' in file ? file.type : (file as any).type || '';
      if (type.startsWith('image/')) return 'image';
      if (type === 'application/pdf') return 'pdf';
      return 'document';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
              <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{t('edit.title')}</h1>
              <p className="text-sm sm:text-base text-gray-300">{t('edit.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6 sm:space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    {t('edit.form.date')} *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="pl-10 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    {t('edit.form.category')} *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{t('edit.form.selectCategory')}</option>
                    {costCategories.map((category) => (
                      <option key={category._id} value={category._id} className="bg-gray-800">
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    {t('edit.form.amount')} *
                  </label>
                  <div className="relative">
                    <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="pl-10 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Related Items Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-300">
                  {t('edit.form.relatedItems')}
                </label>
                
                {/* Type Selection */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, relatedType: '', relatedReservation: '', relatedProduct: '' }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.relatedType === ''
                        ? 'bg-gray-600 text-white'
                        : 'bg-white/10 border border-white/20 text-gray-300 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    {t('edit.relatedTypes.none')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, relatedType: 'reservation', relatedReservation: '', relatedProduct: '' }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.relatedType === 'reservation'
                        ? 'bg-green-600 text-white'
                        : 'bg-white/10 border border-white/20 text-gray-300 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    {t('edit.relatedTypes.reservation')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, relatedType: 'product', relatedReservation: '', relatedProduct: '' }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.relatedType === 'product'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 border border-white/20 text-gray-300 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    {t('edit.relatedTypes.product')}
                  </button>
                </div>

                {/* Conditional Search Box */}
                {formData.relatedType && (
                  <div className="space-y-4">
                    {!selectedItem ? (
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder={formData.relatedType === 'reservation' ? t('edit.form.searchReservations') : t('edit.form.searchProducts')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchLoading && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Selected Item Preview */
                      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {formData.relatedType === 'reservation' ? (
                              <>
                                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                  <CalendarIcon className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                  <h3 className="text-white font-medium">
                                    {selectedItem.client ? 
                                      `${selectedItem.client.firstName} ${selectedItem.client.lastName}` : 
                                      tCommon('unknownCustomer')
                                    }
                                  </h3>
                                  <div className="text-sm text-gray-400">
                {selectedItem.client?.weddingDate ? (()=>{ const d=new Date(selectedItem.client.weddingDate); const dd=String(d.getUTCDate()).padStart(2,'0'); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const yy=d.getUTCFullYear(); return `${dd}/${mm}/${yy}`; })() : tCommon('noDateSet')}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                {selectedItem.primaryPhoto ? (
                                  <img
                                    src={getImageUrl(selectedItem.primaryPhoto)}
                                    alt={selectedItem.name}
                                    className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                      if (selectedItem.primaryPhoto) {
                                        setPreviewFile({
                                          file: { name: selectedItem.name || 'Product', size: 0, type: 'image' },
                                          url: getImageUrl(selectedItem.primaryPhoto),
                                          type: 'image'
                                        });
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <DocumentIcon className="h-6 w-6 text-blue-400" />
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-white font-medium">{selectedItem.name}</h3>
                                  <div className="text-sm text-gray-400">{tCommon('product')}</div>
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={clearSelectedItem}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Show reservation items if it's a reservation */}
                        {formData.relatedType === 'reservation' && selectedItem.items && selectedItem.items.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-400 mb-2">{t('details.related.items')} ({selectedItem.items.length})</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {selectedItem.items.map((item, index) => (
                                <div key={index} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                                                                     {item.primaryPhoto && (
                                     <img
                                       src={getImageUrl(item.primaryPhoto)}
                                       alt={item.name}
                                       className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                       onClick={() => {
                                         if (item.primaryPhoto) {
                                           setPreviewFile({
                                             file: { name: item.name, size: 0, type: 'image' },
                                             url: getImageUrl(item.primaryPhoto),
                                             type: 'image'
                                           });
                                         }
                                       }}
                                       onError={(e) => {
                                         (e.target as HTMLImageElement).style.display = 'none';
                                       }}
                                     />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{item.name || tCommon('unknownProduct')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && !selectedItem && (
                      <div className="bg-white/5 rounded-lg border border-white/10 max-h-60 overflow-y-auto">
                        {searchResults.map((item, index) => (
                          <div
                            key={item._id}
                            onClick={() => handleItemSelect(item)}
                            className={`flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors ${
                              index !== searchResults.length - 1 ? 'border-b border-white/10' : ''
                            }`}
                          >
                            {formData.relatedType === 'reservation' ? (
                              <>
                                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                  <CalendarIcon className="h-5 w-5 text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-medium">
                                    {item.client ? `${item.client.firstName} ${item.client.lastName}` : tCommon('unknownCustomer')}
                                  </div>
                                  <div className="text-sm text-gray-400">
              {item.client?.weddingDate ? (()=>{ const d=new Date(item.client.weddingDate); const dd=String(d.getUTCDate()).padStart(2,'0'); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const yy=d.getUTCFullYear(); return `${dd}/${mm}/${yy}`; })() : tCommon('noDateSet')}
                                  </div>
                                  {item.items && item.items.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {item.items.length} item{item.items.length !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                {item.primaryPhoto ? (
                                  <img
                                    src={getImageUrl(item.primaryPhoto)}
                                    alt={item.name}
                                    className="w-10 h-10 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <DocumentIcon className="h-5 w-5 text-blue-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-medium truncate">{item.name}</div>
                                  <div className="text-sm text-gray-400">{tCommon('product')}</div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.notes')}
                </label>
                <div className="relative">
                  <DocumentTextIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder={t('edit.form.notesPlaceholder')}
                    className="pl-10 pr-3 py-2 w-full bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  {t('edit.form.attachments')}
                </label>
                
                {/* Existing Attachments */}
                {existingAttachments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">{t('edit.attachments.currentFiles')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {existingAttachments.map((attachment) => (
                        <div key={attachment._id} className="relative group">
                          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                            {getFileType(attachment) === 'image' ? (
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-full h-20 object-cover rounded mb-2"
                              />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-gray-700 rounded mb-2">
                                <DocumentIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <p className="text-xs text-gray-300 truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)}
                            </p>
                            
                            {/* Action buttons */}
                            <div className="flex items-center justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleFilePreview(attachment, true)}
                                className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                title={t('details.attachments.preview')}
                              >
                                <EyeIcon className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = attachment.url;
                                  link.download = attachment.name;
                                  link.click();
                                }}
                                className="p-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                title={t('details.attachments.download')}
                              >
                                <ArrowDownTrayIcon className="h-3 w-3" />
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => removeExistingAttachment(attachment)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                  <PaperClipIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <div className="text-gray-300 mb-2">
                    {t('edit.attachments.uploadFiles')}
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    {tCommon('chooseFiles')}
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    {t('edit.attachments.supportedFormats')}
                  </p>
                </div>

                {/* New Attachment Previews */}
                {attachments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-green-400 mb-3">{t('edit.attachments.newFiles')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {attachments.map((attachment, index) => (
                        <div key={index} className="relative group">
                          <div className="bg-white/5 rounded-lg p-3 border border-green-500/20">
                            {getFileType(attachment.file) === 'image' ? (
                              <img
                                src={attachment.preview}
                                alt={attachment.file.name}
                                className="w-full h-20 object-cover rounded mb-2"
                              />
                            ) : (
                              <div className="w-full h-20 flex items-center justify-center bg-gray-700 rounded mb-2">
                                <DocumentIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <p className="text-xs text-gray-300 truncate">
                              {attachment.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.file.size)}
                            </p>
                            
                            {/* Action buttons */}
                            <div className="flex items-center justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleFilePreview(attachment.file, false)}
                                className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                title="Preview"
                              >
                                <EyeIcon className="h-3 w-3" />
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => removeNewAttachment(index)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 sm:px-6 py-2 text-gray-300 hover:text-white transition-colors text-sm w-full sm:w-auto"
                >
                  {t('edit.form.cancel')}
                </button>
                <ApprovalHandler
                  actionType="edit"
                  resourceType="cost"
                  resourceId={costId}
                  resourceName={`Cost - ${formData.amount ? `$${formData.amount}` : 'Edit'}`}
                  originalData={originalData}
                  newData={newData}
                  onDirectAction={handleDirectSubmit}
                  onSuccess={() => router.push(`/costs/${costId}`)}
                >
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('edit.form.updating')}
                      </>
                    ) : (
                      t('edit.form.updateCost')
                    )}
                  </button>
                </ApprovalHandler>
              </div>
            </form>
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
                    <p className="text-white text-sm font-medium">{previewFile.file.name || tCommon('unknownFile')}</p>
                    <p className="text-gray-300 text-xs">
                      {previewFile.file.size ? `${(previewFile.file.size / 1024 / 1024).toFixed(2)} MB • ` : ''}{previewFile.type.toUpperCase()}
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