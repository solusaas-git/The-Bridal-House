import { useState, useCallback } from 'react'
import { UploadIcon } from '@radix-ui/react-icons'
import { useTranslation } from 'react-i18next'

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
}

const FileUpload = ({ onFilesAdded }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const { t } = useTranslation('shared')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = [...e.dataTransfer.files]
    if (files && files.length > 0) {
      onFilesAdded(files)
    }
  }, [onFilesAdded])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      onFilesAdded([...files]);
    }
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors ${
        isDragging 
          ? 'border-white/40 bg-white/10' 
          : 'border-white/20 hover:border-white/40'
      }`}
    >
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
        id="fileInput"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
      <label 
        htmlFor="fileInput"
        className="cursor-pointer flex flex-col items-center space-y-2 sm:space-y-3"
      >
        <UploadIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white/60" />
        <div className="text-xs sm:text-sm text-gray-300">
          <span className="font-medium text-white">{t('fileUpload.clickToUpload')}</span> {t('fileUpload.orDragAndDrop')}
        </div>
        <p className="text-xs text-gray-400">
          {t('fileUpload.supportedFormats')}
        </p>
      </label>
    </div>
  )
}

export default FileUpload 