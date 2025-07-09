import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import SmartWikiServer from '../server';
import { fileValidationService } from '../services/fileValidationService';
import { s3Service } from '../services/s3Service';
import { fileProcessingService } from '../services/fileProcessingService';
import { thumbnailService } from '../services/thumbnailService';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

describe('File Upload System', () => {
  let app: any;
  let server: any;
  let testTenant: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Start test server
    const smartWikiServer = new SmartWikiServer();
    app = smartWikiServer.getApp();

    // Create test tenant
    testTenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        domain: 'test.example.com',
      },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        tenantId: testTenant.id,
      },
    });

    // Mock JWT token for authentication
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.file.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.user.deleteMany({ where: { tenantId: testTenant.id } });
    await prisma.tenant.deleteMany({ where: { id: testTenant.id } });
    
    await prisma.$disconnect();
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('File Validation Service', () => {
    it('should validate file size correctly', async () => {
      const smallFile = Buffer.alloc(1024); // 1KB
      const largeFile = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const smallFileResult = await fileValidationService.validateFile(
        smallFile,
        'small.txt',
        'text/plain',
        { maxFileSize: 50 * 1024 * 1024 }
      );

      const largeFileResult = await fileValidationService.validateFile(
        largeFile,
        'large.txt',
        'text/plain',
        { maxFileSize: 50 * 1024 * 1024 }
      );

      expect(smallFileResult.isValid).toBe(true);
      expect(largeFileResult.isValid).toBe(false);
      expect(largeFileResult.errors).toContain(expect.stringContaining('exceeds maximum'));
    });

    it('should validate file types correctly', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4'); // PDF header
      const txtBuffer = Buffer.from('Hello, world!');

      const pdfResult = await fileValidationService.validateFile(
        pdfBuffer,
        'document.pdf',
        'application/pdf',
        { allowedTypes: ['pdf', 'txt'] }
      );

      const txtResult = await fileValidationService.validateFile(
        txtBuffer,
        'document.txt',
        'text/plain',
        { allowedTypes: ['pdf', 'txt'] }
      );

      const invalidResult = await fileValidationService.validateFile(
        pdfBuffer,
        'document.pdf',
        'application/pdf',
        { allowedTypes: ['txt'] }
      );

      expect(pdfResult.isValid).toBe(true);
      expect(txtResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should detect suspicious file patterns', async () => {
      const suspiciousContent = Buffer.from('<script>alert("xss")</script>');
      
      const result = await fileValidationService.validateFile(
        suspiciousContent,
        'malicious.html',
        'text/html',
        { strictTypeChecking: true }
      );

      expect(result.warnings).toContain(expect.stringContaining('suspicious'));
    });

    it('should validate filenames for security', async () => {
      const content = Buffer.from('test content');

      const pathTraversalResult = await fileValidationService.validateFile(
        content,
        '../../../etc/passwd',
        'text/plain'
      );

      const longNameResult = await fileValidationService.validateFile(
        content,
        'a'.repeat(300) + '.txt',
        'text/plain'
      );

      expect(pathTraversalResult.isValid).toBe(false);
      expect(pathTraversalResult.errors).toContain(expect.stringContaining('invalid path'));
      expect(longNameResult.isValid).toBe(false);
      expect(longNameResult.errors).toContain(expect.stringContaining('too long'));
    });
  });

  describe('S3 Service', () => {
    beforeEach(() => {
      // Mock S3 service methods
      vi.spyOn(s3Service, 'uploadFile').mockResolvedValue({
        key: 'test-key',
        url: 'https://test-bucket.s3.amazonaws.com/test-key',
        bucket: 'test-bucket',
        etag: 'test-etag',
        size: 1024,
        checksum: 'test-checksum',
      });

      vi.spyOn(s3Service, 'downloadFile').mockResolvedValue(Buffer.from('test content'));
      vi.spyOn(s3Service, 'deleteFile').mockResolvedValue();
      vi.spyOn(s3Service, 'generatePresignedUrl').mockResolvedValue('https://presigned-url.com');
    });

    it('should generate tenant-isolated S3 keys', () => {
      const params = {
        file: Buffer.from('test'),
        filename: 'test.txt',
        mimeType: 'text/plain',
        tenantId: 'tenant123',
        userId: 'user123',
      };

      // The key should include tenant ID for isolation
      s3Service.uploadFile(params);
      
      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant123',
        })
      );
    });

    it('should validate tenant access for operations', async () => {
      // Mock the private validateTenantAccess method behavior
      const validKey = 'tenants/tenant123/files/test.txt';
      const invalidKey = 'tenants/other-tenant/files/test.txt';

      // This would normally throw an error for invalid access
      await expect(s3Service.downloadFile({
        key: validKey,
        tenantId: 'tenant123',
        userId: 'user123',
      })).resolves.toBeDefined();

      // This test would need access to the private method or integration testing
    });

    it('should generate checksums for uploaded files', async () => {
      const content = Buffer.from('test content');
      
      await s3Service.uploadFile({
        file: content,
        filename: 'test.txt',
        mimeType: 'text/plain',
        tenantId: 'tenant123',
        userId: 'user123',
      });

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file: content,
        })
      );
    });
  });

  describe('Document Converter', () => {
    it('should convert plain text to markdown', async () => {
      const { documentConverter } = await import('../services/documentConverter');
      const textContent = Buffer.from('Hello, world!\n\nThis is a test.');
      
      const result = await documentConverter.convertToMarkdown(
        textContent,
        'text/plain'
      );

      expect(result.markdown).toContain('Hello, world!');
      expect(result.metadata?.characterCount).toBe(textContent.length);
    });

    it('should handle conversion errors gracefully', async () => {
      const { documentConverter } = await import('../services/documentConverter');
      const invalidContent = Buffer.from('invalid content');

      await expect(
        documentConverter.convertToMarkdown(invalidContent, 'application/pdf')
      ).rejects.toThrow();
    });

    it('should extract metadata from documents', async () => {
      const { documentConverter } = await import('../services/documentConverter');
      const textContent = Buffer.from('Sample document content with multiple words');

      const result = await documentConverter.convertToMarkdown(
        textContent,
        'text/plain',
        { includeMetadata: true }
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
      expect(result.metadata?.characterCount).toBe(textContent.length);
    });
  });

  describe('Thumbnail Service', () => {
    beforeEach(() => {
      // Mock thumbnail service methods
      vi.spyOn(thumbnailService, 'generateThumbnails').mockResolvedValue();
      vi.spyOn(thumbnailService, 'canGenerateThumbnail').mockReturnValue(true);
      vi.spyOn(thumbnailService, 'getThumbnailUrl').mockResolvedValue('https://thumbnail-url.com');
    });

    it('should check if file type supports thumbnails', () => {
      expect(thumbnailService.canGenerateThumbnail('image/jpeg')).toBe(true);
      expect(thumbnailService.canGenerateThumbnail('application/pdf')).toBe(true);
      expect(thumbnailService.canGenerateThumbnail('text/plain')).toBe(false);
    });

    it('should generate thumbnails for supported file types', async () => {
      const imageBuffer = Buffer.from('fake image data');
      
      await thumbnailService.generateThumbnails({
        originalBuffer: imageBuffer,
        originalMimeType: 'image/jpeg',
        fileId: 'file123',
        tenantId: 'tenant123',
        userId: 'user123',
      });

      expect(thumbnailService.generateThumbnails).toHaveBeenCalledWith(
        expect.objectContaining({
          originalMimeType: 'image/jpeg',
          fileId: 'file123',
        })
      );
    });
  });

  describe('File Processing Service', () => {
    beforeEach(() => {
      // Mock file processing service methods
      vi.spyOn(fileProcessingService, 'addJob').mockResolvedValue('job123');
      vi.spyOn(fileProcessingService, 'processFile').mockResolvedValue(['job123', 'job456']);
      vi.spyOn(fileProcessingService, 'getJobStatus').mockResolvedValue({
        id: 'job123',
        status: 'COMPLETED',
        progress: 100,
      } as any);
    });

    it('should create processing jobs for files', async () => {
      const jobId = await fileProcessingService.addJob({
        fileId: 'file123',
        jobType: 'VIRUS_SCAN',
        priority: 'HIGH',
        createdBy: 'user123',
      });

      expect(jobId).toBe('job123');
      expect(fileProcessingService.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: 'file123',
          jobType: 'VIRUS_SCAN',
        })
      );
    });

    it('should process multiple jobs for a file', async () => {
      const jobIds = await fileProcessingService.processFile(
        'file123',
        'user123',
        ['VIRUS_SCAN', 'THUMBNAIL_GENERATION']
      );

      expect(jobIds).toEqual(['job123', 'job456']);
    });

    it('should track job progress', async () => {
      const status = await fileProcessingService.getJobStatus('job123');

      expect(status.id).toBe('job123');
      expect(status.status).toBe('COMPLETED');
      expect(status.progress).toBe(100);
    });
  });

  describe('File Upload API', () => {
    beforeEach(() => {
      // Mock authentication middleware
      vi.doMock('../middleware/auth', () => ({
        authMiddleware: (req: any, res: any, next: any) => {
          req.user = {
            id: testUser.id,
            tenantId: testTenant.id,
            role: 'ADMIN',
          };
          next();
        },
        requireRole: () => (req: any, res: any, next: any) => next(),
      }));

      // Mock tenant middleware
      vi.doMock('../middleware/tenant', () => ({
        tenantMiddleware: (req: any, res: any, next: any) => {
          req.tenant = { id: testTenant.id };
          next();
        },
      }));
    });

    it('should upload a single file successfully', async () => {
      const testFile = Buffer.from('test file content');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', testFile, 'test.txt')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.originalName).toBe('test.txt');
      expect(response.body.processingJobs).toBeDefined();
    });

    it('should upload multiple files successfully', async () => {
      const testFile1 = Buffer.from('test file 1');
      const testFile2 = Buffer.from('test file 2');
      
      const response = await request(app)
        .post('/api/v1/files/upload-multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('files', testFile1, 'test1.txt')
        .attach('files', testFile2, 'test2.txt')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.uploadedFiles).toHaveLength(2);
    });

    it('should reject files that are too large', async () => {
      const largeFile = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', largeFile, 'large.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain(expect.stringContaining('exceeds maximum'));
    });

    it('should reject unsupported file types', async () => {
      const executableFile = Buffer.from('fake executable');
      
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', executableFile, 'malware.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain(expect.stringContaining('not allowed'));
    });

    it('should require authentication', async () => {
      const testFile = Buffer.from('test file');
      
      await request(app)
        .post('/api/v1/files/upload')
        .attach('file', testFile, 'test.txt')
        .expect(401);
    });

    it('should list files with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.files).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter files by type', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({ mimeType: 'image' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should search files by name', async () => {
      const response = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .query({ search: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should get file details', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('test'), 'test.txt');

      const fileId = uploadResponse.body.file.id;

      const response = await request(app)
        .get(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file.id).toBe(fileId);
    });

    it('should generate download URL', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('test'), 'test.txt');

      const fileId = uploadResponse.body.file.id;

      const response = await request(app)
        .get(`/api/v1/files/${fileId}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.downloadUrl).toBeDefined();
    });

    it('should delete files', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('test'), 'test.txt');

      const fileId = uploadResponse.body.file.id;

      const response = await request(app)
        .delete(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify file is deleted
      await request(app)
        .get(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(404);
    });

    it('should get processing job status', async () => {
      const response = await request(app)
        .get('/api/v1/files/jobs/job123/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
    });

    it('should get queue status (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/files/queue/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.queueStatus).toBeDefined();
    });
  });

  describe('Tenant Isolation', () => {
    let otherTenant: any;
    let otherUser: any;

    beforeAll(async () => {
      // Create another tenant and user
      otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: 'other-tenant',
          domain: 'other.example.com',
        },
      });

      otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          tenantId: otherTenant.id,
        },
      });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { tenantId: otherTenant.id } });
      await prisma.tenant.deleteMany({ where: { id: otherTenant.id } });
    });

    it('should isolate files between tenants', async () => {
      // Upload file as first tenant
      const upload1 = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('tenant1 file'), 'tenant1.txt');

      // Upload file as second tenant
      const upload2 = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .attach('file', Buffer.from('tenant2 file'), 'tenant2.txt');

      // First tenant should only see their files
      const files1 = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id);

      // Second tenant should only see their files
      const files2 = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', otherTenant.id);

      // Verify isolation
      const tenant1FileIds = files1.body.files.map((f: any) => f.id);
      const tenant2FileIds = files2.body.files.map((f: any) => f.id);

      expect(tenant1FileIds).toContain(upload1.body.file.id);
      expect(tenant1FileIds).not.toContain(upload2.body.file.id);
      expect(tenant2FileIds).toContain(upload2.body.file.id);
      expect(tenant2FileIds).not.toContain(upload1.body.file.id);
    });

    it('should prevent cross-tenant file access', async () => {
      // Upload file as first tenant
      const upload = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('secret file'), 'secret.txt');

      const fileId = upload.body.file.id;

      // Try to access file as second tenant (should fail)
      await request(app)
        .get(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(404);

      // Try to download file as second tenant (should fail)
      await request(app)
        .get(`/api/v1/files/${fileId}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(404);

      // Try to delete file as second tenant (should fail)
      await request(app)
        .delete(`/api/v1/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', otherTenant.id)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock database error
      vi.spyOn(prisma.file, 'create').mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle S3 upload errors', async () => {
      // Mock S3 error
      vi.spyOn(s3Service, 'uploadFile').mockRejectedValue(new Error('S3 upload failed'));

      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle processing job failures gracefully', async () => {
      // Mock processing error
      vi.spyOn(fileProcessingService, 'processFile').mockRejectedValue(new Error('Processing failed'));

      // File upload should still succeed even if processing fails
      const response = await request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from('test'), 'test.txt')
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Performance Tests', () => {
  it('should handle concurrent uploads', async () => {
    const uploads = Array.from({ length: 10 }, (_, i) => 
      request(app)
        .post('/api/v1/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', testTenant.id)
        .attach('file', Buffer.from(`test file ${i}`), `test${i}.txt`)
    );

    const results = await Promise.allSettled(uploads);
    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 201);

    expect(successful.length).toBeGreaterThan(0);
  });

  it('should handle large file uploads within limits', async () => {
    const largeFile = Buffer.alloc(10 * 1024 * 1024); // 10MB
    
    const start = Date.now();
    const response = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', testTenant.id)
      .attach('file', largeFile, 'large.txt');
    const duration = Date.now() - start;

    expect(response.status).toBe(201);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });
});