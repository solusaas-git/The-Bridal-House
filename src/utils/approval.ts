import axios from 'axios';
import { toast } from 'react-toastify';
import { store } from '@/store/store';
import { addApproval } from '@/store/reducers/approvalSlice';
import { updateApprovalStatus } from '@/store/reducers/approvalSlice';

export interface ApprovalRequest {
  actionType: 'edit' | 'delete' | 'create';
  resourceType: 'customer' | 'item' | 'payment' | 'reservation' | 'cost';
  resourceId?: string;
  originalData?: any;
  newData?: any;
  reason?: string;
}

export const createApprovalRequest = async (requestData: ApprovalRequest) => {
  try {
    const response = await axios.post('/api/approvals', requestData);
    toast.success(response.data.message);
    
    // Add the approval to the store and update count
    if (response.data.approval) {
      store.dispatch(addApproval(response.data.approval));
    }
    
    return response.data.approval;
  } catch (error: any) {
    console.error('Error creating approval request:', error);
    console.error('Error response data:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Request data that was sent:', requestData);
    toast.error(error.response?.data?.error || 'Failed to submit approval request');
    throw error;
  }
};

export const reviewApproval = async (approvalId: string, action: 'approve' | 'reject', comment: string) => {
  try {
    const response = await axios.put(`/api/approvals/${approvalId}/review`, {
      action,
      comment
    });
    
    // Update the approval status in the store
    store.dispatch(updateApprovalStatus({ 
      id: approvalId, 
      status: action === 'approve' ? 'approved' : 'rejected' 
    }));
    
    toast.success(response.data.message);
    return response.data.approval;
  } catch (error: any) {
    console.error('Error reviewing approval:', error);
    toast.error(error.response?.data?.error || 'Failed to review approval');
    throw error;
  }
};

// Helper function to get item names from database
// NOTE: We fetch each product by id to avoid pagination issues from /api/products list
const getItemNames = async (itemIds: string[]) => {
  try {
    const results = await Promise.all(
      itemIds.map(async (itemId: string) => {
        try {
          const response = await axios.get(`/api/products/${itemId}`);
          const product = response.data;
          return {
            id: itemId,
            name: product?.name || `Item ${itemId}`,
            image: product?.primaryPhoto ? `/api/uploads/${product.primaryPhoto}` : null,
          };
        } catch (innerError) {
          // Fallback to generic label if a product cannot be fetched
          return { id: itemId, name: `Item ${itemId}`, image: null };
        }
      })
    );
    return results;
  } catch (error) {
    console.error('Error fetching item names:', error);
    return itemIds.map((itemId: string) => ({ id: itemId, name: `Item ${itemId}`, image: null }));
  }
};

export const getChangedFields = async (originalData: any, newData: any): Promise<Record<string, any>> => {
  const changes: Record<string, any> = {};
  
  console.log('🔍 getChangedFields called with:');
  console.log('- originalData keys:', Object.keys(originalData || {}));
  console.log('- newData keys:', Object.keys(newData || {}));
  console.log('- originalData.category:', originalData?.category);
  console.log('- originalData.amount:', originalData?.amount);
  console.log('- originalData.date:', originalData?.date);
  console.log('- originalData.createdBy:', originalData?.createdBy);
  
  // Handle reservation-specific field mapping
  if (originalData && newData && originalData.pickupDate) {
    console.log('🎯 Detected: RESERVATION data type');
    // This is a reservation comparison
    const originalReservation = originalData;
    const newFormData = newData;
    
    // Compare items (array of objects vs array of IDs)
    if (originalReservation.items && newFormData.items) {
      const originalItemIds = originalReservation.items.map((item: any) => item._id || item);
      const newItemIds = newFormData.items;
      
      // Sort both arrays for comparison
      const sortedOriginalIds = originalItemIds.sort();
      const sortedNewIds = newItemIds.sort();
      
      if (JSON.stringify(sortedOriginalIds) !== JSON.stringify(sortedNewIds)) {
        // Get item names from database for better display
        const newItemsWithNames = await getItemNames(newItemIds);
        changes.items = newItemsWithNames;
      }
    }
    
    // Compare dates and times - support both split (date + time) and combined ISO-like strings
    const buildNewDateString = (dateValue?: string, timeValue?: string) => {
      if (!dateValue) return '';
      // If already includes time component, use as-is
      if (dateValue.includes('T') && !timeValue) return dateValue;
      return `${dateValue}T${timeValue || '00:00'}`;
    };

    // Normalize a Date object to a timezone-agnostic yyyy-MM-ddTHH:mm string for comparison
    const toMinuteString = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    if (originalReservation.pickupDate && newFormData.pickupDate) {
      const originalPickupDate = new Date(originalReservation.pickupDate);
      const newPickupDateString = buildNewDateString(newFormData.pickupDate, newFormData.pickupTime);
      const newPickupDate = new Date(newPickupDateString);

      if (!isNaN(originalPickupDate.getTime()) && !isNaN(newPickupDate.getTime())) {
        // Compare using minute precision string to avoid timezone offset false positives
        if (toMinuteString(originalPickupDate) !== toMinuteString(newPickupDate)) {
          changes.pickupDate = newPickupDateString;
        }
      }
    }

    if (originalReservation.returnDate && newFormData.returnDate) {
      const originalReturnDate = new Date(originalReservation.returnDate);
      const newReturnDateString = buildNewDateString(newFormData.returnDate, newFormData.returnTime);
      const newReturnDate = new Date(newReturnDateString);

      if (!isNaN(originalReturnDate.getTime()) && !isNaN(newReturnDate.getTime())) {
        if (toMinuteString(originalReturnDate) !== toMinuteString(newReturnDate)) {
          changes.returnDate = newReturnDateString;
        }
      }
    }

    if (originalReservation.availabilityDate && newFormData.availabilityDate) {
      const originalAvailabilityDate = new Date(originalReservation.availabilityDate);
      const newAvailabilityDateString = buildNewDateString(newFormData.availabilityDate, newFormData.availabilityTime);
      const newAvailabilityDate = new Date(newAvailabilityDateString);

      if (!isNaN(originalAvailabilityDate.getTime()) && !isNaN(newAvailabilityDate.getTime())) {
        if (toMinuteString(originalAvailabilityDate) !== toMinuteString(newAvailabilityDate)) {
          changes.availabilityDate = newAvailabilityDateString;
        }
      }
    }
    
    // Compare other fields - only if they actually changed
    const fieldsToCompare = [
      'type', 'status', 'additionalCost', 'bufferBefore', 'bufferAfter',
      'availability', 'securityDepositAmount', 'advanceAmount', 'notes',
      'itemsTotal', 'subtotal', 'total'
    ];
    
    for (const field of fieldsToCompare) {
      const originalValue = originalReservation[field];
      const newValue = newFormData[field];

      // Skip when the field is not provided in the new form data
      if (typeof newValue === 'undefined') {
        continue;
      }
      
      // Handle numeric comparisons
      if (typeof originalValue === 'number' && typeof newValue === 'number') {
        if (originalValue !== newValue) {
          changes[field] = newValue;
        }
      }
      // Handle string comparisons
      else if (typeof originalValue === 'string' && typeof newValue === 'string') {
        if (originalValue !== newValue) {
          changes[field] = newValue;
        }
      }
      // Handle mixed types or undefined values
      else if (originalValue !== newValue) {
        // Normalize empty string and null/undefined equivalence
        const normalizedOriginal = originalValue === null || typeof originalValue === 'undefined' ? '' : originalValue;
        const normalizedNew = newValue === null || typeof newValue === 'undefined' ? '' : newValue;
        if (normalizedOriginal !== normalizedNew) {
          changes[field] = newValue;
        }
      }
    }

    // Compare client (by id) if provided
    if (originalReservation.client || newFormData.client) {
      const originalClientId = originalReservation.client?._id || originalReservation.client;
      const newClientId = newFormData.client?._id || newFormData.client;
      if (typeof newClientId !== 'undefined' && originalClientId !== newClientId) {
        changes.client = newFormData.client;
      }
    }
    
    return changes;
  }
  
  // Handle customer-specific field mapping
  if (originalData && newData && (originalData.firstName || originalData.lastName)) {
    console.log('🎯 Detected: CUSTOMER data type');
    // This is a customer comparison
    const originalCustomer = originalData;
    const newCustomer = newData;
    
    // Compare basic fields
    const fieldsToCompare = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'idNumber',
      'weddingLocation', 'weddingCity', 'type', 'whatsapp'
    ];
    
    for (const field of fieldsToCompare) {
      if (originalCustomer[field] !== newCustomer[field]) {
        changes[field] = newCustomer[field];
      }
    }
    
    // Compare wedding date and time
    if (originalCustomer.weddingDate || newCustomer.weddingDate) {
      const originalDate = originalCustomer.weddingDate ? originalCustomer.weddingDate.split('T')[0] : '';
      const newDate = newCustomer.weddingDate || '';
      const originalTime = originalCustomer.weddingTime || '00:00';
      const newTime = newCustomer.weddingTime || '00:00';
      
      if (originalDate !== newDate || originalTime !== newTime) {
        changes.weddingDate = newDate;
        changes.weddingTime = newTime;
      }
    }
    
    // Compare attachments (if they exist)
    if (originalCustomer.attachments || newCustomer.attachments || newCustomer.newFiles) {
      const originalAttachments = originalCustomer.attachments || [];
      const newAttachments = newCustomer.attachments || [];
      const newFiles = newCustomer.newFiles || [];
      
      // Check for specific changes
      const hasNewFiles = newFiles.length > 0;
      const hasDeletedFiles = originalAttachments.length > newAttachments.length;
      const hasModifiedAttachments = JSON.stringify(originalAttachments) !== JSON.stringify(newAttachments);
      
      // Check if there are new files, deleted files, or modified attachments
      if (hasNewFiles || hasDeletedFiles || hasModifiedAttachments) {
        // Consolidate all attachment changes into a single field
        const finalAttachments = [...newAttachments];
        
        // Add new files to the attachments
        if (newFiles.length > 0) {
          finalAttachments.push(...newFiles);
        }
        
        // Only include attachments in changes if there are actual changes
        if (finalAttachments.length > 0 || hasDeletedFiles) {
          changes.attachments = finalAttachments;
          
          // Add specific information about what changed
          if (hasDeletedFiles) {
            const deletedFiles = originalAttachments.filter((originalFile: any) => 
              !newAttachments.some((newFile: any) => newFile.link === originalFile.link)
            );
            changes.deletedAttachments = deletedFiles;
          }
        }
      }
    }
    
    return changes;
  }
  
  // Handle payment-specific field mapping
  if (originalData && newData && (originalData.paymentDate || (originalData.amount && (originalData.paymentMethod || originalData.paymentType || originalData.client)))) {
    console.log('🎯 Detected: PAYMENT data type');
    // This is a payment comparison
    const originalPayment = originalData;
    const newPayment = newData;
    
    // Compare basic fields with proper type handling
    const fieldsToCompare = [
      'amount', 'paymentMethod', 'paymentType', 'reference', 'note'
    ];
    
    for (const field of fieldsToCompare) {
      const originalValue = originalPayment[field];
      const newValue = newPayment[field];
      
      // Handle numeric comparisons (amount)
      if (field === 'amount') {
        const originalNum = typeof originalValue === 'string' ? parseFloat(originalValue) : originalValue;
        const newNum = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
        
        if (originalNum !== newNum) {
          changes[field] = newValue;
        }
      }
      // Handle string comparisons
      else if (typeof originalValue === 'string' && typeof newValue === 'string') {
        if (originalValue !== newValue) {
          changes[field] = newValue;
        }
      }
      // Handle mixed types or undefined values
      else if (originalValue !== newValue) {
        changes[field] = newValue;
      }
    }
    
    // Compare payment date and time - only if they actually changed
    if (originalPayment.paymentDate && newPayment.paymentDate) {
      const originalDate = originalPayment.paymentDate.split('T')[0];
      const newDate = newPayment.paymentDate.split('T')[0];
      const originalTime = originalPayment.paymentTime || originalPayment.paymentDate.split('T')[1]?.substring(0, 5) || '00:00';
      const newTime = newPayment.paymentTime || '00:00';
      
      if (originalDate !== newDate || originalTime !== newTime) {
        changes.paymentDate = newDate;
        changes.paymentTime = newTime;
      }
    }
    
    // Compare client (only if it actually changed) - compare by ID
    const originalClientId = originalPayment.client?._id || originalPayment.client;
    const newClientId = newPayment.client?._id || newPayment.client;
    
    if (originalClientId !== newClientId) {
      changes.client = newPayment.client;
    }
    
    // Compare reservation (only if it actually changed) - compare by ID
    const originalReservationId = originalPayment.reservation?._id || originalPayment.reservation;
    const newReservationId = newPayment.reservation?._id || newPayment.reservation;
    
    if (originalReservationId !== newReservationId) {
      changes.reservation = newPayment.reservation;
    }
    
    // Compare attachments (if they exist) - only if there are actual changes
    if (originalPayment.attachments || newPayment.existingAttachments || newPayment.newFiles) {
      const originalAttachments = originalPayment.attachments || [];
      const existingAttachments = newPayment.existingAttachments || [];
      const newFiles = newPayment.newFiles || [];
      

      
      // Check if there are actual changes
      const hasNewFiles = newFiles.length > 0;
      const hasDeletedFiles = newPayment.deletedAttachments && newPayment.deletedAttachments.length > 0;
      
      // Compare attachments by name and url/link, not by entire object structure
      const originalAttachmentKeys = originalAttachments.map((att: any) => ({
        name: att.name,
        url: att.url || att.link
      }));
      const existingAttachmentKeys = existingAttachments.map((att: any) => ({
        name: att.name,
        url: att.url || att.link
      }));
      const hasModifiedAttachments = JSON.stringify(originalAttachmentKeys) !== JSON.stringify(existingAttachmentKeys);
      
      if (hasNewFiles || hasDeletedFiles || hasModifiedAttachments) {
        // Only include NEW attachments in changes, not existing ones
        // The approval review will handle merging with existing attachments
        if (hasNewFiles) {
          changes.attachments = newFiles;  // Only send new files
        }
        
        // Add specific information about what changed
        if (hasDeletedFiles) {
          changes.deletedAttachments = newPayment.deletedAttachments;
        }
      }
    }
    
    return changes;
  }
  
  // Handle cost-specific field mapping
  if (originalData && newData && (
    originalData.category || 
    originalData.amount !== undefined || 
    newData.category || 
    newData.amount !== undefined ||
    (originalData.date && originalData.createdBy) // costs have date and createdBy
  )) {
    console.log('🎯 Detected: COST data type');
    console.log('- Condition checks:');
    console.log('  - originalData.category:', !!originalData.category);
    console.log('  - originalData.amount !== undefined:', originalData.amount !== undefined);
    console.log('  - newData.category:', !!newData.category);
    console.log('  - newData.amount !== undefined:', newData.amount !== undefined);
    console.log('  - originalData.date && originalData.createdBy:', !!(originalData.date && originalData.createdBy));
    
    // This is a cost comparison
    const originalCost = originalData;
    const newCost = newData;
    
    console.log('🔍 Cost comparison debug:');
    console.log('Original cost:', originalCost);
    console.log('New cost:', newCost);
    
    // Compare basic fields
    const fieldsToCompare = ['date', 'category', 'amount', 'notes', 'relatedReservation', 'relatedProduct'];
    
    for (const field of fieldsToCompare) {
      const originalValue = originalCost[field];
      const newValue = newCost[field];
      
      // Skip if the field is not present in newData (not being changed)
      if (!(field in newCost)) {
        continue;
      }
      
      // Handle special cases
      if (field === 'amount') {
        const originalAmount = parseFloat(originalValue) || 0;
        const newAmount = parseFloat(newValue) || 0;
        if (originalAmount !== newAmount) {
          changes[field] = newAmount;
        }
      } else if (field === 'category') {
        // Compare by ID if objects, otherwise direct comparison
        const originalCategoryId = originalValue?._id || originalValue;
        const newCategoryId = newValue?._id || newValue;
        if (originalCategoryId !== newCategoryId) {
          changes[field] = newValue;
        }
      } else if (field === 'relatedReservation' || field === 'relatedProduct') {
        // Compare by ID if objects, otherwise direct comparison
        // Treat empty strings as null for these optional fields
        const originalRelatedId = originalValue?._id || originalValue || null;
        const newRelatedId = newValue?._id || newValue || null;
        
        // Normalize empty strings to null for comparison
        const normalizedOriginal = originalRelatedId === '' ? null : originalRelatedId;
        const normalizedNew = newRelatedId === '' ? null : newRelatedId;
        
        if (normalizedOriginal !== normalizedNew) {
          changes[field] = newValue;
        }
      } else if (field === 'date') {
        // Handle date comparison - original is ISO string, new is date string
        const originalDate = originalValue ? new Date(originalValue).toISOString().split('T')[0] : '';
        const newDate = newValue || '';
        if (originalDate !== newDate) {
          changes[field] = newValue;
        }
      } else {
        // Handle string and other types, treating empty strings and null as equivalent
        const normalizedOriginal = originalValue === null ? '' : originalValue;
        const normalizedNew = newValue === null ? '' : newValue;
        if (normalizedOriginal !== normalizedNew) {
          changes[field] = newValue;
        }
      }
    }
    
    // Compare attachments (if they exist)
    if (originalCost.attachments || newCost.attachments || newCost.newFiles) {
      const originalAttachments = originalCost.attachments || [];
      const newAttachments = newCost.attachments || [];
      const newFiles = newCost.newFiles || [];
      
      // Check if there are actual changes
      const hasNewFiles = newFiles.length > 0;
      const hasDeletedFiles = newCost.deletedAttachments && newCost.deletedAttachments.length > 0;
      
      // Compare attachments by name and url
      const originalAttachmentKeys = originalAttachments.map((att: any) => ({
        name: att.name,
        url: att.url || att.link
      }));
      const newAttachmentKeys = newAttachments.map((att: any) => ({
        name: att.name,
        url: att.url || att.link
      }));
      const hasModifiedAttachments = JSON.stringify(originalAttachmentKeys) !== JSON.stringify(newAttachmentKeys);
      
      if (hasNewFiles || hasDeletedFiles || hasModifiedAttachments) {
        // Only include NEW attachments in changes, not existing ones
        // The approval review will handle merging with existing attachments
        if (hasNewFiles) {
          changes.attachments = newFiles;  // Only send new files
        }
        
        // Add specific information about what changed
        if (hasDeletedFiles) {
          changes.deletedAttachments = newCost.deletedAttachments;
        }
      }
    }
    
    return changes;
  }
  
  // Handle product-specific field mapping
  if (originalData && newData && (originalData.name || originalData.category)) {
    // This is a product comparison
    const originalProduct = originalData;
    const newProduct = newData;
    
    // Compare basic fields with proper type handling
    const fieldsToCompare = [
      'name', 'rentalCost', 'buyCost', 'sellPrice', 'size', 'category', 'subCategory', 'quantity', 'status'
    ];
    
    for (const field of fieldsToCompare) {
      const originalValue = originalProduct[field];
      const newValue = newProduct[field];
      
      // Skip if the field is not present in newData (not being changed)
      if (!(field in newProduct)) {
        continue;
      }
      
      // Handle string comparisons
      if (typeof originalValue === 'string' && typeof newValue === 'string') {
        if (originalValue !== newValue) {
          changes[field] = newValue;
        }
      }
      // Handle numeric comparisons
      else if (field === 'rentalCost' || field === 'buyCost' || field === 'sellPrice' || field === 'size' || field === 'quantity') {
        const originalNum = typeof originalValue === 'string' ? parseFloat(originalValue) : originalValue;
        const newNum = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
        
        // Only include if both values are valid numbers and they're different
        if (!isNaN(originalNum) && !isNaN(newNum) && originalNum !== newNum) {
          changes[field] = newValue;
        }
        // Handle case where one is zero/undefined and the other is not
        else if ((originalNum === 0 || originalNum === undefined || originalNum === null) && 
                 (newNum !== 0 && newNum !== undefined && newNum !== null)) {
          changes[field] = newValue;
        }
        else if ((newNum === 0 || newNum === undefined || newNum === null) && 
                 (originalNum !== 0 && originalNum !== undefined && originalNum !== null)) {
          changes[field] = newValue;
        }
      }
      // Handle mixed types or undefined values
      else if (originalValue !== newValue) {
        changes[field] = newValue;
      }
    }
    
    // Compare category specifically - handle object vs string comparison
    if (newProduct.category) {
      const originalCategoryId = originalProduct.category?._id || originalProduct.category;
      const newCategoryId = newProduct.category;
      
      if (originalCategoryId !== newCategoryId) {
        changes.category = newCategoryId;
      }
    }
    
    // Compare images (if they exist) - only if there are actual changes
    if (newProduct.hasNewPrimaryPhoto) {
      if (newProduct.primaryPhoto && newProduct.primaryPhoto.startsWith('/')) {
        // This is an uploaded file path
        changes.primaryPhoto = newProduct.primaryPhoto;
      } else {
        changes.primaryPhoto = 'New file uploaded';
      }
    }
    
    if (newProduct.hasNewSecondaryPhotos) {
      if (newProduct.secondaryImages && Array.isArray(newProduct.secondaryImages)) {
        // These are uploaded file paths
        changes.secondaryImages = newProduct.secondaryImages;
      } else {
        changes.secondaryImages = 'New files uploaded';
      }
    }
    
    if (newProduct.hasNewVideos) {
      if (newProduct.videoUrls && Array.isArray(newProduct.videoUrls)) {
        // These are uploaded file paths
        changes.videoUrls = newProduct.videoUrls;
      } else {
        changes.videoUrls = 'New files uploaded';
      }
    }
    
    // Compare existing images/videos only if they're being modified
    if (newProduct.existingSecondaryImages && Array.isArray(newProduct.existingSecondaryImages)) {
      const originalImages = originalProduct.secondaryImages || [];
      const newImages = newProduct.existingSecondaryImages;
      
      if (JSON.stringify(originalImages) !== JSON.stringify(newImages)) {
        changes.secondaryImages = newImages;
      }
    }
    
    if (newProduct.existingVideoUrls && Array.isArray(newProduct.existingVideoUrls)) {
      const originalVideos = originalProduct.videoUrls || [];
      const newVideos = newProduct.existingVideoUrls;
      
      if (JSON.stringify(originalVideos) !== JSON.stringify(newVideos)) {
        changes.videoUrls = newVideos;
      }
    }
    
    // Handle case where we have both indicator and actual data
    if (newProduct.secondaryImages && Array.isArray(newProduct.secondaryImages) && !newProduct.hasNewSecondaryPhotos) {
      const originalImages = originalProduct.secondaryImages || [];
      const newImages = newProduct.secondaryImages;
      
      if (JSON.stringify(originalImages) !== JSON.stringify(newImages)) {
        changes.secondaryImages = newImages;
      }
    }
    
    if (newProduct.videoUrls && Array.isArray(newProduct.videoUrls) && !newProduct.hasNewVideos) {
      const originalVideos = originalProduct.videoUrls || [];
      const newVideos = newProduct.videoUrls;
      
      if (JSON.stringify(originalVideos) !== JSON.stringify(newVideos)) {
        changes.videoUrls = newVideos;
      }
    }
    
    return changes;
  }
  
  // Default comparison for other resource types
  console.log('🎯 Using DEFAULT comparison (no specific type detected)');
  for (const [key, value] of Object.entries(newData)) {
    if (originalData[key] !== value) {
      changes[key] = value;
    }
  }
  
  console.log('🔍 Final changes from default comparison:', changes);
  return changes;
};

export const formatApprovalDescription = (actionType: string, resourceType: string, resourceName: string): string => {
  const actionMap = {
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
  };
  const resourceMap = {
    customer: 'Customer',
    item: 'Product',
    payment: 'Payment',
    reservation: 'Reservation',
    cost: 'Cost',
  };
  
  return `${actionMap[actionType as keyof typeof actionMap]} ${resourceMap[resourceType as keyof typeof resourceMap]}: ${resourceName}`;
}; 