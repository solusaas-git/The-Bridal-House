import { useState } from "react";
import { FileIcon, DownloadIcon, TrashIcon, EyeOpenIcon, Cross2Icon } from "@radix-ui/react-icons";
import Image from "next/image";
import FileUpload from "./FileUpload";
import type { IAttachment } from "@/models";

type Attachment = IAttachment;

interface AttachmentsSectionProps {
  existingFiles?: Attachment[];
  newFiles?: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveExisting?: (file: Attachment, index: number) => void;
  onRemoveNew?: (index: number) => void;
}

const AttachmentsSection = ({
  existingFiles = [],
  newFiles = [],
  onAddFiles,
  onRemoveExisting,
  onRemoveNew,
}: AttachmentsSectionProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: Attachment | File; url: string; type: string } | null>(null);

  const handleFilesAdded = async (files: File[]) => {
    setIsUploading(true);
    try {
      // Filter files larger than 10MB
      const validFiles = files?.filter((file) => file.size <= 10 * 1024 * 1024);
      onAddFiles(validFiles);
    } catch (error) {
      console.error("Error handling files:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreview = (file: Attachment | File) => {
    const fileName = file.name;
    const fileType = getFileType(fileName);
    
    let url: string;
    if ('url' in file) {
      // Existing file (Attachment)
      url = file.url.startsWith('http') ? file.url : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055'}/api/uploads/${file.url}`;
    } else {
      // New file (File object) - add proper type checking
      if (file instanceof File) {
        url = URL.createObjectURL(file);
      } else {
        console.error('Invalid file type for preview');
        return;
      }
    }
    
    setPreviewFile({ file, url, type: fileType });
  };

  const handleDownload = (link: string) => {
    // Construct full URL for existing files
    const fullUrl = link.startsWith('http') ? link : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3055'}/api/uploads/${link}`;
    
    // Create a temporary link element to force download
    const downloadLink = document.createElement('a');
    downloadLink.href = fullUrl;
    downloadLink.download = link.split('/').pop() || 'download'; // Use filename from path
    downloadLink.target = '_blank'; // Add target blank as fallback
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePreviewClick = (e: React.MouseEvent, file: Attachment | File) => {
    e.preventDefault();
    e.stopPropagation();
    handlePreview(file);
  };

  const handleDownloadClick = (e: React.MouseEvent, link: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleDownload(link);
  };

  const handleRemoveClick = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const getFileType = (fileName: string): string => {
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

  const closePreview = () => {
    if (previewFile?.url && !previewFile.url.startsWith('http')) {
      // Clean up object URL for new files
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;

    const { file, url, type } = previewFile;
    const fileName = file.name;

    switch (type) {
      case 'image':
        return (
          <div className="relative max-w-full max-h-[80vh] overflow-auto">
            <Image
              src={url}
              alt={fileName}
              width={800}
              height={600}
              className="max-w-full h-auto object-contain"
              onError={() => {
                // Fallback for images that fail to load
                console.error('Failed to load image:', url);
              }}
            />
          </div>
        );
      
      case 'pdf':
        return (
          <div className="w-full h-[80vh]">
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={fileName}
            />
          </div>
        );
      
      case 'text':
        return (
          <div className="max-w-full max-h-[80vh] overflow-auto bg-gray-900 p-4 rounded">
            <iframe
              src={url}
              className="w-full h-96 border-0 bg-white"
              title={fileName}
            />
          </div>
        );
      
      default:
        return (
          <div className="text-center p-8">
            <FileIcon className="h-16 w-16 text-white/60 mx-auto mb-4" />
            <p className="text-white mb-4">Preview not available for this file type</p>
            <p className="text-gray-400 text-sm mb-4">{fileName}</p>
            <button
              type="button"
              onClick={(e) => handleDownloadClick(e, 'url' in file ? file.url : '')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Download to View
            </button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Attachments</h3>
        <FileUpload onFilesAdded={handleFilesAdded} />
      </div>

      {(existingFiles.length > 0 || newFiles.length > 0) && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-400">Uploaded Files</h4>
          <div className="space-y-3">
            {existingFiles?.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white/10 rounded-lg group"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-5 w-5 text-white/60" />
                  <div className="flex flex-col">
                    <span className="text-sm text-white truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => handlePreviewClick(e, file)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Preview"
                  >
                    <EyeOpenIcon className="h-4 w-4 text-blue-400 hover:text-blue-300" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={(e) => handleDownloadClick(e, file.url)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Download"
                  >
                    <DownloadIcon className="h-4 w-4 text-white/60 hover:text-white" />
                  </button>

                  {onRemoveExisting && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveClick(e, () => onRemoveExisting(file, index))}
                      className="p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <TrashIcon className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {newFiles?.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white/10 rounded-lg group"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-5 w-5 text-white/60" />
                  <div className="flex flex-col">
                    <span className="text-sm text-white truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => handlePreviewClick(e, file)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Preview"
                  >
                    <EyeOpenIcon className="h-4 w-4 text-blue-400 hover:text-blue-300" />
                  </button>
                  
                  {onRemoveNew && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveClick(e, () => onRemoveNew(index))}
                      className="p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove"
                    >
                      <TrashIcon className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-center p-4">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">
                {previewFile.file.name}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => handleDownloadClick(e, 'url' in previewFile.file ? previewFile.file.url : '')}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Download"
                >
                  <DownloadIcon className="h-4 w-4 text-white/60 hover:text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closePreview();
                  }}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Close"
                >
                  <Cross2Icon className="h-4 w-4 text-white/60 hover:text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 overflow-auto">
              {renderPreviewContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentsSection; 