import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { s3Service } from '../services/s3Service';
import { fileValidationService } from '../services/fileValidationService';
import { fileProcessingService } from '../services/fileProcessingService';
import { thumbnailService } from '../services/thumbnailService';
import { config } from '../config/config';
import * as multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // Basic file type check - more detailed validation happens later
    const allowedTypes = config.upload.allowedTypes;
    const isAllowed = allowedTypes.some(type => 
      file.mimetype.includes(type) || type === '*'
    );
    
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
}

/**
 * Upload a single file
 */
export const uploadFile = [
  upload.single('file'),
  body('folderId').optional().isString(),
  body('isPublic').optional().isBoolean(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      const { folderId, isPublic = false } = req.body;
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      logger.info('File upload started', {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        userId,
        tenantId,
      });

      // Validate file
      const validationResult = await fileValidationService.validateBeforeUpload(file, {
        enableVirusScanning: true,
        strictTypeChecking: true,
        allowExecutables: false,
      });

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'File validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });
      }

      // Generate unique filename
      const uniqueFilename = `${uuidv4()}_${file.originalname}`;

      // Upload to S3
      const s3Result = await s3Service.uploadFile({
        file: file.buffer,
        filename: uniqueFilename,
        mimeType: validationResult.fileInfo.detectedMimeType,
        tenantId,
        folder: folderId ? 'folder-files' : undefined,
        userId,
        isPublic,
      });

      // Create file record in database
      const fileRecord = await prisma.file.create({
        data: {
          originalName: file.originalname,
          filename: uniqueFilename,
          mimeType: validationResult.fileInfo.detectedMimeType,
          size: file.size,
          s3Key: s3Result.key,
          s3Bucket: s3Result.bucket,
          s3Url: s3Result.url,
          checksum: validationResult.fileInfo.checksum,
          metadata: {
            uploadedAt: new Date().toISOString(),
            detectedExtension: validationResult.fileInfo.detectedExtension,
            validation: {
              warnings: validationResult.warnings,
              virusScanResult: validationResult.virusScanResult,
            },
          },
          uploadedBy: userId,
          tenantId,
          folderId: folderId || null,
          isPublic,
          uploadStatus: 'COMPLETED',
          virusScanned: !!validationResult.virusScanResult,
          scanResult: validationResult.virusScanResult?.isClean ? 'CLEAN' : undefined,
        },
      });

      // Start background processing
      const jobIds = await fileProcessingService.processFile(fileRecord.id, userId);

      logger.info('File uploaded successfully', {
        fileId: fileRecord.id,
        s3Key: s3Result.key,
        processingJobs: jobIds,
      });

      // Return response with file info and processing job IDs
      res.status(201).json({
        success: true,
        file: {
          id: fileRecord.id,
          originalName: fileRecord.originalName,
          filename: fileRecord.filename,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          uploadStatus: fileRecord.uploadStatus,
          createdAt: fileRecord.createdAt,
        },
        processingJobs: jobIds,
        warnings: validationResult.warnings,
      });
    } catch (error) {
      logger.error('File upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: req.file?.originalname,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = [
  upload.array('files', 10), // Max 10 files
  body('folderId').optional().isString(),
  body('isPublic').optional().isBoolean(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided',
        });
      }

      const { folderId, isPublic = false } = req.body;
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;

      logger.info('Multiple file upload started', {
        fileCount: files.length,
        userId,
        tenantId,
      });

      const results = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          // Validate file
          const validationResult = await fileValidationService.validateBeforeUpload(file);

          if (!validationResult.isValid) {
            errors.push({
              filename: file.originalname,
              errors: validationResult.errors,
            });
            continue;
          }

          // Generate unique filename
          const uniqueFilename = `${uuidv4()}_${file.originalname}`;

          // Upload to S3
          const s3Result = await s3Service.uploadFile({
            file: file.buffer,
            filename: uniqueFilename,
            mimeType: validationResult.fileInfo.detectedMimeType,
            tenantId,
            folder: folderId ? 'folder-files' : undefined,
            userId,
            isPublic,
          });

          // Create file record
          const fileRecord = await prisma.file.create({
            data: {
              originalName: file.originalname,
              filename: uniqueFilename,
              mimeType: validationResult.fileInfo.detectedMimeType,
              size: file.size,
              s3Key: s3Result.key,
              s3Bucket: s3Result.bucket,
              s3Url: s3Result.url,
              checksum: validationResult.fileInfo.checksum,
              metadata: {
                uploadedAt: new Date().toISOString(),
                detectedExtension: validationResult.fileInfo.detectedExtension,
                validation: {
                  warnings: validationResult.warnings,
                  virusScanResult: validationResult.virusScanResult,
                },
              },
              uploadedBy: userId,
              tenantId,
              folderId: folderId || null,
              isPublic,
              uploadStatus: 'COMPLETED',
              virusScanned: !!validationResult.virusScanResult,
              scanResult: validationResult.virusScanResult?.isClean ? 'CLEAN' : undefined,
            },
          });

          // Start background processing
          const jobIds = await fileProcessingService.processFile(fileRecord.id, userId);

          results.push({
            file: {
              id: fileRecord.id,
              originalName: fileRecord.originalName,
              filename: fileRecord.filename,
              mimeType: fileRecord.mimeType,
              size: fileRecord.size,
              uploadStatus: fileRecord.uploadStatus,
              createdAt: fileRecord.createdAt,
            },
            processingJobs: jobIds,
            warnings: validationResult.warnings,
          });
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Multiple file upload completed', {
        successCount: results.length,
        errorCount: errors.length,
      });

      res.status(201).json({
        success: true,
        uploadedFiles: results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      logger.error('Multiple file upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: 'Multiple file upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Get file list for tenant
 */
export const getFiles = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('folderId').optional().isString(),
  query('mimeType').optional().isString(),
  query('search').optional().isString(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const page = req.query.page as unknown as number || 1;
      const limit = req.query.limit as unknown as number || 20;
      const { folderId, mimeType, search } = req.query;
      const tenantId = req.user!.tenantId;

      // Build where clause
      const where: any = { tenantId };

      if (folderId) {
        where.folderId = folderId;
      }

      if (mimeType) {
        where.mimeType = { contains: mimeType as string };
      }

      if (search) {
        where.OR = [
          { originalName: { contains: search as string, mode: 'insensitive' } },
          { filename: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Get files with pagination
      const [files, totalCount] = await Promise.all([
        prisma.file.findMany({
          where,
          include: {
            uploader: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            folder: {
              select: { id: true, name: true, path: true },
            },
            thumbnails: {
              select: { id: true, size: true, s3Url: true, width: true, height: true },
            },
            conversions: {
              select: { id: true, fromFormat: true, toFormat: true, status: true, convertedUrl: true },
            },
            processingJobs: {
              select: { id: true, jobType: true, status: true, progress: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.file.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        files,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      logger.error('Failed to get files', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: req.user?.tenantId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get files',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Get file by ID
 */
export const getFile = [
  param('id').isString(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const fileId = req.params.id;
      const tenantId = req.user!.tenantId;

      const file = await prisma.file.findFirst({
        where: { id: fileId, tenantId },
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          folder: {
            select: { id: true, name: true, path: true },
          },
          thumbnails: {
            select: { id: true, size: true, s3Url: true, width: true, height: true },
          },
          conversions: {
            select: { id: true, fromFormat: true, toFormat: true, status: true, convertedUrl: true },
          },
          processingJobs: {
            select: { id: true, jobType: true, status: true, progress: true, errorMessage: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      res.json({
        success: true,
        file,
      });
    } catch (error) {
      logger.error('Failed to get file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: req.params.id,
        tenantId: req.user?.tenantId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get file',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Download file
 */
export const downloadFile = [
  param('id').isString(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const fileId = req.params.id;
      const tenantId = req.user!.tenantId;

      const file = await prisma.file.findFirst({
        where: { id: fileId, tenantId },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      // Generate presigned URL for download
      const downloadUrl = await s3Service.generatePresignedUrl(
        file.s3Key,
        tenantId,
        3600 // 1 hour expiration
      );

      res.json({
        success: true,
        downloadUrl,
        filename: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
      });
    } catch (error) {
      logger.error('Failed to generate download URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: req.params.id,
        tenantId: req.user?.tenantId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate download URL',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Delete file
 */
export const deleteFile = [
  param('id').isString(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const fileId = req.params.id;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.id;

      const file = await prisma.file.findFirst({
        where: { id: fileId, tenantId },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      // Check if user has permission to delete (owner or admin)
      if (file.uploadedBy !== userId && req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      // Delete from S3
      await s3Service.deleteFile({
        key: file.s3Key,
        tenantId,
        userId,
      });

      // Delete thumbnails
      await thumbnailService.deleteThumbnails(fileId, tenantId);

      // Delete file record and related data (cascading deletes will handle conversions and jobs)
      await prisma.file.delete({
        where: { id: fileId },
      });

      logger.info('File deleted successfully', {
        fileId,
        s3Key: file.s3Key,
        deletedBy: userId,
      });

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: req.params.id,
        tenantId: req.user?.tenantId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Get file thumbnail
 */
export const getFileThumbnail = [
  param('id').isString(),
  query('size').optional().isIn(['SMALL', 'MEDIUM', 'LARGE']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const fileId = req.params.id;
      const size = (req.query.size as 'SMALL' | 'MEDIUM' | 'LARGE') || 'MEDIUM';
      const tenantId = req.user!.tenantId;

      // Check if file exists and belongs to tenant
      const file = await prisma.file.findFirst({
        where: { id: fileId, tenantId },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      // Get thumbnail URL
      const thumbnailUrl = await thumbnailService.getThumbnailUrl(fileId, size, tenantId);

      if (!thumbnailUrl) {
        return res.status(404).json({
          success: false,
          message: 'Thumbnail not found',
        });
      }

      res.json({
        success: true,
        thumbnailUrl,
        size,
      });
    } catch (error) {
      logger.error('Failed to get file thumbnail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: req.params.id,
        tenantId: req.user?.tenantId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get file thumbnail',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Get processing job status
 */
export const getProcessingJobStatus = [
  param('jobId').isString(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const jobId = req.params.jobId;
      const tenantId = req.user!.tenantId;

      const job = await fileProcessingService.getJobStatus(jobId);

      if (!job || job.file.tenantId !== tenantId) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          fileId: job.fileId,
          jobType: job.jobType,
          status: job.status,
          priority: job.priority,
          progress: job.progress,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt,
        },
      });
    } catch (error) {
      logger.error('Failed to get job status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: req.params.jobId,
        tenantId: req.user?.tenantId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
];

/**
 * Get processing queue status
 */
export const getQueueStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to view queue status
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied',
      });
    }

    const queueStatus = fileProcessingService.getQueueStatus();

    res.json({
      success: true,
      queueStatus,
    });
  } catch (error) {
    logger.error('Failed to get queue status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get queue status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};