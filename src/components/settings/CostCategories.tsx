'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { RootState } from '@/store/store';
import { isAdmin } from '@/utils/permissions';
import { useTranslation } from 'react-i18next';

interface CostCategory {
  _id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  description: string;
  color: string;
}

const CostCategories = () => {
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const userIsAdmin = isAdmin(currentUser);
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#6366F1', '#84CC16', '#F97316', '#06B6D4'
  ];

  useEffect(() => {
    fetchCostCategories();
  }, []);

  const fetchCostCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/cost-categories');
      setCostCategories(response.data.costCategories);
    } catch (error) {
      console.error('Error fetching cost categories:', error);
      toast.error('Failed to fetch cost categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setSubmitting(true);

    try {
      if (editingId) {
        // Update existing category
        const response = await axios.put(`/api/cost-categories/${editingId}`, formData);
        setCostCategories(prev =>
          prev.map(cat => cat._id === editingId ? response.data.costCategory : cat)
        );
        toast.success(t('sections.costCategories.categoryUpdated'));
      } else {
        // Create new category
        const response = await axios.post('/api/cost-categories', formData);
        setCostCategories(prev => [...prev, response.data.costCategory]);
        toast.success(t('sections.costCategories.categoryCreated'));
      }

      // Reset form
      setFormData({ name: '', description: '', color: '#3B82F6' });
      setShowForm(false);
      setEditingId(null);
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save category';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: CostCategory) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color
    });
    setEditingId(category._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cost category?')) {
      return;
    }

    try {
      await axios.delete(`/api/cost-categories/${id}`);
      setCostCategories(prev => prev.filter(cat => cat._id !== id));
      toast.success(t('sections.costCategories.categoryDeleted'));
    } catch (error: unknown) {
      console.error('Error deleting cost category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete cost category';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Cost Categories</h2>
        {userIsAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Category
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              {editingId ? 'Edit Category' : 'Add New Category'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category name"
                  required
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                                      {t('sections.costCategories.color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-white' : 'border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {t('sections.costCategories.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Category description"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-300 hover:text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                                  {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/10">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {costCategories.map((category) => (
              <div
                key={category._id}
                className="bg-white/5 rounded-lg border border-white/10 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="font-medium text-white">{category.name}</h3>
                  </div>
                  
                  {userIsAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {category.description && (
                  <p className="text-sm text-gray-300 mb-2">
                    {category.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-400">
                  Created: {new Date(category.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {costCategories.length === 0 && (
            <div className="text-center py-8 text-gray-400">
                              {t('categories.noCategoriesFound')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostCategories; 