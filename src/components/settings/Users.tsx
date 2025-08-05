'use client';

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, X, Edit, Trash2, Mail, UserCheck } from "lucide-react";
import { RootState } from "@/store/store";
import { setUsers, addUser, removeUser, updateUser } from "@/store/reducers/userSlice";
import { setCurrentUser } from "@/store/reducers/authSlice";
import axios from "axios";
import { toast } from "react-toastify";
import { isAdmin } from "@/utils/permissions";
import { useTranslation } from 'react-i18next';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

const Users = () => {
  const dispatch = useDispatch();
  const users = useSelector((state: RootState) => state.user.users);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  // Form data for modals
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    status: 'Active'
  });

  const [errors, setErrors] = useState<any>({});

  // Available roles
  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' }
  ];

  // Fetch users on component mount
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/users');
      if (response.data.users) {
        dispatch(setUsers(response.data.users));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  }, [dispatch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Validation
  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation for new users or when changing password
    if (!editingUser) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (formData.password) {
      // Validation when changing password for existing user
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // User handlers
  const handleAddUser = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/api/users', formData);
      dispatch(addUser(response.data));
      setShowAddModal(false);
      resetForm();
      toast.success('User added successfully');
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.response?.data?.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !validateForm()) return;
    
    setLoading(true);
    try {
      const submitData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
      };

      // Only include password if provided
      if (formData.password && formData.password.trim()) {
        submitData.password = formData.password;
      }

      const response = await axios.put(`/api/users/${editingUser._id}`, submitData);
      dispatch(updateUser(response.data));
      setShowEditModal(false);
      setEditingUser(null);
      resetForm();
      toast.success(t('sections.users.userUpdated'));
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setItemToDelete({
      id: user._id,
      type: "user",
      name: user.name,
    });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    setLoading(true);
    try {
      await axios.delete(`/api/users/${itemToDelete.id}`);
      dispatch(removeUser(itemToDelete.id));
      toast.success(t('sections.users.userDeleted'));
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleImpersonate = async (user: User) => {
    if (!user || !user._id) return;

    setImpersonating(true);
    try {
      const response = await axios.post('/api/auth/impersonate', { userId: user._id });
      dispatch(setCurrentUser(response.data.user));
      toast.success(`Now impersonating ${user.name}`);
      // Optionally redirect to dashboard or reload page
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Error impersonating user:', error);
      toast.error(error.response?.data?.message || 'Failed to impersonate user');
    } finally {
      setImpersonating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
      status: 'Active'
    });
    setErrors({});
    setEditingUser(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || 'employee',
      status: user.status || 'Active'
    });
    setErrors({});
    setShowEditModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Users</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('sections.users.addUser')}
        </button>
      </div>

      <div className="grid gap-4">
        {users?.map((user: User) => (
          <div
            key={user._id}
            className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white">{user.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              <div className="flex gap-2">
                <span className="inline-block px-2 py-1 bg-white/5 rounded-full text-xs text-white">
                  {user.role}
                </span>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs ${
                    user.status === "Active"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {user.status || 'Active'}
                </span>
                {user.isVerified && (
                  <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs">
                    Verified
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditModal(user)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4 text-blue-400" />
              </button>
              <button
                onClick={() => handleDeleteUser(user)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
              {isAdmin(currentUser) && user._id !== currentUser?._id && (
                <button
                  onClick={() => handleImpersonate(user)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  disabled={impersonating}
                  title="Impersonate User"
                >
                  <UserCheck className="h-4 w-4 text-purple-400" />
                </button>
              )}
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
                {showAddModal ? "Add User" : "Edit User"}
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
                  {t('sections.users.userName')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-white/10 border ${
                    errors.name ? 'border-red-500' : 'border-white/20'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter name"
                  required
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('sections.users.userEmail')} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-white/10 border ${
                    errors.email ? 'border-red-500' : 'border-white/20'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter email"
                  required
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {editingUser && <span className="text-gray-400 text-xs">(leave blank to keep current)</span>} *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-white/10 border ${
                    errors.password ? 'border-red-500' : 'border-white/20'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                />
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password {editingUser && <span className="text-gray-400 text-xs">(if changing)</span>}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-white/10 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-white/20'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder={editingUser ? "Confirm new password if changing" : "Confirm password"}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('sections.users.userRole')}
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value} className="bg-gray-800">
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('sections.users.userStatus')}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">{t('sections.users.active')}</option>
                  <option value="Inactive">{t('sections.users.inactive')}</option>
                </select>
              </div>

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
                    showAddModal ? handleAddUser() : handleEditUser();
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-white text-sm font-medium transition-colors"
                >
                  {loading ? 'Saving...' : showAddModal ? 'Add User' : 'Save Changes'}
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
                Are you sure you want to delete user "{itemToDelete?.name}"?
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

export default Users; 