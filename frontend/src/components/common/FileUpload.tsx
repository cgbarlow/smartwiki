import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, X, Check, AlertCircle, FileText, Image, Video, Music } from 'lucide-react';
import { Button } from '../ui/Button';

export interface FileUploadProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onUploadProgress?: (progress: number, fileId: string) => void;
  onUploadError?: (error: string, file?: File) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  multiple?: boolean;
  disabled?: boolean;
  folderId?: string;
  isPublic?: boolean;
  className?: string;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  url?: string;
  error?: string;
  processingJobs?: string[];
}

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  onUploadProgress,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ['*'],
  multiple = true,
  disabled = false,
  folderId,
  isPublic = false,
  className = '',
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate file preview URL
  const generatePreview = useCallback((file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get file icon based on type
  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    return FileText;
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)}`;
    }

    // Check file type
    if (acceptedTypes.length > 0 && !acceptedTypes.includes('*')) {
      const isTypeAccepted = acceptedTypes.some(type => 
        file.type.includes(type) || file.name.toLowerCase().endsWith(`.${type}`)
      );
      if (!isTypeAccepted) {
        return `File type not accepted. Allowed types: ${acceptedTypes.join(', ')}`;
      }
    }

    return null;
  }, [maxFileSize, acceptedTypes, formatFileSize]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      // Check max files limit
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      // Create file with preview
      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        preview: generatePreview(file),
        uploadStatus: 'pending' as const,
        progress: 0,
      });

      validFiles.push(fileWithPreview);
    }

    // Add valid files to state
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }

    // Report errors
    if (errors.length > 0) {
      onUploadError?.(errors.join(', '));
    }
  }, [files.length, maxFiles, validateFile, generatePreview, onUploadError]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelect(droppedFiles);
  }, [disabled, handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFileSelect(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  // Upload files
  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);

    try {
      const uploadedFiles: UploadedFile[] = [];

      for (const file of files) {
        if (file.uploadStatus !== 'pending') continue;

        // Update file status to uploading
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, uploadStatus: 'uploading' as const, progress: 0 }
            : f
        ));

        try {
          // Create FormData
          const formData = new FormData();
          formData.append('file', file);
          if (folderId) formData.append('folderId', folderId);
          if (isPublic) formData.append('isPublic', 'true');

          // Upload file with progress tracking
          const response = await fetch('/api/v1/files/upload', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'X-Tenant-ID': localStorage.getItem('tenantId') || 'default',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Upload failed');
          }

          const result = await response.json();

          // Update file status to completed
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadStatus: 'completed' as const, progress: 100 }
              : f
          ));

          // Add to uploaded files
          uploadedFiles.push({
            id: result.file.id,
            originalName: result.file.originalName,
            filename: result.file.filename,
            mimeType: result.file.mimeType,
            size: result.file.size,
            uploadStatus: 'completed',
            progress: 100,
            processingJobs: result.processingJobs,
          });

          onUploadProgress?.(100, file.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          // Update file status to failed
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploadStatus: 'failed' as const, error: errorMessage }
              : f
          ));

          onUploadError?.(errorMessage, file);
        }
      }

      // Notify about uploaded files
      if (uploadedFiles.length > 0) {
        onFilesUploaded?.(uploadedFiles);
      }
    } finally {
      setIsUploading(false);
    }
  }, [files, isUploading, folderId, isPublic, onUploadProgress, onUploadError, onFilesUploaded]);

  // Click to select files
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Clear all files
  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
  }, [files]);

  // Get upload status summary
  const getUploadSummary = useCallback(() => {
    const pending = files.filter(f => f.uploadStatus === 'pending').length;
    const uploading = files.filter(f => f.uploadStatus === 'uploading').length;
    const completed = files.filter(f => f.uploadStatus === 'completed').length;
    const failed = files.filter(f => f.uploadStatus === 'failed').length;

    return { pending, uploading, completed, failed, total: files.length };
  }, [files]);

  const summary = getUploadSummary();

  return (
    <div className={`file-upload ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
            : 'border-gray-300 dark:border-gray-600'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          {multiple ? 'Drop files here or click to browse' : 'Drop file here or click to browse'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {acceptedTypes.includes('*') 
            ? `Maximum ${formatFileSize(maxFileSize)} per file`
            : `Accepted types: ${acceptedTypes.join(', ')} • Maximum ${formatFileSize(maxFileSize)}`
          }
        </p>
        {maxFiles > 1 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Up to {maxFiles} files
          </p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={acceptedTypes.includes('*') ? undefined : acceptedTypes.map(type => `.${type}`).join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Files ({summary.total})
            </h3>
            <div className="flex items-center space-x-2">
              {summary.total > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFiles}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              )}
              {summary.pending > 0 && (
                <Button
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className="min-w-[100px]"
                >
                  {isUploading ? 'Uploading...' : `Upload ${summary.pending} file${summary.pending > 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>

          {/* Upload Summary */}
          {summary.total > 1 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {summary.completed > 0 && (
                    <span className="text-green-600 dark:text-green-400 mr-4">
                      ✓ {summary.completed} completed
                    </span>
                  )}
                  {summary.uploading > 0 && (
                    <span className="text-blue-600 dark:text-blue-400 mr-4">
                      ↑ {summary.uploading} uploading
                    </span>
                  )}
                  {summary.failed > 0 && (
                    <span className="text-red-600 dark:text-red-400 mr-4">
                      ✗ {summary.failed} failed
                    </span>
                  )}
                  {summary.pending > 0 && (
                    <span className="text-gray-600 dark:text-gray-400">
                      ⏳ {summary.pending} pending
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* File Items */}
          <div className="space-y-3">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type);
              
              return (
                <div
                  key={file.id}
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {file.uploadStatus === 'pending' && (
                      <div className="text-gray-400">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    
                    {file.uploadStatus === 'uploading' && (
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        {file.progress > 0 && (
                          <div className="absolute -bottom-1 -right-1 text-xs bg-blue-600 text-white rounded px-1">
                            {file.progress}%
                          </div>
                        )}
                      </div>
                    )}
                    
                    {file.uploadStatus === 'completed' && (
                      <div className="text-green-600 dark:text-green-400">
                        <Check className="h-5 w-5" />
                      </div>
                    )}
                    
                    {file.uploadStatus === 'failed' && (
                      <div className="text-red-600 dark:text-red-400" title={file.error}>
                        <AlertCircle className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    disabled={file.uploadStatus === 'uploading'}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Error Messages */}
          {files.some(f => f.uploadStatus === 'failed') && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Upload Errors:
              </h4>
              <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
                {files
                  .filter(f => f.uploadStatus === 'failed')
                  .map(f => (
                    <li key={f.id} className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{f.name}: {f.error}</span>
                    </li>
                  ))
                }
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;