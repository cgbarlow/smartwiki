import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface S3UploadParams {
  file: Buffer;
  filename: string;
  mimeType: string;
  tenantId: string;
  folder?: string;
  userId: string;
  isPublic?: boolean;
}

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  etag: string;
  size: number;
  checksum: string;
}

export interface S3DownloadParams {
  key: string;
  tenantId: string;
  userId: string;
}

export interface S3DeleteParams {
  key: string;
  tenantId: string;
  userId: string;
}

export interface S3FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.s3.region,
      credentials: config.aws.accessKeyId && config.aws.secretAccessKey ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      } : undefined,
    });
    
    this.bucket = config.s3.bucketName || '';
    
    if (!this.bucket) {
      logger.warn('S3 bucket name not configured, S3 operations will fail');
    }
  }

  /**
   * Generate a tenant-isolated S3 key
   */
  private generateS3Key(tenantId: string, filename: string, folder?: string): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const uuid = uuidv4();
    const uniqueFilename = `${timestamp}_${uuid}_${sanitizedFilename}`;
    
    if (folder) {
      return `tenants/${tenantId}/files/${folder}/${uniqueFilename}`;
    }
    
    return `tenants/${tenantId}/files/${uniqueFilename}`;
  }

  /**
   * Generate checksum for file integrity
   */
  private generateChecksum(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Validate tenant access to S3 key
   */
  private validateTenantAccess(key: string, tenantId: string): boolean {
    const expectedPrefix = `tenants/${tenantId}/`;
    return key.startsWith(expectedPrefix);
  }

  /**
   * Upload file to S3 with tenant isolation
   */
  async uploadFile(params: S3UploadParams): Promise<S3UploadResult> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      const key = this.generateS3Key(params.tenantId, params.filename, params.folder);
      const checksum = this.generateChecksum(params.file);
      
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: params.file,
          ContentType: params.mimeType,
          Metadata: {
            tenantId: params.tenantId,
            uploadedBy: params.userId,
            originalName: params.filename,
            checksum: checksum,
            uploadTimestamp: new Date().toISOString(),
          },
          ...(params.isPublic ? { ACL: 'public-read' } : {}),
        },
      });

      const result = await upload.done();
      
      logger.info('File uploaded to S3', {
        key,
        bucket: this.bucket,
        size: params.file.length,
        tenantId: params.tenantId,
        userId: params.userId,
      });

      return {
        key,
        url: `https://${this.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`,
        bucket: this.bucket,
        etag: result.ETag || '',
        size: params.file.length,
        checksum,
      };
    } catch (error) {
      logger.error('Failed to upload file to S3', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: params.tenantId,
        userId: params.userId,
        filename: params.filename,
      });
      throw error;
    }
  }

  /**
   * Download file from S3 with tenant validation
   */
  async downloadFile(params: S3DownloadParams): Promise<Buffer> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      if (!this.validateTenantAccess(params.key, params.tenantId)) {
        throw new Error('Access denied: Invalid tenant access to file');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File not found or empty');
      }

      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download file from S3', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key: params.key,
        tenantId: params.tenantId,
        userId: params.userId,
      });
      throw error;
    }
  }

  /**
   * Delete file from S3 with tenant validation
   */
  async deleteFile(params: S3DeleteParams): Promise<void> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      if (!this.validateTenantAccess(params.key, params.tenantId)) {
        throw new Error('Access denied: Invalid tenant access to file');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
      });

      await this.s3Client.send(command);
      
      logger.info('File deleted from S3', {
        key: params.key,
        tenantId: params.tenantId,
        userId: params.userId,
      });
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key: params.key,
        tenantId: params.tenantId,
        userId: params.userId,
      });
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string, tenantId: string): Promise<S3FileMetadata> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      if (!this.validateTenantAccess(key, tenantId)) {
        throw new Error('Access denied: Invalid tenant access to file');
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
        contentType: response.ContentType || '',
        metadata: response.Metadata,
      };
    } catch (error) {
      logger.error('Failed to get file metadata from S3', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Generate presigned URL for file download
   */
  async generatePresignedUrl(key: string, tenantId: string, expiresIn: number = 3600): Promise<string> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      if (!this.validateTenantAccess(key, tenantId)) {
        throw new Error('Access denied: Invalid tenant access to file');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      logger.info('Generated presigned URL', {
        key,
        tenantId,
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate presigned URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string, tenantId: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key, tenantId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy file within S3 (for conversions, backups, etc.)
   */
  async copyFile(sourceKey: string, destKey: string, tenantId: string): Promise<void> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      if (!this.validateTenantAccess(sourceKey, tenantId) || !this.validateTenantAccess(destKey, tenantId)) {
        throw new Error('Access denied: Invalid tenant access to file');
      }

      // Use S3's copy operation for efficiency
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: destKey,
        CopySource: `${this.bucket}/${sourceKey}`,
      });

      await this.s3Client.send(command);
      
      logger.info('File copied in S3', {
        sourceKey,
        destKey,
        tenantId,
      });
    } catch (error) {
      logger.error('Failed to copy file in S3', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceKey,
        destKey,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Get tenant's storage usage
   */
  async getTenantStorageUsage(tenantId: string): Promise<{ totalSize: number; fileCount: number }> {
    try {
      if (!this.bucket) {
        throw new Error('S3 bucket not configured');
      }

      // This is a simplified version - in production, you'd use S3 inventory or CloudWatch metrics
      // For now, we'll return placeholder data
      logger.info('Getting tenant storage usage', { tenantId });
      
      return {
        totalSize: 0,
        fileCount: 0,
      };
    } catch (error) {
      logger.error('Failed to get tenant storage usage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      throw error;
    }
  }
}

export const s3Service = new S3Service();