'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
  EyeOpenIcon,
  CalendarIcon,
  DownloadIcon,
} from '@radix-ui/react-icons';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Truck, Undo2 } from 'lucide-react';
import { RootState } from '@/store/store';
import { formatCurrency } from '@/utils/currency';
import Layout from '@/components/Layout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, parseISO } from 'date-fns';
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

interface Reservation {
  _id: string;
  reservationNumber: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    weddingDate: string;
  };
  items: Array<{
    _id: string;
    name: string;
  }>;
  pickupDate: string;
  returnDate: string;
  availabilityDate: string;
  status: string;
  createdAt: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reservations: Reservation[];
  status: 'available' | 'booked' | 'unavailable';
}

export default function ProductViewPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const currencySettings = useSelector((state: RootState) => state.settings);
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/products/${productId}`);
      
      if (response.data) {
        setProduct(response.data);
      } else {
        setError('Product not found');
        toast.error('Product not found');
      }
    } catch (error) {
      setError('Failed to fetch product');
      console.error('Error fetching product:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        toast.error('Product not found');
      } else {
        toast.error('Failed to load product');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await axios.delete(`/api/products/${productId}`);
      
      if (response.status === 200) {
        toast.success('Product deleted successfully');
        router.push('/products');
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleDownload = (mediaUrl: string, fileName?: string) => {
    // Create a temporary link element to force download
    const downloadLink = document.createElement('a');
    downloadLink.href = getImageUrl(mediaUrl);
    downloadLink.download = fileName || mediaUrl.split('/').pop() || 'download';
    downloadLink.target = '_blank'; // Add target blank as fallback
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    return `/api/uploads/${imagePath}`;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yy = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  };

  // Fetch reservations for this product
  const fetchReservations = async () => {
    setLoadingReservations(true);
    try {
      const response = await axios.get('/api/reservations', {
        params: {
          limit: 1000, // Get all reservations to check availability
        }
      });
      
      // Filter reservations that include this product
      const productReservations = response.data.reservations.filter((reservation: any) =>
        reservation.items?.some((item: any) => item._id === productId)
      );
      
      setReservations(productReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoadingReservations(false);
    }
  };

  // Get calendar days for current month
  const getCalendarDays = (): CalendarDay[] => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const today = new Date();
    
    // Get all days to display (including previous/next month days for full weeks)
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
    
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(date => {
      const dayReservations = reservations.filter(reservation => {
        const pickupDate = parseISO(reservation.pickupDate);
        const availabilityDate = parseISO(reservation.availabilityDate);
        
        // Check if the date falls within the unavailable period (pickup to availability)
        return isWithinInterval(date, { start: pickupDate, end: availabilityDate });
      });
      
      let status: 'available' | 'booked' | 'unavailable' = 'available';
      if (dayReservations.length > 0) {
        // Check if it's exactly on pickup/return dates or in between
        const hasPickup = dayReservations.some(r => isSameDay(date, parseISO(r.pickupDate)));
        const hasReturn = dayReservations.some(r => isSameDay(date, parseISO(r.returnDate)));
        
        if (hasPickup || hasReturn) {
          status = 'booked';
        } else {
          status = 'unavailable';
        }
      }
      
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isSameDay(date, today),
        reservations: dayReservations,
        status,
      };
    });
  };

  // Load reservations when tab changes to availability
  useEffect(() => {
    if (activeTab === 'availability' && reservations.length === 0) {
      fetchReservations();
    }
  }, [activeTab]);

  const calendarDays = getCalendarDays();

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

  const allImages = [product.primaryPhoto, ...product.secondaryImages].filter(Boolean);

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
              <h1 className="text-xl sm:text-2xl font-bold text-white">{product.name}</h1>
              <p className="text-sm sm:text-base text-gray-300">Product Details</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push(`/products/${productId}/edit`)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors text-sm w-full sm:w-auto"
            >
              <Pencil1Icon className="h-4 w-4" />
              {t('details.actions.edit')}
            </button>
            <button
              onClick={handleDeleteProduct}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              {t('details.actions.delete')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t('details.tabs.details')}
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'availability'
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Availability
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Images Section */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-h-96 max-h-[600px] relative group">
                    {allImages[selectedImageIndex] ? (
                      <>
                        <img
                          src={getImageUrl(allImages[selectedImageIndex])}
                          alt={product.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.png';
                          }}
                        />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(allImages[selectedImageIndex], `${product.name}_image_${selectedImageIndex + 1}`)}
                            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            title={t('details.actions.downloadImage')}
                          >
                            <DownloadIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-500">{t('details.images.noImageAvailable')}</span>
                      </div>
                    )}
                  </div>

                  {/* Image Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {allImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedImageIndex === index
                              ? 'border-blue-500'
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          <img
                            src={getImageUrl(image)}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.png';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Videos */}
                  {product.videoUrls && product.videoUrls.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium text-white">{t('details.sections.videos')}</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {product.videoUrls.map((videoUrl, index) => (
                          <div key={index} className="relative group">
                            <video
                              src={getImageUrl(videoUrl)}
                              controls
                              className="w-full rounded-lg"
                            />
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleDownload(videoUrl, `${product.name}_video_${index + 1}`)}
                                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                title={t('details.actions.downloadVideo')}
                              >
                                <DownloadIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Information */}
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-4">{t('details.sections.basicInfo')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.name')}</label>
                        <p className="text-white">{product.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.status')}</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          product.status === 'Published'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {product.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.category')}</label>
                        <p className="text-white">{product.category?.name || tCommon('notAvailable')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.subCategory')}</label>
                        <p className="text-white">{product.subCategory || tCommon('notAvailable')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.size')}</label>
                        <p className="text-white">{product.size || tCommon('notAvailable')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.inStock')}</label>
                        <p className="text-white">{product.quantity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-4">{t('details.sections.pricing')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.rentalCostPerDay')}</label>
                        <p className="text-lg font-semibold text-green-400">
                          {formatCurrency(product.rentalCost, currencySettings)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.buyCost')}</label>
                        <p className="text-white">
                          {product.buyCost ? formatCurrency(product.buyCost, currencySettings) : tCommon('notAvailable')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.sellPrice')}</label>
                        <p className="text-white">
                          {product.sellPrice ? formatCurrency(product.sellPrice, currencySettings) : tCommon('notAvailable')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-4">{t('details.sections.metadata')}</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('details.fields.createdBy')}</label>
                        <p className="text-white">{product.createdBy?.name || tCommon('notAvailable')}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Created At</label>
                        <p className="text-white">{formatDate(product.createdAt)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Last Updated</label>
                        <p className="text-white">{formatDate(product.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'availability' && (
              <div className="space-y-6">
                {loadingReservations ? (
                  <div className="bg-white/5 rounded-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading availability data...</p>
                  </div>
                ) : (
                  <>
                    {/* Calendar */}
                    <div className="bg-white/5 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Availability Calendar
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4 text-gray-400" />
                          </button>
                          <h4 className="text-white font-medium min-w-[140px] text-center">
                            {format(currentDate, 'MMMM yyyy')}
                          </h4>
                          <button
                            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {/* Calendar Legend */}
                      <div className="flex items-center gap-6 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-gray-300">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-gray-300">Booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span className="text-gray-300">Unavailable</span>
                        </div>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {/* Week headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="p-2 text-center text-xs font-medium text-gray-400">
                            {day}
                          </div>
                        ))}
                        
                        {/* Calendar days */}
                        {calendarDays.map((day, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedDay(day)}
                            className={`
                              p-2 text-center text-sm rounded-lg transition-colors relative
                              ${!day.isCurrentMonth ? 'text-gray-600' : 'text-white'}
                              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                              ${day.status === 'available' ? 'bg-green-500/20 hover:bg-green-500/30' : ''}
                              ${day.status === 'booked' ? 'bg-red-500/20 hover:bg-red-500/30' : ''}
                              ${day.status === 'unavailable' ? 'bg-orange-500/20 hover:bg-orange-500/30' : ''}
                              ${selectedDay?.date.toDateString() === day.date.toDateString() ? 'ring-2 ring-white' : ''}
                            `}
                          >
                            <span className="relative z-10">{format(day.date, 'd')}</span>
                            {day.reservations.length > 0 && (
                              <div className={`
                                absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full
                                ${day.status === 'booked' ? 'bg-red-500' : 'bg-orange-500'}
                              `}></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Day Details */}
                    {selectedDay && selectedDay.reservations.length > 0 && (
                      <div className="bg-white/5 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-white mb-4">
                          {t('details.availability.reservationsFor')} {format(selectedDay.date, 'MMMM d, yyyy')}
                        </h3>
                        <div className="space-y-3">
                          {selectedDay.reservations.map(reservation => (
                            <div key={reservation._id} className="bg-white/5 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-white">
                                  {reservation.client.firstName} {reservation.client.lastName}
                                </h4>
                                <span className="text-xs text-gray-400">
                                  #{reservation.reservationNumber}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Truck className="h-4 w-4 text-green-400" />
                                  <span className="text-gray-300">
                                    Pickup: {(() => { const s=String(reservation.pickupDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Undo2 className="h-4 w-4 text-orange-400" />
                                  <span className="text-gray-300">
                                    Return: {(() => { const s=String(reservation.returnDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-purple-400" />
                                  <span className="text-gray-300">
                                    Wedding: {(() => { const s=String(reservation.client.weddingDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Current & Upcoming Reservations */}
                    <div className="bg-white/5 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-white mb-4">{t('details.availability.currentUpcoming')}</h3>
                      {reservations.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-400">{t('details.availability.noReservations')}</p>
                          <p className="text-sm text-gray-500 mt-1">{t('details.availability.availableAllDates')}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {reservations
                            .filter(r => new Date(r.availabilityDate) >= new Date())
                            .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime())
                            .slice(0, 5)
                            .map(reservation => (
                              <div key={reservation._id} className="bg-white/5 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-white">
                                    {reservation.client.firstName} {reservation.client.lastName}
                                  </h4>
                                  <span className="text-xs text-gray-400">
                                    #{reservation.reservationNumber}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-green-400" />
                                    <span className="text-gray-300">
                                      {t('details.availability.pickup')}: {(() => { const s=String(reservation.pickupDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Undo2 className="h-4 w-4 text-orange-400" />
                                    <span className="text-gray-300">
                                      {t('details.availability.return')}: {(() => { const s=String(reservation.returnDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-purple-400" />
                                    <span className="text-gray-300">
                                      {t('details.availability.wedding')}: {(() => { const s=String(reservation.client.weddingDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          {reservations.filter(r => new Date(r.availabilityDate) >= new Date()).length > 5 && (
                            <p className="text-sm text-gray-400 text-center mt-3">
                              +{reservations.filter(r => new Date(r.availabilityDate) >= new Date()).length - 5} {t('details.availability.moreUpcoming')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 