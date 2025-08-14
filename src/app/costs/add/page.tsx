'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon,
  ArrowLeftIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import { RootState } from '@/store/store';
import { setCostCategories, addCost } from '@/store/reducers/costSlice';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { formatCurrency } from '@/utils/currency';
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

interface SearchResult {
  _id: string;
  name?: string;
  customer?: { name: string };
  weddingDate?: string;
  totalAmount?: number;
  pickupDate?: string;
  returnDate?: string;
  primaryPhoto?: string;
  items?: Array<{ product: { name: string; primaryPhoto?: string } }>;
  client?: { firstName: string; lastName: string; weddingDate?: string };
}

export default function AddCostPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { costCategories } = useSelector((state: RootState) => state.cost);
  const { t } = useTranslation('costs');
  const { t: tCommon } = useTranslation('common');
  const currencySettings = useSelector((state: RootState) => state.settings);

  const [formData, setFormData] = useState<CostFormData>({
    date: (()=>{ const d=new Date(); const yyyy=d.getUTCFullYear(); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${yyyy}-${mm}-${dd}`; })(),
    category: '',
    amount: '',
    relatedType: '',
    relatedReservation: '',
    relatedProduct: '',
    notes: ''
  });

  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchCostCategories();
  }, []);

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
          limit: 5, // Limit results for better UX
        }
      });

      console.log('Search response:', response.data);

      let data = [];
      if (formData.relatedType === 'reservation') {
        data = response.data.success ? response.data.reservations : [];
      } else {
        data = response.data.products || [];
      }
      
      console.log('Processed data:', data);
      setSearchResults(data);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const preview = URL.createObjectURL(file);
      setAttachments(prev => [...prev, { file, preview }]);
    });

    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].preview);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.date || !formData.category || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setLoading(true);

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

      // Add attachments
      attachments.forEach(attachment => {
        formDataToSend.append('attachments', attachment.file);
      });

      const response = await axios.post('/api/costs', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch(addCost(response.data.cost));
      toast.success(t('add.messages.createSuccess'));
      router.push('/costs');
    } catch (error: unknown) {
      console.error('Error adding cost:', error);
      const errorMessage = error instanceof Error ? error.message : t('add.messages.createError');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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

    setLoading(true);

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

      // Add attachments
      attachments.forEach(attachment => {
        formDataToSend.append('attachments', attachment.file);
      });

      const response = await axios.post('/api/costs', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      dispatch(addCost(response.data.cost));
      toast.success(t('add.messages.createSuccess'));
      router.push('/costs');
    } catch (error: unknown) {
      console.error('Error adding cost:', error);
      const errorMessage = error instanceof Error ? error.message : t('add.messages.createError');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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

  const getFileType = (file: File) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'document';
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('add.backToCosts')}
          </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('add.title')}</h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">
                  {t('edit.form.date')} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">
                  {t('edit.form.category')} <span className="text-red-400">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="" className="bg-gray-800">{t('edit.form.selectCategory')}</option>
                  {costCategories.map((category) => (
                    <option key={category._id} value={category._id} className="bg-gray-800">
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">
                  {t('edit.form.amount')} <span className="text-red-400">*</span>
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
                    className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Related Item Section */}
            <div className="space-y-4">
              <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.relatedItems')}</label>
              
              {/* Item Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    relatedType: formData.relatedType === 'reservation' ? '' : 'reservation',
                    relatedReservation: '',
                    relatedProduct: ''
                  }))}
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    formData.relatedType === 'reservation'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <CalendarIcon className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">{t('edit.relatedTypes.reservation')}</div>
                  <div className="text-xs text-gray-400 mt-1">{tCommon('linkToReservation')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    relatedType: formData.relatedType === 'product' ? '' : 'product',
                    relatedReservation: '',
                    relatedProduct: ''
                  }))}
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    formData.relatedType === 'product'
                      ? 'bg-green-600/20 border-green-500/50 text-green-300'
                      : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <DocumentIcon className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">{t('edit.relatedTypes.product')}</div>
                  <div className="text-xs text-gray-400 mt-1">{tCommon('linkToProduct')}</div>
                </button>
              </div>

              {/* Search and Selection */}
              {formData.relatedType && (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search ${formData.relatedType}s...`}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>

                  {/* Debug info */}
                  <div className="text-xs text-gray-400">
                    Search query: "{searchQuery}" | Type: {formData.relatedType} | Results: {searchResults.length}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border border-white/20 rounded-lg bg-white/5 divide-y divide-white/10">
                      {searchResults.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => handleItemSelect(item)}
                          className="p-3 cursor-pointer hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                              {formData.relatedType === 'reservation' ? (
                                item.items && item.items.length > 0 && item.items[0]?.product?.primaryPhoto ? (
                                  <img 
                                    src={`/api/uploads/${item.items[0].product.primaryPhoto}`}
                                    alt="Reservation item"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <CalendarIcon className="h-5 w-5 text-gray-400 m-auto mt-2" />
                                )
                              ) : (
                                item.primaryPhoto ? (
                                  <img 
                                    src={`/api/uploads/${item.primaryPhoto}`}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <DocumentIcon className="h-5 w-5 text-gray-400 m-auto mt-2" />
                                )
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">
                                {formData.relatedType === 'reservation' ? 
                                  (item.client ? `${item.client.firstName} ${item.client.lastName}` : 'Unknown Customer') 
                                  : item.name
                                }
                              </div>
                              {formData.relatedType === 'reservation' && (
                                <div className="text-sm text-gray-400">
                        {item.client?.weddingDate ? (()=>{ const d=new Date(item.client.weddingDate); const dd=String(d.getUTCDate()).padStart(2,'0'); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const yy=d.getUTCFullYear(); return `${dd}/${mm}/${yy}`; })() : 'No date set'}
                                </div>
                              )}
                            </div>
                            
                            {formData.relatedType === 'reservation' && item.totalAmount && (
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  {formatCurrency(item.totalAmount, currencySettings)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No results message */}
                  {searchQuery && !searchLoading && searchResults.length === 0 && (
                    <div className="text-center py-4 text-gray-400">
                      No {formData.relatedType}s found matching "{searchQuery}"
                    </div>
                  )}

                  {/* Selected Item Display */}
                  {selectedItem && (
                    <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                          {formData.relatedType === 'reservation' ? (
                            selectedItem.items && selectedItem.items.length > 0 && selectedItem.items[0]?.product?.primaryPhoto ? (
                              <img 
                                src={`/api/uploads/${selectedItem.items[0].product.primaryPhoto}`}
                                alt="Selected reservation"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <CalendarIcon className="h-4 w-4 text-gray-400 m-auto mt-1" />
                            )
                          ) : (
                            selectedItem.primaryPhoto ? (
                              <img 
                                src={`/api/uploads/${selectedItem.primaryPhoto}`}
                                alt={selectedItem.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <DocumentIcon className="h-4 w-4 text-gray-400 m-auto mt-1" />
                            )
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">
                            {formData.relatedType === 'reservation' ? 
                              (selectedItem.client ? `${selectedItem.client.firstName} ${selectedItem.client.lastName}` : 'Unknown Customer')
                              : selectedItem.name
                            }
                          </div>
                          {formData.relatedType === 'reservation' && selectedItem.weddingDate && (
                            <div className="text-xs text-gray-400">
                    {(()=>{ const d=new Date(selectedItem.weddingDate); const dd=String(d.getUTCDate()).padStart(2,'0'); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const yy=d.getUTCFullYear(); return `${dd}/${mm}/${yy}`; })()}
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={clearSelectedItem}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                placeholder={t('edit.form.notesPlaceholder')}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">{t('edit.form.attachments')}</label>
              <div 
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/30 transition-all cursor-pointer bg-white/5"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <PaperClipIcon className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <p className="text-gray-300 text-lg mb-2">{t('edit.attachments.dragDrop')}</p>
                <p className="text-sm text-gray-400 mb-4">{t('edit.attachments.supportedFormats')}</p>
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {tCommon('chooseFiles')}
                </button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Attachment Previews */}
            {attachments.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-200">{t('edit.attachments.newFiles')}</label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-center">
                        {getFileType(attachment.file) === 'image' ? (
                          <img
                            src={attachment.preview}
                            alt="Preview"
                            className="w-full h-16 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-16 flex items-center justify-center bg-gray-700 rounded mb-2">
                            <DocumentIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <p className="text-xs text-gray-300 truncate">
                          {attachment.file.name}
                        </p>
                        
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
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

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 sm:px-6 py-2 text-gray-300 hover:text-white transition-colors text-sm w-full sm:w-auto"
              >
                Cancel
              </button>
              <ApprovalHandler
                actionType="create"
                resourceType="cost"
                resourceName="New Cost"
                originalData={{}}
                newData={formData}
                onDirectAction={handleDirectSubmit}
                onSuccess={() => {
                  toast.success(t('add.messages.createSuccess'));
                  router.push('/costs');
                }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('add.form.creating')}
                    </>
                  ) : (
                    t('add.form.createCost')
                  )}
                </button>
              </ApprovalHandler>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
} 