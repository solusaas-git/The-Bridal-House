'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import AttachmentsSection from '@/components/shared/AttachmentsSection';
import PhoneInput from '@/components/ui/PhoneInput';
import Layout from '@/components/Layout';
import ApprovalHandler from '@/components/approvals/ApprovalHandler';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import type { IAttachment } from '@/models';
import { useTranslation } from 'react-i18next';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  idNumber: string;
  weddingDate?: string;
  weddingLocation?: string;
  weddingCity: string;
  whatsapp?: string;
  type: 'Client' | 'Prospect';
  attachments?: IAttachment[];
}

const EditCustomerPage = () => {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const { t } = useTranslation('customers');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [originalData, setOriginalData] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Customer>({
    _id: '',
    firstName: '',
    lastName: '',
    address: '',
    idNumber: '',
    phone: '',
    weddingDate: '',
    weddingLocation: '',
    weddingCity: '',
    type: 'Client',
    whatsapp: '',
    attachments: [],
  });

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/customers/${customerId}`);
        
        if (response.data.success) {
          const customer = response.data.customer;
          const customerData = {
            _id: customer._id,
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            address: customer.address || '',
            idNumber: customer.idNumber || '',
            phone: customer.phone || '',
            weddingDate: customer.weddingDate ? customer.weddingDate.split('T')[0] : '',
            weddingLocation: customer.weddingLocation || '',
            weddingCity: customer.weddingCity || '',
            type: customer.type || 'Client',
            whatsapp: customer.whatsapp || '',
            attachments: customer.attachments || [],
          };
          setOriginalData(customerData);
          setFormData(customerData);
        } else {
          toast.error(t('edit.messages.customerNotFound'));
          router.push('/customers');
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error(t('edit.messages.loadFailed'));
        router.push('/customers');
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, router]);

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

  const handleRemoveExisting = (fileToRemove: IAttachment) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter(
        (file) => file.url !== fileToRemove.url
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();

      // Append each field from formData (except attachments and _id)
      for (const key in formData) {
        if (key !== 'attachments' && key !== '_id') {
          const value = formData[key as keyof Customer];
          formDataToSend.append(key, value?.toString() || '');
        }
      }

      // Append existing attachments
      if (formData.attachments) {
        formData.attachments.forEach((file, index) => {
          formDataToSend.append(`attachments[${index}][name]`, file.name);
          formDataToSend.append(`attachments[${index}][size]`, file.size.toString());
          formDataToSend.append(`attachments[${index}][url]`, file.url);
        });
      }

      // Append newFiles if there are any
      newFiles.forEach((file) => {
        formDataToSend.append('newFiles', file);
      });

      const response = await axios.put(`/api/customers/${customerId}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success('Customer updated successfully!');
        router.push(`/customers/${customerId}`);
      } else {
        toast.error(response.data.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message || 'Failed to update customer');
      } else {
        toast.error('Failed to update customer');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDirectUpdate = async () => {
    setSaving(true);
    try {
      const formDataToSend = new FormData();

      // Append each field from formData (except attachments and _id)
      for (const key in formData) {
        if (key !== 'attachments' && key !== '_id') {
          const value = formData[key as keyof Customer];
          formDataToSend.append(key, value?.toString() || '');
        }
      }

      // Append existing attachments
      if (formData.attachments) {
        formData.attachments.forEach((file, index) => {
          formDataToSend.append(`attachments[${index}][name]`, file.name);
          formDataToSend.append(`attachments[${index}][size]`, file.size.toString());
          formDataToSend.append(`attachments[${index}][url]`, file.url);
        });
      }

      // Append newFiles if there are any
      newFiles.forEach((file) => {
        formDataToSend.append('newFiles', file);
      });

      const response = await axios.put(`/api/customers/${customerId}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success('Customer updated successfully!');
        router.push(`/customers/${customerId}`);
      } else {
        toast.error(response.data.message || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data.message || 'Failed to update customer');
      } else {
        toast.error('Failed to update customer');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push(`/customers/${customerId}`);
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
      <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{t('edit.title')}</h1>
            <p className="text-sm sm:text-base text-gray-300">{t('edit.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.firstName')} {t('edit.form.required')}</label>
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
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.lastName')} {t('edit.form.required')}</label>
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
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.address')} {t('edit.form.required')}</label>
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
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.cinPassport')} {t('edit.form.required')}</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.phone')} {t('edit.form.required')}</label>
                <PhoneInput
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.whatsapp')}</label>
                <PhoneInput
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handlePhoneChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.weddingDate')}</label>
                  <input
                    type="date"
                    name="weddingDate"
                    value={formData.weddingDate}
                    onChange={handleChange}
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.weddingLocation')}</label>
                <input
                  type="text"
                  name="weddingLocation"
                  value={formData.weddingLocation}
                  onChange={handleChange}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.weddingCity')} {t('edit.form.required')}</label>
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
                <label className="text-xs sm:text-sm font-medium text-gray-200">{t('edit.form.type')} {t('edit.form.required')}</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Client">{t('edit.types.client')}</option>
                  <option value="Prospect">{t('edit.types.prospect')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <AttachmentsSection
            existingFiles={formData.attachments || []}
            newFiles={newFiles}
            onAddFiles={handleFilesAdded}
            onRemoveExisting={handleRemoveExisting}
            onRemoveNew={handleRemoveNewFile}
          />

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white hover:bg-white/20 transition-colors text-sm w-full sm:w-auto"
            >
{t('edit.buttons.cancel')}
            </button>
            
            <ApprovalHandler
              actionType="edit"
              resourceType="customer"
              resourceId={customerId}
              resourceName={`${formData.firstName} ${formData.lastName}`}
              originalData={originalData}
              newData={{
                ...formData,
                newFiles: newFiles // Include new files in the comparison
              }}
              onDirectAction={handleDirectUpdate}
              onSuccess={() => {
                toast.success(t('edit.messages.updateSuccess'));
                router.push(`/customers/${customerId}`);
              }}
            >
              <button
                type="button"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm w-full sm:w-auto"
              >
{saving ? t('edit.buttons.saving') : t('edit.buttons.saveChanges')}
              </button>
            </ApprovalHandler>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default EditCustomerPage; 