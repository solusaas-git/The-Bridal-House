'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Cross2Icon, ImageIcon, VideoIcon } from '@radix-ui/react-icons';
import { RootState } from '@/store/store';
import { getCurrencySymbol } from '@/utils/currency';
import Layout from '@/components/Layout';

export default function AddProductPage() {
  const router = useRouter();
  const categories = useSelector((state: RootState) => state.category.categories);
  const currencySettings = useSelector((state: RootState) => state.settings);

  const [formData, setFormData] = useState({
    name: '',
    rentalCost: '',
    buyCost: '',
    sellPrice: '',
    size: '',
    category: '',
    subCategory: '',
    quantity: 0,
    status: 'Draft',
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

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (formData.category && categories) {
      const category = categories.find((c: any) => c._id === formData.category);
      setAvailableSubCategories((category as any)?.subCategories || []);
    }
  }, [formData.category, categories]);

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
    setSecondaryPhotos(prev => prev.filter((_, i) => i !== index));
    setSecondaryPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
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

    if (!primaryPhoto) {
      newErrors.primaryPhoto = 'Primary photo is required';
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

    setLoading(true);

    try {
      // Prepare form data for file upload
      const submitData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value.toString());
      });

      // Add files
      if (primaryPhoto) {
        submitData.append('primaryPhoto', primaryPhoto);
      }

      secondaryPhotos.forEach((photo, index) => {
        submitData.append(`secondaryPhotos`, photo);
      });

      videos.forEach((video, index) => {
        submitData.append(`videos`, video);
      });

      const response = await axios.post('/api/products', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        toast.success('Product created successfully');
        router.push('/products');
      } else {
        toast.error('Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Failed to create product: ${error.response.data.message || error.message}`);
      } else {
        toast.error('Failed to create product: Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Add Product</h1>
            <p className="text-sm sm:text-base text-gray-300">Create a new product in your inventory</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-300 hover:text-white border border-white/20 rounded-md hover:bg-white/10 transition-colors text-sm w-full sm:w-auto"
          >
            Cancel
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Product Name */}
              <div>
                <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Product Name *
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
                  placeholder="Enter product name"
                />
                {errors.name && <p className="mt-1 text-xs sm:text-sm text-red-400">{errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Category *
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
                  <option value="">Select a category</option>
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
                  Sub Category
                </label>
                <select
                  id="subCategory"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!formData.category || availableSubCategories.length === 0}
                >
                  <option value="">Select a sub category</option>
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
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Draft" className="bg-gray-800">Draft</option>
                  <option value="Published" className="bg-gray-800">Published</option>
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Rental Cost */}
              <div>
                <label htmlFor="rentalCost" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Rental Cost * ({getCurrencySymbol(currencySettings)})
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
                  Buy Cost ({getCurrencySymbol(currencySettings)})
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
                  Sell Price ({getCurrencySymbol(currencySettings)})
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
                  Size
                </label>
                <input
                  type="number"
                  id="size"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Size"
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Quantity
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
                Primary Photo *
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-white/5 transition-colors ${
                    errors.primaryPhoto ? 'border-red-500' : 'border-white/20 hover:border-white/40'
                  }`}>
                    <div className="flex flex-col items-center justify-center pt-3 sm:pt-5 pb-4 sm:pb-6">
                      <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-xs sm:text-sm text-gray-400">
                        <span className="font-semibold">Click to upload</span> primary photo
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
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
                {errors.primaryPhoto && <p className="text-xs sm:text-sm text-red-400">{errors.primaryPhoto}</p>}
                
                {primaryPhotoPreview && (
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32">
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
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Secondary Photos
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 sm:pt-5 pb-4 sm:pb-6">
                      <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-xs sm:text-sm text-gray-400">
                        <span className="font-semibold">Click to upload</span> additional photos
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB each</p>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {secondaryPhotosPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Secondary preview ${index + 1}`}
                          className="w-full h-16 sm:h-20 object-cover rounded-lg"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Videos
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-white/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 sm:pt-5 pb-4 sm:pb-6">
                      <VideoIcon className="w-6 h-6 sm:w-8 sm:h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-xs sm:text-sm text-gray-400">
                        <span className="font-semibold">Click to upload</span> videos
                      </p>
                      <p className="text-xs text-gray-500">MP4, MOV up to 50MB each</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videoPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <video
                          src={preview}
                          className="w-full h-24 sm:h-32 object-cover rounded-lg"
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
                onClick={() => router.back()}
                className="px-4 sm:px-6 py-2 text-gray-300 hover:text-white border border-white/20 rounded-md hover:bg-white/10 transition-colors text-sm w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-md transition-colors flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
} 