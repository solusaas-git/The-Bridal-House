'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  CheckIcon,
  Cross1Icon,
  EyeOpenIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  PersonIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';
import { Check, X, Eye, Search, Calendar, User, ExternalLink, Trash } from 'lucide-react';
import { RootState } from '@/store/store';
import { setApprovals, updateApprovalStatus, setLoading } from '@/store/reducers/approvalSlice';
import { reviewApproval } from '@/utils/approval';
import Layout from '@/components/Layout';
import { isAdmin, isManager } from '@/utils/permissions';
import ApprovalDetailsModal from '@/components/approvals/ApprovalDetailsModal';
import { useTranslation } from 'react-i18next';

interface Approval {
  _id: string;
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  actionType: 'edit' | 'delete' | 'create';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation' | 'cost';
  resourceId: string;
  originalData: any;
  newData?: any;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ApprovalsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { approvals, loading } = useSelector((state: RootState) => state.approval);
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const { t } = useTranslation('approvals');
  const { t: tCommon } = useTranslation('common');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if user can view approvals (employees and managers+)
  const canViewPage = currentUser?.role?.toLowerCase() === 'employee' || isManager(currentUser);
  const userIsEmployee = currentUser?.role?.toLowerCase() === 'employee';

  useEffect(() => {
    if (canViewPage) {
      loadApprovals();
      
      // Set up auto-refresh every 5 seconds only if enabled and user is admin/manager
      if (!userIsEmployee) {
        const interval = setInterval(() => {
          if (isAutoRefresh && !reviewingId && !showDetailsModal && !deletingId) {
            loadApprovals();
            setCountdown(5); // Reset countdown
          }
        }, 5000);
        
        // Set up countdown timer
        const countdownInterval = setInterval(() => {
          if (isAutoRefresh && !reviewingId && !showDetailsModal && !deletingId) {
            setCountdown(prev => prev > 1 ? prev - 1 : 5);
          }
        }, 1000);
        
        // Cleanup intervals on unmount
        return () => {
          clearInterval(interval);
          clearInterval(countdownInterval);
        };
      }
    }
  }, [canViewPage, userIsEmployee, isAutoRefresh, reviewingId, showDetailsModal, deletingId]);

  const loadApprovals = async () => {
    dispatch(setLoading(true));
    try {
      // Use different endpoints based on user role
      const endpoint = userIsEmployee ? '/api/approvals/my-requests' : '/api/approvals';
      const response = await axios.get(endpoint);
      
      if (response.data) {
        // Both endpoints return arrays directly
        const approvalsData = response.data;
        dispatch(setApprovals(approvalsData || []));
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error(t('messages.loadFailed'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleReview = async (approvalId: string, action: 'approve' | 'reject', comment = '') => {
    setReviewingId(approvalId);
    try {
      await reviewApproval(approvalId, action, comment);
      // Reload approvals to get updated status
      await loadApprovals();
      // The count is automatically updated by the reviewApproval function
    } catch (error: any) {
      console.error('Error reviewing approval:', error);
      toast.error(error.response?.data?.error || t('messages.approveFailed'));
    } finally {
      setReviewingId(null);
    }
  };

  const handleViewDetails = (approval: Approval) => {
    setSelectedApproval(approval);
    setShowDetailsModal(true);
  };

  const handleDelete = async (approvalId: string) => {
    if (!confirm(t('messages.confirmDelete'))) {
      return;
    }

    setDeletingId(approvalId);
    try {
      await axios.delete(`/api/approvals/${approvalId}`);
      toast.success(t('messages.deleteSuccess'));
      // Reload approvals to get updated list
      await loadApprovals();
    } catch (error: any) {
      console.error('Error deleting approval:', error);
      toast.error(error.response?.data?.error || t('messages.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const getActionDescription = (actionType: string, resourceType: string) => {
    const actionMap = {
      edit: t('actionTypes.edit'),
      delete: t('actionTypes.delete'),
      create: t('actionTypes.create'),
    };
    const resourceMap = {
      customer: t('resourceTypes.customer'),
      item: t('resourceTypes.product'),
      payment: t('resourceTypes.payment'),
      reservation: t('resourceTypes.reservation'),
      cost: t('resourceTypes.cost'),
    };
    return `${actionMap[actionType as keyof typeof actionMap]} ${resourceMap[resourceType as keyof typeof resourceMap]}`;
  };

  const getResourceDisplayName = (resourceType: string, originalData: any) => {
    const getResourceTypeConfig = (type: string) => {
      switch (type) {
        case 'customer': 
          return { 
            label: t('resourceTypes.customer'), 
            color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
          };
        case 'item': 
          return { 
            label: t('resourceTypes.product'), 
            color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
          };
        case 'payment': 
          return { 
            label: t('resourceTypes.payment'), 
            color: 'bg-green-500/20 text-green-400 border-green-500/30' 
          };
        case 'reservation': 
          return { 
            label: t('resourceTypes.reservation'), 
            color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
          };
        case 'cost': 
          return { 
            label: t('resourceTypes.cost'), 
            color: 'bg-red-500/20 text-red-400 border-red-500/30' 
          };
        default: 
          return { 
            label: tCommon('unknown'), 
            color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
          };
      }
    };

    const resourceTypeConfig = getResourceTypeConfig(resourceType);
    
    let resourceName = '';
    switch (resourceType) {
      case 'customer':
        resourceName = `${originalData?.firstName || ''} ${originalData?.lastName || ''}`.trim() || tCommon('unknownCustomer');
        break;
      case 'item':
        resourceName = originalData?.name || tCommon('unknownProduct');
        break;
      case 'payment':
        // Prefer customer name if available
        if (originalData?.client) {
          const c = originalData.client;
          const name = `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
          resourceName = name || tCommon('unknownCustomer');
        } else if (originalData?.reservation?.client) {
          const c = originalData.reservation.client;
          const name = `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
          resourceName = name || tCommon('unknownCustomer');
        } else {
          const paymentId = originalData?.paymentNumber || originalData?._id || tCommon('unknown');
          resourceName = `#${paymentId}`;
        }
        break;
      case 'reservation':
        // Prefer customer name if available
        if (originalData?.client) {
          const c = originalData.client;
          const name = `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
          resourceName = name || tCommon('unknownCustomer');
        } else {
          const reservationId = originalData?.reservationNumber || originalData?._id || tCommon('unknown');
          resourceName = `#${reservationId}`;
        }
        break;
      case 'cost':
        const costAmount = originalData?.amount ? `$${originalData.amount}` : '';
        const costCategory = originalData?.category?.name || tCommon('unknownCategory');
        resourceName = `${costAmount} - ${costCategory}`;
        break;
      default:
        resourceName = tCommon('unknownResource');
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${resourceTypeConfig.color}`}>
          {resourceTypeConfig.label}
        </span>
        <span className="text-sm text-white">
          {resourceName}
        </span>
      </div>
    );
  };

  // Filter approvals
  const filteredApprovals = approvals?.filter((approval) => {
    const matchesSearch = 
      approval.requestedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.actionType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || approval.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredApprovals?.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil((filteredApprovals?.length || 0) / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: t('statuses.pending') },
      approved: { color: 'bg-green-500/20 text-green-400', label: t('statuses.approved') },
      rejected: { color: 'bg-red-500/20 text-red-400', label: t('statuses.rejected') },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getActionBadge = (actionType: string) => {
    const actionConfig = {
      edit: { color: 'bg-blue-500/20 text-blue-400', label: t('actionTypes.edit') },
      delete: { color: 'bg-red-500/20 text-red-400', label: t('actionTypes.delete') },
    };

    const config = actionConfig[actionType as keyof typeof actionConfig] || actionConfig.edit;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!canViewPage) {
    return (
      <Layout>
        <div className="text-center text-gray-400">
          <h1 className="text-2xl font-semibold text-white mb-4">{tCommon('accessDenied')}</h1>
          <p>{tCommon('noPermissionViewPage')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-semibold text-white">
              {userIsEmployee ? t('myRequestsTitle') : t('title')}
            </h1>
            {!userIsEmployee && lastUpdated && (
              <p className="text-sm text-gray-400 mt-1">
                {tCommon('lastUpdated')}: {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                {isAutoRefresh && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></span>
                    {tCommon('autoRefreshActive')}
                    {!reviewingId && !showDetailsModal && !deletingId && (
                      <span className="ml-2 text-xs bg-green-600/20 px-2 py-0.5 rounded">
                        {tCommon('next')}: {countdown}s
                      </span>
                    )}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!userIsEmployee && (
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isAutoRefresh 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-white' : 'bg-gray-400'}`}></span>
                {tCommon('autoRefresh')}
              </button>
            )}
            <button
              onClick={loadApprovals}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {loading ? t('messages.loading') : tCommon('refresh')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 sm:px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-sm flex-1 lg:flex-none"
            >
              <option value="all">{t('search.allStatuses')}</option>
              <option value="pending">{t('statuses.pending')}</option>
              <option value="approved">{t('statuses.approved')}</option>
              <option value="rejected">{t('statuses.rejected')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                    {tCommon('request')}
                  </th>
                  {!userIsEmployee && (
                    <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                      {t('table.requestedBy')}
                    </th>
                  )}
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                    {t('table.actionType')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                    {t('table.resource')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                    {t('table.date')}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                    {t('table.status')}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-300 uppercase tracking-wider px-3 sm:px-6 py-3">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {currentItems?.map((approval) => (
                  <tr key={approval._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {getActionDescription(approval.actionType, approval.resourceType)}
                      </div>
                    </td>
                    {!userIsEmployee && (
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-white">
                            {approval.requestedBy?.name || tCommon('unknownUser')}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getActionBadge(approval.actionType)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getResourceDisplayName(approval.resourceType, approval.originalData)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="text-sm text-white">
                          {(() => { const d=new Date(approval.createdAt); const dd=String(d.getUTCDate()).padStart(2,'0'); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const yy=d.getUTCFullYear(); return `${dd}/${mm}/${yy}`; })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(approval)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title={t('actions.viewDetails')}
                        >
                          <Eye className="h-4 w-4 text-blue-400" />
                        </button>
                        {!userIsEmployee && approval.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReview(approval._id, 'approve')}
                              disabled={reviewingId === approval._id}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                              title={t('actions.approve')}
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </button>
                            <button
                              onClick={() => handleReview(approval._id, 'reject')}
                              disabled={reviewingId === approval._id}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                              title={t('actions.reject')}
                            >
                              <X className="h-4 w-4 text-red-400" />
                            </button>
                          </>
                        )}
                        {!userIsEmployee && (
                          <button
                            onClick={() => handleDelete(approval._id)}
                            disabled={deletingId === approval._id}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                            title={tCommon('delete')}
                          >
                            {deletingId === approval._id ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4 text-red-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentItems?.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-400 text-sm sm:text-base">{t('summary.noApprovals')}</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-gray-400">
              {t('summary.showingApprovals', { 
                count: Math.min(indexOfLastItem, filteredApprovals?.length || 0),
                total: filteredApprovals?.length || 0
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded text-white text-sm transition-colors"
              >
                {tCommon('previous')}
              </button>
              <span className="px-3 py-1 text-white text-sm">
                {tCommon('page')} {currentPage} {tCommon('of')} {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded text-white text-sm transition-colors"
              >
                {tCommon('next')}
              </button>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedApproval && (
          <ApprovalDetailsModal
            isOpen={showDetailsModal}
            approval={selectedApproval}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedApproval(null);
            }}
            onReview={handleReview}
            reviewingId={reviewingId}
          />
        )}
      </div>
    </Layout>
  );
} 