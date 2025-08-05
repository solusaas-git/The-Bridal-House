'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, X, Edit, Trash2, Lock, Check } from 'lucide-react';
import { RootState } from '@/store/store';
import { setRoles, addRole, updateRole, removeRole } from '@/store/reducers/settingsSlice';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
  isSystem?: boolean;
}

const Roles = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const roles = settings.settings.roles;
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');

  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  // Form data for add/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });

  // Available permissions
  const availablePermissions = [
    { id: 'dashboard', label: 'Dashboard Access', category: 'Basic' },
    { id: 'customers', label: 'Customers Management', category: 'Basic' },
    { id: 'reservations', label: 'Reservations Management', category: 'Basic' },
    { id: 'payments', label: 'Payments Management', category: 'Basic' },
    { id: 'products', label: 'Products Management', category: 'Basic' },
    { id: 'approvals', label: 'Approvals Management', category: 'Advanced' },
    { id: 'settings', label: 'Settings Management', category: 'Advanced' },
    { id: 'user-management', label: 'User Management', category: 'Admin' },
    { id: 'role-management', label: 'Role Management', category: 'Admin' },
  ];

  const groupedPermissions = availablePermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof availablePermissions>);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: []
    });
  };

  const handleAddRole = () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    const newRole: Role = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      permissions: formData.permissions,
      isSystem: false
    };

    dispatch(addRole(newRole));
    toast.success('Role added successfully');
    setIsAddingRole(false);
    resetForm();
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    });
  };

  const handleSaveEdit = () => {
    if (!editingRole || !formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    const updatedRole: Role = {
      ...editingRole,
      name: formData.name.trim(),
      description: formData.description.trim(),
      permissions: formData.permissions
    };

    dispatch(updateRole(updatedRole));
          toast.success(t('sections.roles.roleUpdated'));
    setEditingRole(null);
    resetForm();
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      toast.error('Cannot delete system roles');
      return;
    }
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (roleToDelete) {
      dispatch(removeRole(roleToDelete.id));
      toast.success(t('sections.roles.roleDeleted'));
      setShowDeleteModal(false);
      setRoleToDelete(null);
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  const renderPermissionsGrid = () => (
    <div className="space-y-6">
      {Object.entries(groupedPermissions).map(([category, permissions]) => (
        <div key={category} className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">{category}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {permissions.map((permission) => (
              <label key={permission.id} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.permissions.includes(permission.id)}
                  onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className={formData.permissions.includes(permission.id) ? 'text-white' : 'text-gray-400'}>
                  {permission.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Role Management</h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage user roles and their permissions. Control what actions each role can perform.
          </p>
        </div>
        <button
          onClick={() => setIsAddingRole(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t('sections.roles.addRole')}
        </button>
      </div>

      {/* Add Role Form */}
      {isAddingRole && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">Create New Role</h3>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={50}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter role description..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                maxLength={200}
              />
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">Permissions</h4>
            {renderPermissionsGrid()}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleAddRole}
              disabled={!formData.name.trim() || loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
            >
              Create Role
            </button>
            <button
              onClick={() => {
                setIsAddingRole(false);
                resetForm();
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
            {editingRole && editingRole.id === role.id ? (
              // Edit Mode
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={role.isSystem || loading}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      maxLength={50}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      rows={3}
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">Permissions</h4>
                  {role.isSystem && (
                    <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 text-sm">
                        <strong>Note:</strong> This is a system role. You can modify permissions, but the role cannot be deleted.
                      </p>
                    </div>
                  )}
                  {renderPermissionsGrid()}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4 inline mr-2" />
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingRole(null);
                      resetForm();
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4 inline mr-2" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                      <Lock className={`h-5 w-5 ${role.isSystem ? 'text-blue-400' : 'text-green-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        {role.name}
                        {role.isSystem && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            System Role
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400">{role.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditRole(role)}
                      disabled={loading}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Edit Role"
                    >
                      <Edit className="h-4 w-4 text-blue-400" />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        disabled={loading}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Role"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-400">
                  <span className="font-medium">Permissions: </span>
                  {role.permissions?.length || 0} granted
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">
                Are you sure you want to delete role "{roleToDelete.name}"?
              </p>
              <p className="text-sm text-red-400">This action cannot be undone.</p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-white text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {roles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No roles configured yet.</p>
          <button
            onClick={() => setIsAddingRole(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Create First Role
          </button>
        </div>
      )}
    </div>
  );
};

export default Roles; 