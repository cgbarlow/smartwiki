import sharp from 'sharp';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { s3Service } from './s3Service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
}

export interface ThumbnailResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface GenerateThumbnailsParams {
  originalBuffer: Buffer;
  originalMimeType: string;
  fileId: string;
  tenantId: string;
  userId: string;
}

export class ThumbnailService {
  private supportedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
  ];

  private supportedDocumentTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  /**
   * Generate a single thumbnail
   */
  async generateThumbnail(
    inputBuffer: Buffer,
    options: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    try {
      logger.info('Generating thumbnail', {
        inputSize: inputBuffer.length,
        targetSize: `${options.width}x${options.height}`,
        format: options.format || 'jpeg',
      });

      let sharpInstance = sharp(inputBuffer);

      // Get image metadata
      const metadata = await sharpInstance.metadata();
      
      // Configure resize options
      const resizeOptions: sharp.ResizeOptions = {
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 1 },
      };

      // Apply transformations
      sharpInstance = sharpInstance.resize(resizeOptions);

      // Set output format and quality
      const format = options.format || 'jpeg';
      const quality = options.quality || 85;

      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        default:
          sharpInstance = sharpInstance.jpeg({ quality });
      }

      // Generate thumbnail
      const buffer = await sharpInstance.toBuffer();
      const outputMetadata = await sharp(buffer).metadata();

      logger.info('Thumbnail generated successfully', {
        originalSize: inputBuffer.length,
        thumbnailSize: buffer.length,
        dimensions: `${outputMetadata.width}x${outputMetadata.height}`,
        format: outputMetadata.format,
      });

      return {
        buffer,
        metadata: {
          width: outputMetadata.width || options.width,
          height: outputMetadata.height || options.height,
          format: outputMetadata.format || format,
          size: buffer.length,
        },
      };
    } catch (error) {
      logger.error('Failed to generate thumbnail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        inputSize: inputBuffer.length,
        options,
      });
      throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate thumbnails for all configured sizes
   */
  async generateThumbnails(params: GenerateThumbnailsParams): Promise<void> {
    try {
      logger.info('Generating thumbnails for file', {
        fileId: params.fileId,
        mimeType: params.originalMimeType,
        tenantId: params.tenantId,
      });

      // Check if file type supports thumbnail generation
      if (!this.canGenerateThumbnail(params.originalMimeType)) {
        logger.info('File type does not support thumbnail generation', {
          fileId: params.fileId,
          mimeType: params.originalMimeType,
        });
        return;
      }

      // Get thumbnail sizes from configuration
      const thumbnailSizes = config.processing.thumbnailSizes;
      
      // Process each size
      for (const size of thumbnailSizes) {
        try {
          await this.generateAndStoreThumbnail(params, size);
        } catch (error) {
          logger.error('Failed to generate thumbnail size', {
            error: error instanceof Error ? error.message : 'Unknown error',
            fileId: params.fileId,
            size,
          });
          // Continue with other sizes even if one fails
        }
      }

      logger.info('Thumbnails generation completed', {
        fileId: params.fileId,
        sizesProcessed: thumbnailSizes.length,
      });
    } catch (error) {
      logger.error('Failed to generate thumbnails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: params.fileId,
      });
      throw error;
    }
  }

  /**
   * Generate and store a single thumbnail size
   */
  private async generateAndStoreThumbnail(
    params: GenerateThumbnailsParams,
    size: { width: number; height: number }
  ): Promise<void> {
    try {
      // Prepare input buffer based on file type
      let inputBuffer = params.originalBuffer;
      
      // For PDF files, we need to convert the first page to image
      if (params.originalMimeType === 'application/pdf') {
        inputBuffer = await this.convertPdfToImage(params.originalBuffer);
      }

      // Generate thumbnail
      const thumbnailResult = await this.generateThumbnail(inputBuffer, {
        width: size.width,
        height: size.height,
        quality: 85,
        format: 'jpeg',
        fit: 'cover',
      });

      // Determine thumbnail size category
      const thumbnailSize = this.getThumbnailSizeCategory(size.width, size.height);

      // Upload thumbnail to S3
      const s3Result = await s3Service.uploadFile({
        file: thumbnailResult.buffer,
        filename: `thumbnail_${thumbnailSize}_${params.fileId}.jpg`,
        mimeType: 'image/jpeg',
        tenantId: params.tenantId,
        folder: 'thumbnails',
        userId: params.userId,
        isPublic: false,
      });

      // Save thumbnail record to database
      await prisma.fileThumbnail.create({
        data: {
          fileId: params.fileId,
          size: thumbnailSize,
          s3Key: s3Result.key,
          s3Url: s3Result.url,
          mimeType: 'image/jpeg',
          width: thumbnailResult.metadata.width,
          height: thumbnailResult.metadata.height,
          fileSize: thumbnailResult.metadata.size,
        },
      });

      logger.info('Thumbnail generated and stored', {
        fileId: params.fileId,
        size: thumbnailSize,
        s3Key: s3Result.key,
        dimensions: `${thumbnailResult.metadata.width}x${thumbnailResult.metadata.height}`,
      });
    } catch (error) {
      logger.error('Failed to generate and store thumbnail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: params.fileId,
        size,
      });
      throw error;
    }
  }

  /**
   * Convert PDF first page to image for thumbnail generation
   */
  private async convertPdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      // For PDF thumbnail generation, we would typically use a library like pdf-poppler
      // or pdf2pic, but for this implementation, we'll create a placeholder
      // In a real implementation, you'd convert the first page to an image
      
      logger.warn('PDF to image conversion not implemented - using placeholder');
      
      // Create a placeholder image
      const placeholder = await sharp({
        create: {
          width: 200,
          height: 300,
          channels: 3,
          background: { r: 240, g: 240, b: 240 },
        },
      })
      .png()
      .toBuffer();

      return placeholder;
    } catch (error) {
      logger.error('Failed to convert PDF to image', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get thumbnail size category based on dimensions
   */
  private getThumbnailSizeCategory(width: number, height: number): 'SMALL' | 'MEDIUM' | 'LARGE' {
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 200) {
      return 'SMALL';
    } else if (maxDimension <= 400) {
      return 'MEDIUM';
    } else {
      return 'LARGE';
    }
  }

  /**
   * Check if file type can generate thumbnails
   */
  canGenerateThumbnail(mimeType: string): boolean {
    return this.supportedImageTypes.includes(mimeType) || 
           this.supportedDocumentTypes.includes(mimeType);
  }

  /**
   * Get supported thumbnail types
   */
  getSupportedThumbnailTypes(): string[] {
    return [...this.supportedImageTypes, ...this.supportedDocumentTypes];
  }

  /**
   * Delete thumbnails for a file
   */
  async deleteThumbnails(fileId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Deleting thumbnails for file', { fileId });

      // Get all thumbnails for the file
      const thumbnails = await prisma.fileThumbnail.findMany({
        where: { fileId },
      });

      // Delete each thumbnail from S3
      for (const thumbnail of thumbnails) {
        try {
          await s3Service.deleteFile({
            key: thumbnail.s3Key,
            tenantId,
            userId: 'system', // System deletion
          });
        } catch (error) {
          logger.error('Failed to delete thumbnail from S3', {
            error: error instanceof Error ? error.message : 'Unknown error',
            fileId,
            s3Key: thumbnail.s3Key,
          });
        }
      }

      // Delete thumbnail records from database
      await prisma.fileThumbnail.deleteMany({
        where: { fileId },
      });

      logger.info('Thumbnails deleted successfully', {
        fileId,
        count: thumbnails.length,
      });
    } catch (error) {
      logger.error('Failed to delete thumbnails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
      });
      throw error;
    }
  }

  /**
   * Get thumbnails for a file
   */
  async getThumbnails(fileId: string) {
    try {
      const thumbnails = await prisma.fileThumbnail.findMany({
        where: { fileId },
        orderBy: { size: 'asc' },
      });

      return thumbnails;
    } catch (error) {
      logger.error('Failed to get thumbnails', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
      });
      throw error;
    }
  }

  /**
   * Get thumbnail URL with presigned access
   */
  async getThumbnailUrl(fileId: string, size: 'SMALL' | 'MEDIUM' | 'LARGE', tenantId: string): Promise<string | null> {
    try {
      const thumbnail = await prisma.fileThumbnail.findUnique({
        where: {
          fileId_size: {
            fileId,
            size,
          },
        },
      });

      if (!thumbnail) {
        return null;
      }

      // Generate presigned URL
      const presignedUrl = await s3Service.generatePresignedUrl(
        thumbnail.s3Key,
        tenantId,
        3600 // 1 hour expiration
      );

      return presignedUrl;
    } catch (error) {
      logger.error('Failed to get thumbnail URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
        size,
      });
      throw error;
    }
  }
}

export const thumbnailService = new ThumbnailService();