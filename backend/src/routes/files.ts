import { Router } from 'express';
import {
  uploadFile,
  uploadMultipleFiles,
  getFiles,
  getFile,
  downloadFile,
  deleteFile,
  getFileThumbnail,
  getProcessingJobStatus,
  getQueueStatus,
} from '../controllers/fileController';
import { authMiddleware, requireRole } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @route POST /api/v1/files/upload
 * @desc Upload a single file
 * @access Private
 */
router.post('/upload', uploadFile);

/**
 * @route POST /api/v1/files/upload-multiple
 * @desc Upload multiple files
 * @access Private
 */
router.post('/upload-multiple', uploadMultipleFiles);

/**
 * @route GET /api/v1/files
 * @desc Get files for tenant with pagination and filtering
 * @access Private
 */
router.get('/', getFiles);

/**
 * @route GET /api/v1/files/:id
 * @desc Get file by ID
 * @access Private
 */
router.get('/:id', getFile);

/**
 * @route GET /api/v1/files/:id/download
 * @desc Get file download URL
 * @access Private
 */
router.get('/:id/download', downloadFile);

/**
 * @route DELETE /api/v1/files/:id
 * @desc Delete file
 * @access Private (Owner or Admin)
 */
router.delete('/:id', deleteFile);

/**
 * @route GET /api/v1/files/:id/thumbnail
 * @desc Get file thumbnail
 * @access Private
 */
router.get('/:id/thumbnail', getFileThumbnail);

/**
 * @route GET /api/v1/files/jobs/:jobId/status
 * @desc Get processing job status
 * @access Private
 */
router.get('/jobs/:jobId/status', getProcessingJobStatus);

/**
 * @route GET /api/v1/files/queue/status
 * @desc Get processing queue status
 * @access Private (Admin only)
 */
router.get('/queue/status', requireRole(['ADMIN']), getQueueStatus);

export default router;