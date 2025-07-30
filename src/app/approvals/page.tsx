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
import { Check, X, Eye, Search, Calendar, User, ExternalLink } from 'lucide-react';
import { RootState } from '@/store/store';
import { setApprovals, updateApprovalStatus, setLoading } from '@/store/reducers/approvalSlice';
import { reviewApproval } from '@/utils/approval';
import Layout from '@/components/Layout';
import { isAdmin } from '@/utils/permissions';
import ApprovalDetailsModal from '@/components/approvals/ApprovalDetailsModal';

interface Approval {
  _id: string;
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  actionType: 'edit' | 'delete';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Check if user is admin
  const userIsAdmin = isAdmin(currentUser);

  useEffect(() => {
    if (userIsAdmin) {
      loadApprovals();
    }
  }, [userIsAdmin]);

  const loadApprovals = async () => {
    dispatch(setLoading(true));
    try {
      const response = await axios.get('/api/approvals');
      dispatch(setApprovals(response.data));
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load approvals');
    }
  };

  const handleReview = async (approvalId: string, action: 'approve' | 'reject', comment = '') => {
    setReviewingId(approvalId);
    try {
      await reviewApproval(approvalId, action, comment);
      // The count is automatically updated by the reviewApproval function
    } catch (error: any) {
      console.error('Error reviewing approval:', error);
      toast.error(error.response?.data?.error || 'Failed to review approval');
    } finally {
      setReviewingId(null);
    }
  };

  const handleViewDetails = (approval: Approval) => {
    setSelectedApproval(approval);
    setShowDetailsModal(true);
  };

  const getActionDescription = (actionType: string, resourceType: string) => {
    const actionMap = {
      edit: 'Edit',
      delete: 'Delete',
    };
    const resourceMap = {
      customer: 'Customer',
      item: 'Product',
      payment: 'Payment',
      reservation: 'Reservation',
    };
    return `${actionMap[actionType as keyof typeof actionMap]} ${resourceMap[resourceType as keyof typeof resourceMap]}`;
  };

  const getResourceDisplayName = (resourceType: string, originalData: any) => {
    const getResourceTypeConfig = (type: string) => {
      switch (type) {
        case 'customer': 
          return { 
            label: 'Customer', 
            color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
          };
        case 'item': 
          return { 
            label: 'Product', 
            color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
          };
        case 'payment': 
          return { 
            label: 'Payment', 
            color: 'bg-green-500/20 text-green-400 border-green-500/30' 
          };
        case 'reservation': 
          return { 
            label: 'Reservation', 
            color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
          };
        default: 
          return { 
            label: 'Unknown', 
            color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
          };
      }
    };

    const resourceTypeConfig = getResourceTypeConfig(resourceType);
    
    let resourceName = '';
    switch (resourceType) {
      case 'customer':
        resourceName = `${originalData?.firstName || ''} ${originalData?.lastName || ''}`.trim() || 'Unknown Customer';
        break;
      case 'item':
        resourceName = originalData?.name || 'Unknown Product';
        break;
      case 'payment':
        const paymentId = originalData?.paymentNumber || originalData?._id || 'Unknown';
        resourceName = `#${paymentId}`;
        break;
      case 'reservation':
        const reservationId = originalData?.reservationNumber || originalData?._id || 'Unknown';
        resourceName = `#${reservationId}`;
        break;
      default:
        resourceName = 'Unknown Resource';
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
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
      approved: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
      rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
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
      edit: { color: 'bg-blue-500/20 text-blue-400', label: 'Edit' },
      delete: { color: 'bg-red-500/20 text-red-400', label: 'Delete' },
    };

    const config = actionConfig[actionType as keyof typeof actionConfig] || actionConfig.edit;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!userIsAdmin) {
    return (
      <Layout>
        <div className="text-center text-gray-400">
          <h1 className="text-2xl font-semibold text-white mb-4">Access Denied</h1>
          <p>You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-white">Approvals</h1>
          <button
            onClick={loadApprovals}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search approvals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Request
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Requested By
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Action
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Resource
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-300 uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {currentItems?.map((approval) => (
                  <tr key={approval._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {getActionDescription(approval.actionType, approval.resourceType)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div className="text-sm text-white">
                          {approval.requestedBy?.name || 'Unknown User'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(approval.actionType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getResourceDisplayName(approval.resourceType, approval.originalData)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="text-sm text-white">
                          {new Date(approval.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(approval.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(approval)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-blue-400" />
                        </button>
                        {approval.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReview(approval._id, 'approve')}
                              disabled={reviewingId === approval._id}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </button>
                            <button
                              onClick={() => handleReview(approval._id, 'reject')}
                              disabled={reviewingId === approval._id}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <X className="h-4 w-4 text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentItems?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No approval requests found.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredApprovals?.length || 0)} of {filteredApprovals?.length || 0} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded text-white text-sm transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-white text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded text-white text-sm transition-colors"
              >
                Next
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