import React, { useState, useEffect, useCallback } from 'react';
import { 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Search, 
  Filter, 
  Grid, 
  List,
  FolderOpen,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  RefreshCw,
  Upload,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import FileUpload from './FileUpload';

export interface FileData {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadStatus: string;
  createdAt: string;
  uploader: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  folder?: {
    id: string;
    name: string;
    path: string;
  };
  thumbnails: Array<{
    id: string;
    size: 'SMALL' | 'MEDIUM' | 'LARGE';
    s3Url?: string;
    width: number;
    height: number;
  }>;
  conversions: Array<{
    id: string;
    fromFormat: string;
    toFormat: string;
    status: string;
    convertedUrl?: string;
  }>;
  processingJobs: Array<{
    id: string;
    jobType: string;
    status: string;
    progress: number;
  }>;
}

export interface FileManagerProps {
  folderId?: string;
  onFileSelect?: (file: FileData) => void;
  onFileDelete?: (fileId: string) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'images' | 'documents' | 'videos' | 'audio' | 'archives';

const FileManager: React.FC<FileManagerProps> = ({
  folderId,
  onFileSelect,
  onFileDelete,
  className = '',
}) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Get file icon based on type
  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return Archive;
    return FileText;
  }, []);

  // Get file type for filtering
  const getFileType = useCallback((mimeType: string): FilterType => {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archives';
    return 'documents';
  }, []);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (folderId) params.append('folderId', folderId);
      if (searchQuery) params.append('search', searchQuery);
      if (filterType !== 'all') {
        const mimeTypeMap: Record<FilterType, string> = {
          images: 'image',
          videos: 'video',
          audio: 'audio',
          documents: 'text',
          archives: 'zip',
          all: '',
        };
        if (mimeTypeMap[filterType]) {
          params.append('mimeType', mimeTypeMap[filterType]);
        }
      }

      const response = await fetch(`/api/v1/files?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'default',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      setFiles(data.files);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [page, folderId, searchQuery, filterType]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'default',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
      onFileDelete?.(fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  }, [onFileDelete]);

  // Download file
  const downloadFile = useCallback(async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/v1/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'X-Tenant-ID': localStorage.getItem('tenantId') || 'default',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate download URL');
      }

      const data = await response.json();
      
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  }, []);

  // Handle file selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  // Handle upload success
  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
    fetchFiles(); // Refresh file list
  }, [fetchFiles]);

  // Filter files based on current filters
  const filteredFiles = files.filter(file => {
    if (filterType !== 'all' && getFileType(file.mimeType) !== filterType) {
      return false;
    }
    if (searchQuery && !file.originalName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Effect to fetch files
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Effect to reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType, folderId]);

  return (
    <div className={`file-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            File Manager
            {folderId && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                in folder
              </span>
            )}
          </h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchFiles()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setShowUpload(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Files</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Dropdown */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All Files</option>
              <option value="images">Images</option>
              <option value="documents">Documents</option>
              <option value="videos">Videos</option>
              <option value="audio">Audio</option>
              <option value="archives">Archives</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Upload Files
              </h3>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <FileUpload
              folderId={folderId}
              onFilesUploaded={handleUploadSuccess}
              onUploadError={(error) => setError(error)}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No files found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Upload some files to get started'
            }
          </p>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      )}

      {/* File Grid/List */}
      {!loading && filteredFiles.length > 0 && (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-2'
        }>
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.mimeType);
            const thumbnail = file.thumbnails.find(t => t.size === 'MEDIUM')?.s3Url;
            const isSelected = selectedFiles.includes(file.id);

            if (viewMode === 'grid') {
              return (
                <div
                  key={file.id}
                  className={`
                    relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                    rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => onFileSelect?.(file)}
                >
                  <div className="flex flex-col items-center">
                    {/* Thumbnail or Icon */}
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={file.originalName}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <FileIcon className="h-12 w-12 text-gray-400" />
                      )}
                    </div>

                    {/* File Name */}
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center truncate w-full">
                      {file.originalName}
                    </h3>

                    {/* File Info */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatFileSize(file.size)}
                    </p>

                    {/* Processing Status */}
                    {file.processingJobs.some(job => job.status === 'PROCESSING') && (
                      <div className="mt-2 flex items-center space-x-1">
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                        <span className="text-xs text-blue-500">Processing...</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file.id, file.originalName);
                        }}
                        className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id);
                        }}
                        className="p-1 bg-white dark:bg-gray-700 rounded shadow hover:bg-red-50 dark:hover:bg-red-900 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleFileSelection(file.id);
                      }}
                      className="rounded border-gray-300"
                    />
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={file.id}
                  className={`
                    flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 
                    dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow cursor-pointer
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => onFileSelect?.(file)}
                >
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.id);
                    }}
                    className="rounded border-gray-300"
                  />

                  {/* Thumbnail or Icon */}
                  <div className="flex-shrink-0">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={file.originalName}
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
                      {file.originalName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                    </p>
                  </div>

                  {/* Processing Status */}
                  {file.processingJobs.some(job => job.status === 'PROCESSING') && (
                    <div className="flex items-center space-x-1">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-sm text-blue-500">Processing</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file.id, file.originalName);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;