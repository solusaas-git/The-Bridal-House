'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Cross2Icon, ImageIcon, VideoIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import { RootState } from '@/store/store';
import { getCurrencySymbol } from '@/utils/currency';
import Layout from '@/components/Layout';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { needsApproval } from '@/utils/permissions';
import { setCategories } from '@/store/reducers/categorySlice';
import { useTranslation } from 'react-i18next';

interface Product {
  _id: string;
  name: string;
  primaryPhoto: string;
  secondaryImages: string[];
  videoUrls: string[];
  rentalCost: number;
  buyCost?: number;
  sellPrice?: number;
  size?: number;
  category: {
    _id: string;
    name: string;
  };
  subCategory: string;
  quantity: number;
  status: 'Draft' | 'Published';
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const categories = useSelector((state: RootState) => state.category.categories);
  const currencySettings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    rentalCost: '',
    buyCost: '',
    sellPrice: '',
    size: '',
    category: '',
    subCategory: '',
    quantity: 0,
    status: 'Draft' as 'Draft' | 'Published',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableSubCategories, setAvailableSubCategories] = useState<any[]>([]);

  // File state
  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState('');
  const [secondaryPhotos, setSecondaryPhotos] = useState<File[]>([]);
  const [secondaryPhotosPreviews, setSecondaryPhotosPreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);

  // Keep track of existing files that should be preserved
  const [existingSecondaryImages, setExistingSecondaryImages] = useState<string[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);

  // Form ref for submission prevention
  const formRef = useRef<HTMLFormElement>(null);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  // Fetch categories if they're not loaded
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      dispatch(setCategories(response.data.categories || response.data));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    if (formData.category && categories) {
      const category = categories.find((c: any) => c._id === formData.category);
      setAvailableSubCategories((category as any)?.subCategories || []);
    }
  }, [formData.category, categories]);

  // Prevent form submission when approval is needed
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleFormSubmit = (e: Event) => {
      const needsApprovalCheck = needsApproval(currentUser, 'edit', 'item');
      if (needsApprovalCheck) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    form.addEventListener('submit', handleFormSubmit);
    return () => {
      form.removeEventListener('submit', handleFormSubmit);
    };
  }, [currentUser]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/products/${productId}`);
      
      if (response.data) {
        const productData = response.data;
        
        setProduct(productData);
        
        // Populate form data
        const formDataToSet = {
          name: productData.name || '',
          rentalCost: productData.rentalCost?.toString() || '',
          buyCost: productData.buyCost?.toString() || '',
          sellPrice: productData.sellPrice?.toString() || '',
          size: productData.size?.toString() || '',
          category: productData.category?._id || '',
          subCategory: productData.subCategory || '',
          quantity: productData.quantity || 0,
          status: productData.status || 'Draft',
        };
        
        setFormData(formDataToSet);

        // Set existing media
        if (productData.primaryPhoto) {
          setPrimaryPhotoPreview(getImageUrl(productData.primaryPhoto));
        }
        
        if (productData.secondaryImages) {
          setExistingSecondaryImages(productData.secondaryImages);
          setSecondaryPhotosPreviews(productData.secondaryImages.map((img: string) => getImageUrl(img)));
        }
        
        if (productData.videoUrls) {
          setExistingVideoUrls(productData.videoUrls);
          setVideoPreviews(productData.videoUrls.map((video: string) => getImageUrl(video)));
        }
      } else {
        setError('Product not found');
        toast.error('Product not found');
      }
    } catch (error) {
      setError('Failed to fetch product');
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        toast.error('Product not found');
      } else {
        toast.error('Failed to load product');
      }
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    return `/api/uploads/${imagePath}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      
      if (name === 'primaryPhoto' && files && files[0]) {
        const file = files[0];
        setPrimaryPhoto(file);
        setPrimaryPhotoPreview(URL.createObjectURL(file));
      } else if (name === 'secondaryPhotos' && files) {
        const fileArray = Array.from(files);
        const previews = fileArray.map(file => URL.createObjectURL(file));
        setSecondaryPhotos(prev => [...prev, ...fileArray]);
        setSecondaryPhotosPreviews(prev => [...prev, ...previews]);
      } else if (name === 'videos' && files) {
        const fileArray = Array.from(files);
        setVideos(prev => [...prev, ...fileArray]);
        const previews = fileArray.map(file => URL.createObjectURL(file));
        setVideoPreviews(prev => [...prev, ...previews]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRemoveSecondaryPhoto = (index: number) => {
    // Check if it's an existing image or new upload
    if (index < existingSecondaryImages.length) {
      // Remove from existing images
      setExistingSecondaryImages(prev => prev.filter((_, i) => i !== index));
      setSecondaryPhotosPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new uploads
      const newIndex = index - existingSecondaryImages.length;
      setSecondaryPhotos(prev => prev.filter((_, i) => i !== newIndex));
      setSecondaryPhotosPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRemoveVideo = (index: number) => {
    // Check if it's an existing video or new upload
    if (index < existingVideoUrls.length) {
      // Remove from existing videos
      setExistingVideoUrls(prev => prev.filter((_, i) => i !== index));
      setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new uploads
      const newIndex = index - existingVideoUrls.length;
      setVideos(prev => prev.filter((_, i) => i !== newIndex));
      setVideoPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.rentalCost || Number(formData.rentalCost) <= 0) {
      newErrors.rentalCost = 'Rental cost must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare form data for file upload
      const submitData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value.toString());
      });

      // Add existing files that should be preserved
      submitData.append('existingSecondaryImages', JSON.stringify(existingSecondaryImages));
      submitData.append('existingVideoUrls', JSON.stringify(existingVideoUrls));

      // Add new files (use product-specific field names so uploader routes to products folder)
      if (primaryPhoto) {
        submitData.append('product_primaryPhoto', primaryPhoto);
      }

      secondaryPhotos.forEach((photo) => {
        submitData.append('product_secondaryImages', photo);
      });

      videos.forEach((video) => {
        submitData.append('product_videos', video);
      });

      const response = await axios.put(`/api/products/${productId}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        toast.success('Product updated successfully');
        router.push(`/products/${productId}`);
      } else {
        toast.error('Failed to update product');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Failed to update product: ${error.response.data.message || error.message}`);
      } else {
        toast.error('Failed to update product: Network error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-300">Loading product...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Products
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
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
              <h1 className="text-xl sm:text-2xl font-bold text-white">Edit Product</h1>
              <p className="text-sm sm:text-base text-gray-300">Update product information</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/products/${productId}`)}
            className="px-4 py-2 text-gray-300 hover:text-white border border-white/20 rounded-md hover:bg-white/10 transition-colors text-sm w-full sm:w-auto"
          >
            Cancel
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <form ref={formRef} onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }} className="space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Product Name */}
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.productName')} *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white/10 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.name ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder={t('edit.form.enterProductName')}
                />
                {errors.name && <p className="mt-1 text-xs sm:text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.category')} *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 bg-white/10 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.category ? 'border-red-500' : 'border-white/20'
                  }`}
                >
                  <option value="">{t('edit.form.selectCategory')}</option>
                  {categories.map((category: any) => (
                    <option key={category._id} value={category._id} className="bg-gray-800">
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-xs sm:text-sm text-red-400">{errors.category}</p>}
              </div>

              {/* Sub Category */}
              <div>
                <label htmlFor="subCategory" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.subCategory')}
                </label>
                <select
                  id="subCategory"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!formData.category || availableSubCategories.length === 0}
                >
                  <option value="">{t('edit.form.selectSubCategory')}</option>
                  {availableSubCategories.map((subCat: string, index: number) => (
                    <option key={index} value={subCat} className="bg-gray-800">
                      {subCat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.status')}
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Draft" className="bg-gray-800">{t('edit.status.draft')}</option>
                  <option value="Published" className="bg-gray-800">{t('edit.status.published')}</option>
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Rental Cost */}
              <div>
                <label htmlFor="rentalCost" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.rentalCost')} * ({getCurrencySymbol(currencySettings)})
                </label>
                <input
                  type="number"
                  id="rentalCost"
                  name="rentalCost"
                  value={formData.rentalCost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 bg-white/10 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                    errors.rentalCost ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="0.00"
                />
                {errors.rentalCost && <p className="mt-1 text-xs sm:text-sm text-red-400">{errors.rentalCost}</p>}
              </div>

              {/* Buy Cost */}
              <div>
                <label htmlFor="buyCost" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.buyCost')} ({getCurrencySymbol(currencySettings)})
                </label>
                <input
                  type="number"
                  id="buyCost"
                  name="buyCost"
                  value={formData.buyCost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0.00"
                />
              </div>

              {/* Sell Price */}
              <div>
                <label htmlFor="sellPrice" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.sellPrice')} ({getCurrencySymbol(currencySettings)})
                </label>
                <input
                  type="number"
                  id="sellPrice"
                  name="sellPrice"
                  value={formData.sellPrice}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Size */}
              <div>
                <label htmlFor="size" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.size')}
                </label>
                <input
                  type="number"
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={t('edit.form.size')}
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  {t('edit.form.quantity')}
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Primary Photo */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                {t('edit.form.primaryPhoto')}
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 sm:pt-5 pb-4 sm:pb-6">
                      <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-xs sm:text-sm text-gray-400">
                        <span className="font-semibold">{t('edit.upload.clickToUpload')}</span> {t('edit.upload.primaryPhoto')}
                      </p>
                      <p className="text-xs text-gray-500">{t('edit.form.supportedFormats')}</p>
                    </div>
                    <input
                      type="file"
                      name="primaryPhoto"
                      onChange={handleChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
                
                {primaryPhotoPreview && (
                  <div className="relative w-32 h-32">
                    <img
                      src={primaryPhotoPreview}
                      alt="Primary preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryPhoto(null);
                        setPrimaryPhotoPreview('');
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Cross2Icon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('edit.form.secondaryPhotos')}
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-400">
                        <span className="font-semibold">{t('edit.upload.clickToUpload')}</span> {t('edit.upload.additionalPhotos')}
                      </p>
                      <p className="text-xs text-gray-500">{t('edit.form.supportedFormats')}</p>
                    </div>
                    <input
                      type="file"
                      name="secondaryPhotos"
                      onChange={handleChange}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </label>
                </div>
                
                {secondaryPhotosPreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {secondaryPhotosPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Secondary preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondaryPhoto(index)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Cross2Icon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Videos */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('edit.form.videos')}
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <VideoIcon className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-400">
                        <span className="font-semibold">{t('edit.upload.clickToUpload')}</span> {t('edit.upload.videos')}
                      </p>
                      <p className="text-xs text-gray-500">{t('edit.form.videoFormats')}</p>
                    </div>
                    <input
                      type="file"
                      name="videos"
                      onChange={handleChange}
                      accept="video/*"
                      multiple
                      className="hidden"
                    />
                  </label>
                </div>
                
                {videoPreviews.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videoPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <video
                          src={preview}
                          className="w-full h-32 object-cover rounded-lg"
                          controls
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(index)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Cross2Icon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-4 sm:pt-6">
              <button
                type="button"
                onClick={() => router.push(`/products/${productId}`)}
                className="px-4 sm:px-6 py-2 text-gray-300 hover:text-white border border-white/20 rounded-md hover:bg-white/10 transition-colors text-sm w-full sm:w-auto"
              >
                {t('edit.form.cancel')}
              </button>
              <ApprovalHandler
                actionType="edit"
                resourceType="item"
                resourceId={productId}
                resourceName={product.name}
                originalData={product}
                newData={(() => {
                  const changedData: any = {};
                  
                  // Only include fields that are actually different from the original product
                  if (formData.name !== product.name) changedData.name = formData.name;
                  if (formData.rentalCost !== product.rentalCost.toString()) changedData.rentalCost = formData.rentalCost;
                  if (formData.buyCost !== (product.buyCost?.toString() || '')) changedData.buyCost = formData.buyCost;
                  if (formData.sellPrice !== (product.sellPrice?.toString() || '')) changedData.sellPrice = formData.sellPrice;
                  if (formData.size !== (product.size?.toString() || '')) changedData.size = formData.size;
                  if (formData.category !== product.category._id) changedData.category = formData.category;
                  if (formData.subCategory !== product.subCategory) changedData.subCategory = formData.subCategory;
                  if (formData.quantity !== product.quantity) changedData.quantity = formData.quantity;
                  if (formData.status !== product.status) changedData.status = formData.status;
                  
                  // Include existing images/videos that should be preserved
                  if (JSON.stringify(existingSecondaryImages) !== JSON.stringify(product.secondaryImages)) {
                    changedData.existingSecondaryImages = existingSecondaryImages;
                    changedData.secondaryImages = existingSecondaryImages; // Include for thumbnails
                  }
                  if (JSON.stringify(existingVideoUrls) !== JSON.stringify(product.videoUrls)) {
                    changedData.existingVideoUrls = existingVideoUrls;
                    changedData.videoUrls = existingVideoUrls; // Include for thumbnails
                  }
                  
                  // Include new files as indicators
                  if (primaryPhoto) {
                    changedData.hasNewPrimaryPhoto = true;
                    changedData.newPrimaryPhoto = primaryPhoto; // Include the actual file
                  }
                  if (secondaryPhotos.length > 0) {
                    changedData.hasNewSecondaryPhotos = true;
                    changedData.newSecondaryPhotos = secondaryPhotos; // Include the actual files
                  }
                  if (videos.length > 0) {
                    changedData.hasNewVideos = true;
                    changedData.newVideos = videos; // Include the actual files
                  }
                  
                  return changedData;
                })()}
                onDirectAction={async () => {
                  const fakeEvent = {
                    preventDefault: () => {},
                    stopPropagation: () => {}
                  } as any;
                  await handleSubmit(fakeEvent);
                }}
                onSuccess={() => {
                  router.push(`/products/${productId}`);
                }}
              >
                <button
                  type="button"
                  disabled={submitting}
                  className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-md transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                >
                  {submitting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {submitting ? t('edit.form.updating') : t('edit.form.updateProduct')}
                </button>
              </ApprovalHandler>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}