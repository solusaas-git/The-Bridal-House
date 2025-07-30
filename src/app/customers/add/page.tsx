'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Cross2Icon } from '@radix-ui/react-icons';
import AttachmentsSection from '@/components/shared/AttachmentsSection';
import PhoneInput from '@/components/ui/PhoneInput';
import Layout from '@/components/Layout';

interface CustomerFormData {
  firstName: string;
  lastName: string;
  address: string;
  idNumber: string;
  phone: string;
  weddingDate: string;
  weddingTime: string;
  weddingLocation: string;
  weddingCity: string;
  type: 'Client' | 'Prospect';
  email?: string;
  whatsapp?: string;
}

const AddCustomerPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    address: '',
    idNumber: '',
    phone: '',
    weddingDate: '',
    weddingTime: '00:00',
    weddingLocation: '',
    weddingCity: '',
    type: 'Client',
    email: '',
    whatsapp: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilesAdded = (files: File[]) => {
    setNewFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Append each field from formData
      for (const key in formData) {
        formDataToSend.append(key, formData[key as keyof CustomerFormData] || '');
      }

      // Append newFiles if there are any
      newFiles.forEach((file) => {
        formDataToSend.append('newFiles', file);
      });

      const response = await axios.post('/api/customers', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success('Customer added successfully!');
        router.push('/customers');
      } else {
        toast.error(response.data.message || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message || 'Failed to add customer');
      } else {
        toast.error('Failed to add customer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/customers');
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Add New Customer</h1>
          <p className="text-sm sm:text-base text-gray-300">Create a new customer profile</p>
        </div>
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Cross2Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </button>
      </div>

      {/* Form */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">CIN/PASSPORT ID *</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Phone *</label>
                <PhoneInput
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">WhatsApp</label>
                <PhoneInput
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handlePhoneChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-200">Wedding Date</label>
                  <input
                    type="date"
                    name="weddingDate"
                    value={formData.weddingDate}
                    onChange={handleChange}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-200">Wedding Time</label>
                  <input
                    type="time"
                    name="weddingTime"
                    value={formData.weddingTime}
                    onChange={handleChange}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Wedding Location</label>
                <input
                  type="text"
                  name="weddingLocation"
                  value={formData.weddingLocation}
                  onChange={handleChange}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Wedding City *</label>
                <input
                  type="text"
                  name="weddingCity"
                  value={formData.weddingCity}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Client">Client</option>
                  <option value="Prospect">Prospect</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <AttachmentsSection
            existingFiles={[]}
            newFiles={newFiles}
            onAddFiles={handleFilesAdded}
            onRemoveNew={handleRemoveNewFile}
          />

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors text-sm w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
            >
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Layout>
  );
};

export default AddCustomerPage; 