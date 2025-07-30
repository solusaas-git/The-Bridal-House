import React, { useState } from 'react';
import { X, Check, User, Calendar, Clock, ExternalLink, FileText, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

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

interface ApprovalDetailsModalProps {
  isOpen: boolean;
  approval: Approval | null;
  onClose: () => void;
  onReview: (approvalId: string, action: 'approve' | 'reject', comment: string) => void;
  reviewingId: string | null;
}

const ApprovalDetailsModal: React.FC<ApprovalDetailsModalProps> = ({ 
  isOpen, 
  approval, 
  onClose, 
  onReview,
  reviewingId 
}) => {
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const router = useRouter();
  const [imagePopup, setImagePopup] = useState<{
    show: boolean;
    src: string;
    alt: string;
    x: number;
    y: number;
  }>({
    show: false,
    src: '',
    alt: '',
    x: 0,
    y: 0
  });

  if (!isOpen || !approval) return null;

  const handleReviewSubmit = (action: 'approve' | 'reject') => {
    onReview(approval._id, action, reviewComment);
    setShowReviewForm(false);
    setReviewComment('');
    setReviewAction('approve');
  };

  const startReview = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setShowReviewForm(true);
  };

  const handleViewResource = () => {
    const resourceId = approval.resourceId;
    
    switch (approval.resourceType) {
      case 'customer':
        router.push(`/customers/${resourceId}`);
        break;
      case 'item':
        router.push(`/products/${resourceId}`);
        break;
      case 'payment':
        router.push(`/payments/${resourceId}`);
        break;
      case 'reservation':
        router.push(`/reservations/${resourceId}`);
        break;
      default:
        console.warn('Unknown resource type:', approval.resourceType);
    }
    
    onClose(); // Close the modal after navigation
  };

  const handleImageHover = (event: React.MouseEvent, imageSrc: string, altText: string) => {
    // Extract filename from the imageSrc for proper file type detection
    const filename = imageSrc.split('/').pop() || altText;
    
    setImagePopup({
      show: true,
      src: imageSrc,
      alt: filename, // Use filename instead of alt text for file type detection
      x: event.clientX,
      y: event.clientY
    });
  };

  const formatValue = (value: any, fieldName?: string, originalData?: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    // Handle attachments specially
    if (fieldName === 'attachments' || fieldName === 'newFiles' || fieldName === 'deletedAttachments') {
      return renderAttachmentsWithThumbnails(value, originalData);
    }

    // Handle product images with thumbnails
    if (fieldName === 'primaryPhoto' && value) {
      if (value === 'New file uploaded') {
        return <span className="text-green-400">New primary photo uploaded</span>;
      }
      return renderProductImageThumbnail(value, 'Primary Photo');
    }

    if (fieldName === 'secondaryImages' && value) {
      if (value === 'New files uploaded') {
        return <span className="text-green-400">New secondary photos uploaded</span>;
      }
      if (Array.isArray(value)) {
        return (
          <div className="space-y-2">
            {value.map((image: string, index: number) => (
              <div key={index}>
                {renderProductImageThumbnail(image, `Secondary Photo ${index + 1}`)}
              </div>
            ))}
          </div>
        );
      }
    }

    if (fieldName === 'videoUrls' && value) {
      if (value === 'New files uploaded') {
        return <span className="text-green-400">New videos uploaded</span>;
      }
      if (Array.isArray(value)) {
        return (
          <div className="space-y-2">
            {value.map((video: string, index: number) => (
              <div key={index}>
                {renderProductVideoThumbnail(video, `Video ${index + 1}`)}
              </div>
            ))}
          </div>
        );
      }
    }

    // Handle file indicators for products - show thumbnails for new uploads
    if (fieldName === 'hasNewPrimaryPhoto' && value === true) {
      return <span className="text-green-400">New primary photo uploaded</span>;
    }
    if (fieldName === 'hasNewSecondaryPhotos' && value === true) {
      return <span className="text-green-400">New secondary photos uploaded</span>;
    }
    if (fieldName === 'hasNewVideos' && value === true) {
      return <span className="text-green-400">New videos uploaded</span>;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'None';
      }
      
      // For items array, use the special renderer
      if (fieldName === 'items') {
        return renderItemsWithImages(value, originalData);
      }
      
      // For other arrays, show as list
      return (
        <div className="space-y-1">
          {value.map((item: any, index: number) => (
            <div key={index} className="text-sm">
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </div>
          ))}
        </div>
      );
    }

    // Handle dates
    if (typeof value === 'string' && value.includes('T')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (e) {
        // Not a valid date, continue with normal string handling
      }
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }

    // Handle long strings
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }

    return String(value);
  };

  const formatFieldName = (fieldName: string) => {
    // Special cases for better readability
    const fieldNameMap: Record<string, string> = {
      pickupDate: 'Pickup Date & Time',
      returnDate: 'Return Date & Time',
      availabilityDate: 'Availability Date & Time',
      pickupTime: 'Pickup Time',
      returnTime: 'Return Time',
      availabilityTime: 'Availability Time',
      weddingDate: 'Wedding Date',
      clientId: 'Client',
      items: 'Items',
      reservationType: 'Reservation Type',
      status: 'Status',
      additionalCost: 'Additional Cost',
      bufferBefore: 'Buffer Before',
      bufferAfter: 'Buffer After',
      availability: 'Availability',
      securityDepositAmount: 'Security Deposit',
      advanceAmount: 'Advance Amount',
      notes: 'Notes',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      idNumber: 'ID Number',
      weddingLocation: 'Wedding Location',
      weddingCity: 'Wedding City',
      customerType: 'Type',
      whatsapp: 'WhatsApp',
      attachments: 'Attachments',
      newFiles: 'New Files',
      deletedAttachments: 'Deleted Attachments',
      hasNewPrimaryPhoto: 'Primary Photo',
      hasNewSecondaryPhotos: 'Secondary Photos',
      hasNewVideos: 'Videos',
      primaryPhoto: 'Primary Photo',
      secondaryImages: 'Secondary Images',
      videoUrls: 'Videos',
      rentalCost: 'Rental Cost',
      buyCost: 'Buy Cost',
      sellPrice: 'Sell Price',
      size: 'Size',
      category: 'Category',
      subCategory: 'Subcategory',
      quantity: 'Quantity',
      amount: 'Amount',
      paymentMethod: 'Payment Method',
      paymentType: 'Payment Type',
      reference: 'Reference',
      paymentDate: 'Payment Date',
      paymentTime: 'Payment Time',
      client: 'Client',
      reservation: 'Reservation'
    };

    return fieldNameMap[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  // Component to render items with images
  const renderItemsWithImages = (items: any, originalData: any): React.ReactNode => {
    if (!Array.isArray(items)) {
      return formatValue(items, 'items', originalData);
    }
    
    return (
      <div className="space-y-2">
        {items.map((item: any, index: number) => {
          let itemData;
          
          // Handle new structure with id, name, and image properties (from new data)
          if (item && typeof item === 'object' && item.id && item.name) {
            itemData = { name: item.name, image: item.image };
          }
          // Handle original data structure (from current value)
          else if (item && typeof item === 'object' && item._id && item.name) {
            itemData = { 
              name: item.name, 
              image: item.primaryPhoto ? `/api/uploads/${item.primaryPhoto}` : null 
            };
          }
          // Handle string IDs
          else if (typeof item === 'string') {
            // First try to find in originalData.items (if it's an array of objects)
            if (originalData?.items && Array.isArray(originalData.items)) {
              const originalItem = originalData.items.find((originalItem: any) => 
                originalItem._id === item || originalItem === item
              );
              if (originalItem?.name) {
                itemData = {
                  name: originalItem.name,
                  image: originalItem.primaryPhoto ? `/api/uploads/${originalItem.primaryPhoto}` : null
                };
              } else if (originalItem) {
                itemData = {
                  name: originalItem,
                  image: null
                };
              }
            }
            
            // If item is already a name (string), return it
            if (!item.match(/^[0-9a-fA-F]{24}$/)) {
              itemData = {
                name: item,
                image: null
              };
            } else if (!itemData) {
              // Fallback to showing the ID
              itemData = {
                name: `Item ${item}`,
                image: null
              };
            }
          }
          // If it's an object with a name property
          else if (typeof item === 'object' && item?.name) {
            itemData = {
              name: item.name,
              image: item.primaryPhoto ? `/api/uploads/${item.primaryPhoto}` : null
            };
          }
          // Fallback
          else {
            itemData = {
              name: `Item ${index}`,
              image: null
            };
          }
          
          return (
            <div key={index} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
              {itemData.image && (
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleImageHover(e, itemData.image, itemData.name);
                  }}
                >
                  <img
                    src={itemData.image}
                    alt={itemData.name}
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <span className="text-sm text-gray-300">{itemData.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Component to render product image thumbnails
  const renderProductImageThumbnail = (imageUrl: string, altText: string) => {
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `/api/uploads/${imageUrl}`;
    
    return (
      <div 
        className="relative cursor-pointer inline-block"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleImageHover(e, fullImageUrl, altText);
        }}
      >
        <img
          src={fullImageUrl}
          alt={altText}
          className="w-12 h-12 object-cover rounded-lg"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>
    );
  };

  // Component to render product video thumbnails
  const renderProductVideoThumbnail = (videoUrl: string, altText: string) => {
    const fullVideoUrl = videoUrl.startsWith('http') ? videoUrl : `/api/uploads/${videoUrl}`;
    
    return (
      <div 
        className="relative cursor-pointer inline-block"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleImageHover(e, fullVideoUrl, altText);
        }}
      >
        <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    );
  };

  // Component to render attachments with thumbnails
  const renderAttachmentsWithThumbnails = (attachments: any, originalData: any): React.ReactNode => {
    if (!Array.isArray(attachments)) {
      return formatValue(attachments, 'attachments', originalData);
    }
    
    return (
      <div className="space-y-2">
        {attachments.map((attachment: any, index: number) => {
          let attachmentData;
          
          // Handle attachment object structure
          if (attachment && typeof attachment === 'object' && attachment.name) {
            attachmentData = {
              name: attachment.name,
              size: attachment.size,
              link: attachment.link || attachment.url, // Handle both link and url properties
              type: getFileType(attachment.name)
            };
          }
          // Handle string (just the link)
          else if (typeof attachment === 'string') {
            attachmentData = {
              name: attachment.split('/').pop() || 'Unknown File',
              size: 0,
              link: attachment,
              type: getFileType(attachment)
            };
          }
          // Fallback
          else {
            attachmentData = {
              name: `Attachment ${index + 1}`,
              size: 0,
              link: '',
              type: 'other'
            };
          }
          
          const isImage = attachmentData.type === 'image';
          let imageUrl = attachmentData.link || '';
          
          // Fix URL construction - add missing forward slash
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/api/uploads/')) {
            imageUrl = `/api/uploads/${imageUrl}`;
          }
          
          return (
            <div key={index} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
              {isImage && imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
                    alt={attachmentData.name}
                    className="w-12 h-12 object-cover rounded-lg cursor-pointer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleImageHover(e, imageUrl, attachmentData.name);
                    }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm text-white font-medium">{attachmentData.name}</div>
                {attachmentData.size > 0 && (
                  <div className="text-xs text-gray-400">
                    {(attachmentData.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isImage && imageUrl) {
                    handleImageHover(e, imageUrl, attachmentData.name);
                  } else if (imageUrl) {
                    // For documents, show in popup
                    setImagePopup({
                      show: true,
                      src: imageUrl,
                      alt: attachmentData.name,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title={isImage ? "Preview Image" : "Preview Document"}
                disabled={!imageUrl}
              >
                <Eye className="h-4 w-4 text-blue-400" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper function to determine file type
  const getFileType = (fileName: string): string => {
    if (!fileName) return 'other';
    
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['txt', 'md'].includes(extension)) {
      return 'text';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'document';
    }
    return 'other';
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
    switch (resourceType) {
      case 'customer':
        return `${originalData?.firstName || ''} ${originalData?.lastName || ''}`.trim() || 'Unknown Customer';
      case 'item':
        return originalData?.name || 'Unknown Product';
      case 'payment':
        return `Payment #${originalData?.paymentNumber || originalData?._id || 'Unknown'}`;
      case 'reservation':
        return `Reservation #${originalData?.reservationNumber || originalData?._id || 'Unknown'}`;
      default:
        return 'Unknown Resource';
    }
  };

  const renderDataComparison = () => {
    if (approval.actionType === 'delete') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Data to be deleted:</h3>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {Object.entries(approval.originalData || {})
                .filter(([key]) => !key.startsWith('_') && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt')
                .map(([key, value]) => (
                  <div key={key} className="border-b border-red-500/10 pb-2">
                    <div className="text-sm text-red-300 font-medium">
                      {formatFieldName(key)}:
                    </div>
                    <div className="text-white text-sm mt-1">
                      {formatValue(value, key, approval.originalData)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      );
    }

    if (approval.actionType === 'edit') {
      // For edit requests, newData should already contain only the changed fields
      const changedFields = approval.newData || {};
      const originalData = approval.originalData || {};
      
      // Convert to array for display
      const changes = Object.entries(changedFields).map(([field, newValue]) => ({
        field,
        from: originalData[field],
        to: newValue
      }));

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">
            Proposed Changes ({changes.length} field{changes.length !== 1 ? 's' : ''}):
          </h3>
          
          {changes.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {changes.map((change, index) => (
                <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="font-medium text-white mb-3">
                    {formatFieldName(change.field)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Current Value:</div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-white min-h-[3rem] overflow-auto">
                        {change.field === 'items' 
                          ? renderItemsWithImages(change.from, originalData)
                          : formatValue(change.from, change.field, originalData)
                        }
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-2">New Value:</div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded p-3 text-sm text-white min-h-[3rem] overflow-auto">
                        {change.field === 'items' 
                          ? renderItemsWithImages(change.to, originalData)
                          : formatValue(change.to, change.field, originalData)
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8 bg-white/5 rounded-lg">
              No changes detected in the approval request
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
      approved: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
      rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            Approval Request Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Request Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Request Type</label>
                  <div className="text-white font-medium">
                    {getActionDescription(approval.actionType, approval.resourceType)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Requested By</label>
                  <div className="flex items-center gap-2 text-white">
                    <User className="h-4 w-4" />
                    {approval.requestedBy?.name || 'Unknown User'}
                    <span className="text-gray-400">({approval.requestedBy?.email})</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Request Date</label>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="h-4 w-4" />
                    {new Date(approval.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <div>{getStatusBadge(approval.status)}</div>
                </div>
              </div>

              <div className="space-y-4">
                {approval.reviewedBy && (
                  <>
                    <div>
                      <label className="text-sm text-gray-400">Reviewed By</label>
                      <div className="text-white">
                        {approval.reviewedBy.name}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-gray-400">Review Date</label>
                      <div className="flex items-center gap-2 text-white">
                        <Clock className="h-4 w-4" />
                        {new Date(approval.reviewedAt!).toLocaleString()}
                      </div>
                    </div>

                    {approval.reviewComment && (
                      <div>
                        <label className="text-sm text-gray-400">Review Comment</label>
                        <div className="text-white bg-white/5 border border-white/10 rounded p-3">
                          {approval.reviewComment}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Resource Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    Related Resource
                  </h3>
                  <p className="text-sm text-gray-400">
                    {getResourceDisplayName(approval.resourceType, approval.originalData)}
                  </p>
                </div>
                <button
                  onClick={handleViewResource}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="text-sm">
                    {approval.resourceType === 'customer' ? 'View Customer' : `View ${approval.resourceType}`}
                  </span>
                </button>
              </div>
            </div>

            {/* Data Comparison */}
            {renderDataComparison()}

            {/* Review Form */}
            {showReviewForm && approval.status === 'pending' && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-4">
                  {reviewAction === 'approve' ? 'Approve' : 'Reject'} Request
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Comment (optional)
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Add a comment about your decision..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {reviewComment.length}/500 characters
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReviewSubmit(reviewAction)}
                      disabled={reviewingId === approval._id}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        reviewAction === 'approve'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {reviewingId === approval._id ? 'Processing...' : 
                       reviewAction === 'approve' ? 'Approve' : 'Reject'}
                    </button>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {approval.status === 'pending' && !showReviewForm && (
          <div className="flex justify-end gap-3 p-6 border-t border-white/10">
            <button
              onClick={() => startReview('reject')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={() => startReview('approve')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Image Popup */}
      {imagePopup.show && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
          onClick={() => {
            setImagePopup({
              show: false,
              src: '',
              alt: '',
              x: 0,
              y: 0
            });
          }}
        >
          <div 
            className="bg-gray-900/95 backdrop-blur-lg border border-white/20 rounded-lg p-4 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-medium">{imagePopup.alt}</h3>
              <button
                onClick={() => {
                  setImagePopup({
                    show: false,
                    src: '',
                    alt: '',
                    x: 0,
                    y: 0
                  });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center">
              {getFileType(imagePopup.alt) === 'image' ? (
                <img
                  src={imagePopup.src}
                  alt={imagePopup.alt}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIGZpbGw9IiMzNzQxNTEiLz4KPHRleHQgeD0iMTI4IiB5PSIxMjgiIGZpbGw9IiM2QjcyODkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4=';
                  }}
                />
              ) : getFileType(imagePopup.alt) === 'pdf' ? (
                <div className="w-full h-[60vh] flex items-center justify-center">
                  <iframe
                    src={`${imagePopup.src}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 rounded-lg"
                    title={imagePopup.alt}
                    onError={() => {
                      console.error('PDF failed to load:', imagePopup.src);
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-[60vh] flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-white text-lg mb-4">{imagePopup.alt}</p>
                    <p className="text-gray-400 mb-4">Document preview not available</p>
                    <button
                      onClick={() => window.open(imagePopup.src, '_blank')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ApprovalDetailsModal; 