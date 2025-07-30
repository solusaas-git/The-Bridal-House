'use client';

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, X, Edit, Trash2 } from "lucide-react";
import { RootState } from "@/store/store";
import { setCategories, addCategory, removeCategory, updateCategory } from "@/store/reducers/categorySlice";
import axios from "axios";
import { toast } from "react-toastify";

interface Category {
  _id: string;
  name: string;
  description?: string;
  subCategories?: string[];
}

const Categories = () => {
  const dispatch = useDispatch();
  const categories = useSelector((state: RootState) => state.category.categories);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{_id: string; name: string} | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form data for modals
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Fetch categories on component mount
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/categories');
      dispatch(setCategories(response.data));
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Category handlers
  const handleAddCategory = async () => {
    if (!formData.name.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/categories', formData);
      dispatch(addCategory(response.data));
      setShowAddModal(false);
      setFormData({ name: '', description: '' });
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !formData.name.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.put(`/api/categories/${editingCategory._id}`, formData);
      dispatch(updateCategory(response.data));
      setShowEditModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  // Subcategory handlers
  const handleAddSubcategory = async () => {
    if (!selectedCategory || !formData.name.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`/api/categories/${selectedCategory}/subcategories`, {
        name: formData.name
      });
      dispatch(updateCategory(response.data));
      setShowAddModal(false);
      setSelectedCategory(null);
      setFormData({ name: '', description: '' });
      toast.success('Subcategory added successfully');
    } catch (error) {
      console.error('Error adding subcategory:', error);
      toast.error('Failed to add subcategory');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubcategory = async () => {
    if (!editingSubcategory || !formData.name.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.put(
        `/api/categories/${editingSubcategory._id}/subcategories/${editingSubcategory.name}`,
        { name: formData.name }
      );
      dispatch(updateCategory(response.data));
      setShowEditModal(false);
      setEditingSubcategory(null);
      setFormData({ name: '', description: '' });
      toast.success('Subcategory updated successfully');
    } catch (error) {
      console.error('Error updating subcategory:', error);
      toast.error('Failed to update subcategory');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((cat: Category) => cat._id === categoryId);
    setItemToDelete({
      type: "category",
      id: categoryId,
      name: category?.name,
    });
    setShowDeleteModal(true);
  };

  const handleDeleteSubcategory = (categoryId: string, subName: string) => {
    const category = categories.find((cat: Category) => cat._id === categoryId);
    setItemToDelete({
      type: "subcategory",
      id: categoryId,
      name: subName,
      parentName: category?.name,
    });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    setLoading(true);
    try {
      if (itemToDelete.type === "category") {
        await axios.delete(`/api/categories/${itemToDelete.id}`);
                 dispatch(removeCategory(itemToDelete.id));
        toast.success('Category deleted successfully');
      } else {
        const response = await axios.delete(
          `/api/categories/${itemToDelete.id}/subcategories/${itemToDelete.name}`
        );
        dispatch(updateCategory(response.data));
        toast.success('Subcategory deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setEditingSubcategory(null);
    setSelectedCategory(null);
  };

  const openAddModal = (categoryId?: string) => {
    resetForm();
    if (categoryId) {
      setSelectedCategory(categoryId);
    }
    setShowAddModal(true);
  };

  const openEditModal = (category?: Category, subcategory?: {_id: string; name: string}) => {
    resetForm();
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || '' });
    } else if (subcategory) {
      setEditingSubcategory(subcategory);
      setFormData({ name: subcategory.name, description: '' });
    }
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Categories</h2>
        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="grid gap-4">
        {categories?.map((category: Category) => (
          <div
            key={category._id}
            className="bg-white/10 rounded-lg p-4 space-y-4"
          >
            {/* Category */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-gray-400">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(category)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4 text-blue-400" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>

            {/* Subcategories */}
            <div className="flex flex-wrap gap-2">
              {category.subCategories?.map((sub, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full"
                >
                  <span className="text-sm text-white">{sub}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(undefined, { _id: category._id, name: sub })}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubcategory(category._id, sub)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => openAddModal(category._id)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white/60 hover:text-white transition-colors"
              >
                + Add Subcategory
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {showAddModal 
                  ? selectedCategory 
                    ? "Add Subcategory" 
                    : "Add Category"
                  : editingSubcategory 
                    ? "Edit Subcategory" 
                    : "Edit Category"
                }
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter name"
                  required
                />
              </div>

              {!selectedCategory && !editingSubcategory && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showAddModal) {
                      selectedCategory ? handleAddSubcategory() : handleAddCategory();
                    } else {
                      editingSubcategory ? handleEditSubcategory() : handleEditCategory();
                    }
                  }}
                  disabled={loading || !formData.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-white text-sm font-medium transition-colors"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete {itemToDelete?.type} "{itemToDelete?.name}"
                {itemToDelete?.parentName && ` from ${itemToDelete.parentName}`}?
              </p>
              <p className="text-sm text-red-400">This action cannot be undone.</p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-white text-sm font-medium transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories; 