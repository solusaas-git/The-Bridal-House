import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { needsApproval } from '@/utils/permissions';
import { createApprovalRequest, getChangedFields } from '@/utils/approval';
import ApprovalRequestModal from './ApprovalRequestModal';
import axios from 'axios'; // Added axios import
import { toast } from 'react-toastify'; // Added toast import

interface ApprovalHandlerProps {
  children: React.ReactNode;
  actionType: 'edit' | 'delete' | 'create';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation' | 'cost';
  resourceId?: string;
  resourceName: string;
  originalData?: any;
  newData?: any;
  onDirectAction?: () => Promise<void>;
  onSuccess?: () => void;
}

const ApprovalHandler: React.FC<ApprovalHandlerProps> = ({
  children,
  actionType,
  resourceType,
  resourceId,
  resourceName,
  originalData,
  newData,
  onDirectAction,
  onSuccess
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (e?: React.FormEvent | React.MouseEvent) => {
    // Prevent default form submission and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Check if user needs approval for this action
    const needsApprovalCheck = needsApproval(currentUser, actionType, resourceType);
    
    if (needsApprovalCheck) {
      setShowApprovalModal(true);
    } else {
      // User can perform action directly
      await performDirectAction();
    }
  };

  const performDirectAction = async () => {
    setIsProcessing(true);
    try {
      if (onDirectAction) {
        await onDirectAction();
      }
      onSuccess?.();
    } catch (error) {
      console.error('Error performing direct action:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovalRequest = async () => {
    setIsProcessing(true);
    try {
      // For edit actions, get only the changed fields
      let changes;
      if (actionType === 'edit' && originalData && newData) {
        console.log('🔍 ApprovalHandler debug - Before getChangedFields:');
        console.log('originalData:', originalData);
        console.log('newData:', newData);
        
        changes = await getChangedFields(originalData, newData);
        console.log('🔍 Detected changes:', changes);
        
        // Handle file uploads for approval requests
        if (changes.attachments && Array.isArray(changes.attachments)) {
          // Check if there are any File objects in the attachments that need uploading
          const filesToUpload = changes.attachments.filter((item: any) => item instanceof File);
          const existingAttachments = changes.attachments.filter((item: any) => !(item instanceof File));
          
          if (filesToUpload.length > 0) {
            // Upload files first
            const uploadedFiles = await uploadFilesForApproval(filesToUpload);
            
            // Replace the attachments with existing ones + uploaded ones
            changes.attachments = [...existingAttachments, ...uploadedFiles];
          }
        }
        
        // Handle product file uploads
        if (newData.newPrimaryPhoto && newData.newPrimaryPhoto instanceof File) {
          const uploadedFile = await uploadFilesForApproval([newData.newPrimaryPhoto]);
          if (uploadedFile.length > 0) {
            changes.primaryPhoto = uploadedFile[0].link;
          }
        }
        
        if (newData.newSecondaryPhotos && Array.isArray(newData.newSecondaryPhotos)) {
          const filesToUpload = newData.newSecondaryPhotos.filter((file: any) => file instanceof File);
          if (filesToUpload.length > 0) {
            const uploadedFiles = await uploadFilesForApproval(filesToUpload);
            changes.secondaryImages = uploadedFiles.map((file: any) => file.link);
          }
        }
        
        if (newData.newVideos && Array.isArray(newData.newVideos)) {
          const filesToUpload = newData.newVideos.filter((file: any) => file instanceof File);
          if (filesToUpload.length > 0) {
            const uploadedFiles = await uploadFilesForApproval(filesToUpload);
            changes.videoUrls = uploadedFiles.map((file: any) => file.link);
          }
        }
      } else {
        changes = newData;
      }

      const approvalRequest = {
        actionType,
        resourceType,
        resourceId,
        originalData,
        newData: changes,
        reason: `Request to ${actionType} ${resourceType}: ${resourceName}`
      };
      
      console.log('🚀 About to send approval request:', approvalRequest);
      
      await createApprovalRequest(approvalRequest);
      
      // Don't call onDirectAction or onSuccess here - the changes haven't been applied yet
      // Only show a success message for the approval request
      toast.success('Approval request submitted successfully. Changes will be applied once approved.');
      
      // Close the modal
      setShowApprovalModal(false);
    } catch (error) {
      console.error('Error creating approval request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to upload files for approval requests
  const uploadFilesForApproval = async (files: File[]): Promise<Array<{name: string, size: number, link: string}>> => {
    const uploadedFiles = [];
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post('/api/uploads', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (response.data.success) {
          uploadedFiles.push({
            name: file.name,
            size: file.size,
            link: response.data.filePath
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        // Continue with other files even if one fails
      }
    }
    
    return uploadedFiles;
  };

  return (
    <>
      <div className="inline-block">
        {React.cloneElement(children as React.ReactElement, {
          onClick: handleAction,
          onSubmit: handleAction,
          disabled: isProcessing
        })}
      </div>

      {showApprovalModal && createPortal(
        <ApprovalRequestModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onSubmit={handleApprovalRequest}
          actionType={actionType}
          resourceType={resourceType}
          resourceName={resourceName}
        />,
        document.body
      )}
    </>
  );
};

export default ApprovalHandler; 