import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ApprovalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  actionType: 'edit' | 'delete' | 'create';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation' | 'cost';
  resourceName: string;
}

const ApprovalRequestModal: React.FC<ApprovalRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  actionType, 
  resourceType, 
  resourceName 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit();
      onClose();
    } catch (error) {
      console.error('Error submitting approval request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionText = () => {
    const actionMap = {
      edit: 'edit',
      delete: 'delete',
      create: 'create',
    };
    return actionMap[actionType] || actionType;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            Request Approval
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              You are requesting permission to <strong>{getActionText()}</strong> the {resourceType}: 
              <strong> {resourceName}</strong>
            </p>
            <p className="text-gray-400 text-xs mt-2">
              An admin will review your request and you'll be notified of the decision.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalRequestModal; 