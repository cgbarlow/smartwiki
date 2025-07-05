import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/config/database';
import { config } from '@/config/config';
import { logger } from '@/utils/logger';
import { authMiddleware } from '@/middleware/auth';
import { validationMiddleware } from '@/middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
    if (config.upload.allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${config.upload.allowedTypes.join(', ')}`));
    }
  },
});

/**
 * Upload a document
 */
router.post('/upload', upload.single('document'), [
  body('title').optional().isString().isLength({ min: 1, max: 255 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject(),
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const { title, description, tags, metadata } = req.body;

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: title || req.file.originalname,
        description,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedById: req.user.userId,
        metadata: metadata || {},
        tags: tags || [],
      },
    });

    logger.info(`📄 Document uploaded: ${document.id} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document },
    });

  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    logger.error('❌ Document upload failed:', error);
    res.status(500).json({
      success: false,
      message: 'Document upload failed',
      error: 'Internal server error',
    });
  }
});

/**
 * Get all documents with pagination and filtering
 */
router.get('/', [
  validationMiddleware.pagination,
  validationMiddleware.search,
  query('mimeType').optional().isString(),
  query('uploadedBy').optional().isString(),
  query('tags').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { page, limit, offset } = req.pagination!;
    const { q: searchQuery, mimeType, uploadedBy, tags } = req.query;

    // Build where clause
    const where: any = {};

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery as string, mode: 'insensitive' } },
        { description: { contains: searchQuery as string, mode: 'insensitive' } },
        { originalName: { contains: searchQuery as string, mode: 'insensitive' } },
      ];
    }

    if (mimeType) {
      where.mimeType = mimeType;
    }

    if (uploadedBy) {
      where.uploadedById = uploadedBy;
    }

    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      where.tags = {
        hasSome: tagArray,
      };
    }

    // Get documents with pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    logger.error('❌ Failed to get documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: 'Internal server error',
    });
  }
});

/**
 * Get a specific document by ID
 */
router.get('/:id', [
  param('id').isString().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            content: true.substring(0, 200), // Preview only
          },
          orderBy: { chunkIndex: 'asc' },
        },
        embeddings: {
          select: {
            id: true,
            provider: true,
            model: true,
            createdAt: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.json({
      success: true,
      data: { document },
    });

  } catch (error) {
    logger.error('❌ Failed to get document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document',
      error: 'Internal server error',
    });
  }
});

/**
 * Update document metadata
 */
router.put('/:id', [
  param('id').isString().isLength({ min: 1 }),
  body('title').optional().isString().isLength({ min: 1, max: 255 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('metadata').optional().isObject(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { title, description, tags, metadata } = req.body;

    // Check if document exists and user has permission
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // For now, allow only the uploader to edit. In a real app, you might have more complex permissions
    if (existingDocument.uploadedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own documents',
      });
    }

    // Update document
    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(tags && { tags }),
        ...(metadata && { metadata }),
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info(`📝 Document updated: ${document.id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: { document },
    });

  } catch (error) {
    logger.error('❌ Failed to update document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document',
      error: 'Internal server error',
    });
  }
});

/**
 * Delete a document
 */
router.delete('/:id', [
  param('id').isString().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    // Check if document exists and user has permission
    const existingDocument = await prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // For now, allow only the uploader to delete
    if (existingDocument.uploadedById !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own documents',
      });
    }

    // Delete document and related data
    await prisma.$transaction(async (tx) => {
      // Delete embeddings
      await tx.documentEmbedding.deleteMany({
        where: { documentId: id },
      });

      // Delete chunks
      await tx.documentChunk.deleteMany({
        where: { documentId: id },
      });

      // Delete document
      await tx.document.delete({
        where: { id },
      });
    });

    // Delete physical file
    try {
      await fs.unlink(existingDocument.path);
    } catch (error) {
      logger.warn(`⚠️ Failed to delete physical file: ${existingDocument.path}`);
    }

    logger.info(`🗑️ Document deleted: ${id} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });

  } catch (error) {
    logger.error('❌ Failed to delete document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: 'Internal server error',
    });
  }
});

/**
 * Download a document
 */
router.get('/:id/download', [
  param('id').isString().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Check if file exists
    try {
      await fs.access(document.path);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Document file not found',
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);

    // Stream the file
    res.sendFile(path.resolve(document.path));

    logger.info(`📥 Document downloaded: ${document.id} by user ${req.user.userId}`);

  } catch (error) {
    logger.error('❌ Failed to download document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: 'Internal server error',
    });
  }
});

/**
 * Get document statistics
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const [totalDocuments, totalSize, mimeTypeStats, recentUploads] = await Promise.all([
      prisma.document.count(),
      prisma.document.aggregate({
        _sum: { size: true },
      }),
      prisma.document.groupBy({
        by: ['mimeType'],
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
      }),
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const stats = {
      totalDocuments,
      totalSize: totalSize._sum.size || 0,
      mimeTypeDistribution: mimeTypeStats.map(stat => ({
        mimeType: stat.mimeType,
        count: stat._count._all,
      })),
      recentUploads,
    };

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('❌ Failed to get document statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document statistics',
      error: 'Internal server error',
    });
  }
});

export default router;