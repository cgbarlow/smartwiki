import React, { useState } from 'react';
import FileUpload, { UploadedFile } from '../components/common/FileUpload';
import FileManager, { FileData } from '../components/common/FileManager';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

const FileUploadExample: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle successful file uploads
  const handleFilesUploaded = (files: UploadedFile[]) => {
    console.log('Files uploaded successfully:', files);
    setUploadedFiles(prev => [...prev, ...files]);
    setShowUpload(false);
    
    // Refresh the file manager
    setRefreshKey(prev => prev + 1);
    
    // Show success message
    alert(`Successfully uploaded ${files.length} file(s)!`);
  };

  // Handle upload progress
  const handleUploadProgress = (progress: number, fileId: string) => {
    console.log(`Upload progress for ${fileId}: ${progress}%`);
  };

  // Handle upload errors
  const handleUploadError = (error: string, file?: File) => {
    console.error('Upload error:', error, file);
    setUploadErrors(prev => [...prev, error]);
  };

  // Handle file selection from manager
  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file);
  };

  // Handle file deletion
  const handleFileDelete = (fileId: string) => {
    console.log('File deleted:', fileId);
    setRefreshKey(prev => prev + 1);
  };

  // Clear errors
  const clearErrors = () => {
    setUploadErrors([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            File Upload System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page demonstrates the comprehensive file upload and management system for SmartWiki.
          </p>
        </div>

        {/* Error Messages */}
        {uploadErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-red-800 dark:text-red-200 font-medium">Upload Errors</h3>
              <Button variant="outline" size="sm" onClick={clearErrors}>
                Clear
              </Button>
            </div>
            <ul className="text-red-600 dark:text-red-300 space-y-1">
              {uploadErrors.map((error, index) => (
                <li key={index} className="text-sm">• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Uploads */}
        {uploadedFiles.length > 0 && (
          <div className="mb-8 p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="text-green-800 dark:text-green-200 font-medium mb-4">
              Recently Uploaded Files
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      {file.originalName}
                    </span>
                    <span className="text-green-600 dark:text-green-400 text-sm ml-2">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.processingJobs && file.processingJobs.length > 0 && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {file.processingJobs.length} job(s) queued
                      </span>
                    )}
                    <span className="text-green-600 dark:text-green-400 text-sm">✓ Uploaded</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Upload Files
            </h2>
            <Button onClick={() => setShowUpload(true)}>
              Open Upload Dialog
            </Button>
          </div>

          {/* Inline Upload Component */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Quick Upload
            </h3>
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              onUploadProgress={handleUploadProgress}
              onUploadError={handleUploadError}
              maxFiles={5}
              maxFileSize={10 * 1024 * 1024} // 10MB
              acceptedTypes={['pdf', 'docx', 'txt', 'md', 'png', 'jpg', 'jpeg']}
              multiple={true}
              className="max-w-2xl"
            />
          </div>
        </div>

        {/* File Manager Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            File Manager
          </h2>
          <FileManager
            key={refreshKey}
            onFileSelect={handleFileSelect}
            onFileDelete={handleFileDelete}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
          />
        </div>

        {/* Upload Modal */}
        <Modal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          title="Upload Files"
          size="lg"
        >
          <div className="p-6">
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              onUploadProgress={handleUploadProgress}
              onUploadError={handleUploadError}
              maxFiles={10}
              maxFileSize={50 * 1024 * 1024} // 50MB
              acceptedTypes={['*']} // Accept all file types
              multiple={true}
            />
          </div>
        </Modal>

        {/* File Details Modal */}
        <Modal
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          title="File Details"
          size="md"
        >
          {selectedFile && (
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    File Name
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedFile.originalName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    File Type
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedFile.mimeType}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    File Size
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploaded By
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedFile.uploader.firstName} {selectedFile.uploader.lastName} ({selectedFile.uploader.email})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Upload Date
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {new Date(selectedFile.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Processing Jobs */}
                {selectedFile.processingJobs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Processing Jobs
                    </label>
                    <div className="space-y-2">
                      {selectedFile.processingJobs.map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm">{job.jobType}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{job.progress}%</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              job.status === 'COMPLETED' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : job.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : job.status === 'FAILED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversions */}
                {selectedFile.conversions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Conversions
                    </label>
                    <div className="space-y-2">
                      {selectedFile.conversions.map((conversion) => (
                        <div key={conversion.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm">
                            {conversion.fromFormat} → {conversion.toFormat}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              conversion.status === 'COMPLETED' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : conversion.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : conversion.status === 'FAILED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {conversion.status}
                            </span>
                            {conversion.convertedUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(conversion.convertedUrl, '_blank')}
                              >
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thumbnails */}
                {selectedFile.thumbnails.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thumbnails
                    </label>
                    <div className="flex space-x-2">
                      {selectedFile.thumbnails.map((thumbnail) => (
                        <div key={thumbnail.id} className="text-center">
                          {thumbnail.s3Url && (
                            <img
                              src={thumbnail.s3Url}
                              alt={`${thumbnail.size} thumbnail`}
                              className="w-16 h-16 object-cover rounded border"
                            />
                          )}
                          <span className="text-xs text-gray-500 mt-1 block">
                            {thumbnail.size}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Feature Information */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-blue-800 dark:text-blue-200 font-medium mb-4">
            File Upload System Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
            <div>
              <h4 className="font-medium mb-2">Upload Features:</h4>
              <ul className="space-y-1">
                <li>• Drag & drop interface</li>
                <li>• Multiple file selection</li>
                <li>• File type validation</li>
                <li>• File size limits</li>
                <li>• Virus scanning (configurable)</li>
                <li>• Progress tracking</li>
                <li>• Error handling</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Processing Features:</h4>
              <ul className="space-y-1">
                <li>• Document conversion (PDF, DOCX → Markdown)</li>
                <li>• Thumbnail generation</li>
                <li>• Metadata extraction</li>
                <li>• Text extraction for search</li>
                <li>• Background job processing</li>
                <li>• S3 storage with tenant isolation</li>
                <li>• Presigned URL downloads</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadExample;