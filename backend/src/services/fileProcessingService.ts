import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { documentConverter } from './documentConverter';
import { thumbnailService } from './thumbnailService';
import { fileValidationService } from './fileValidationService';
import { s3Service } from './s3Service';
import * as cron from 'node-cron';

const prisma = new PrismaClient();

export interface ProcessingJobData {
  fileId: string;
  jobType: 'VIRUS_SCAN' | 'THUMBNAIL_GENERATION' | 'DOCUMENT_CONVERSION' | 'METADATA_EXTRACTION' | 'TEXT_EXTRACTION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  progress: number;
}

export class FileProcessingService {
  private isProcessing = false;
  private processingQueue: string[] = [];
  private activeJobs = new Map<string, { promise: Promise<void>; cancelFn?: () => void }>();

  constructor() {
    this.startJobProcessor();
    this.scheduleCleanupJobs();
  }

  /**
   * Add a processing job to the queue
   */
  async addJob(jobData: ProcessingJobData): Promise<string> {
    try {
      logger.info('Adding processing job to queue', {
        fileId: jobData.fileId,
        jobType: jobData.jobType,
        priority: jobData.priority,
      });

      // Create job record in database
      const job = await prisma.fileProcessingJob.create({
        data: {
          fileId: jobData.fileId,
          jobType: jobData.jobType,
          priority: jobData.priority,
          metadata: jobData.metadata || {},
          createdBy: jobData.createdBy,
          status: 'PENDING',
          progress: 0,
        },
      });

      // Add to processing queue
      this.processingQueue.push(job.id);
      this.sortQueueByPriority();

      logger.info('Processing job added successfully', {
        jobId: job.id,
        fileId: jobData.fileId,
        queuePosition: this.processingQueue.indexOf(job.id),
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processNextJob();
      }

      return job.id;
    } catch (error) {
      logger.error('Failed to add processing job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: jobData.fileId,
        jobType: jobData.jobType,
      });
      throw error;
    }
  }

  /**
   * Process multiple jobs for a file
   */
  async processFile(
    fileId: string,
    userId: string,
    jobTypes: Array<'VIRUS_SCAN' | 'THUMBNAIL_GENERATION' | 'DOCUMENT_CONVERSION' | 'METADATA_EXTRACTION' | 'TEXT_EXTRACTION'> = []
  ): Promise<string[]> {
    try {
      logger.info('Processing file with multiple jobs', {
        fileId,
        jobTypes,
      });

      // Get file info
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Determine which jobs to run if not specified
      if (jobTypes.length === 0) {
        jobTypes = this.determineRequiredJobs(file.mimeType);
      }

      // Create jobs
      const jobIds: string[] = [];
      for (const jobType of jobTypes) {
        const jobId = await this.addJob({
          fileId,
          jobType,
          priority: this.getJobPriority(jobType),
          createdBy: userId,
        });
        jobIds.push(jobId);
      }

      return jobIds;
    } catch (error) {
      logger.error('Failed to process file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId,
      });
      throw error;
    }
  }

  /**
   * Start the job processor
   */
  private startJobProcessor(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        await this.processNextJob();
      }
    }, 1000); // Check every second
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    // Check if we're at max concurrency
    if (this.activeJobs.size >= config.processing.concurrency) {
      return;
    }

    this.isProcessing = true;
    const jobId = this.processingQueue.shift();

    if (!jobId) {
      this.isProcessing = false;
      return;
    }

    try {
      logger.info('Processing job', { jobId });

      // Get job details
      const job = await prisma.fileProcessingJob.findUnique({
        where: { id: jobId },
        include: { file: true },
      });

      if (!job) {
        logger.error('Job not found', { jobId });
        this.isProcessing = false;
        return;
      }

      // Update job status to processing
      await prisma.fileProcessingJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          progress: 0,
        },
      });

      // Create cancellation token
      let cancelled = false;
      const cancelFn = () => { cancelled = true; };

      // Add to active jobs
      const jobPromise = this.executeJob(job, (progress) => {
        if (!cancelled) {
          this.updateJobProgress(jobId, progress);
        }
      });

      this.activeJobs.set(jobId, { promise: jobPromise, cancelFn });

      // Wait for job completion
      await jobPromise;

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      if (!cancelled) {
        await prisma.fileProcessingJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            progress: 100,
          },
        });

        logger.info('Job completed successfully', { jobId });
      }
    } catch (error) {
      logger.error('Job processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      });

      // Update job status to failed
      await prisma.fileProcessingJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Remove from active jobs
      this.activeJobs.delete(jobId);
    }

    this.isProcessing = false;

    // Process next job if queue is not empty
    if (this.processingQueue.length > 0) {
      setImmediate(() => this.processNextJob());
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(
    job: any,
    progressCallback: (progress: number) => void
  ): Promise<void> {
    const { file } = job;

    switch (job.jobType) {
      case 'VIRUS_SCAN':
        await this.executeVirusScan(file, progressCallback);
        break;

      case 'THUMBNAIL_GENERATION':
        await this.executeThumbnailGeneration(file, progressCallback);
        break;

      case 'DOCUMENT_CONVERSION':
        await this.executeDocumentConversion(file, progressCallback);
        break;

      case 'METADATA_EXTRACTION':
        await this.executeMetadataExtraction(file, progressCallback);
        break;

      case 'TEXT_EXTRACTION':
        await this.executeTextExtraction(file, progressCallback);
        break;

      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
  }

  /**
   * Execute virus scan job
   */
  private async executeVirusScan(file: any, progressCallback: (progress: number) => void): Promise<void> {
    try {
      progressCallback(10);

      // Download file from S3
      const fileBuffer = await s3Service.downloadFile({
        key: file.s3Key,
        tenantId: file.tenantId,
        userId: 'system',
      });

      progressCallback(30);

      // Validate file (includes virus scanning)
      const validationResult = await fileValidationService.validateFile(
        fileBuffer,
        file.originalName,
        file.mimeType,
        { enableVirusScanning: true }
      );

      progressCallback(80);

      // Update file record with scan results
      await prisma.file.update({
        where: { id: file.id },
        data: {
          virusScanned: true,
          scanResult: validationResult.virusScanResult?.isClean ? 'CLEAN' : 'INFECTED',
        },
      });

      progressCallback(100);

      if (validationResult.virusScanResult && !validationResult.virusScanResult.isClean) {
        throw new Error(`Virus detected: ${validationResult.virusScanResult.threat}`);
      }
    } catch (error) {
      await prisma.file.update({
        where: { id: file.id },
        data: {
          virusScanned: true,
          scanResult: 'ERROR',
        },
      });
      throw error;
    }
  }

  /**
   * Execute thumbnail generation job
   */
  private async executeThumbnailGeneration(file: any, progressCallback: (progress: number) => void): Promise<void> {
    try {
      progressCallback(10);

      // Check if file type supports thumbnails
      if (!thumbnailService.canGenerateThumbnail(file.mimeType)) {
        logger.info('File type does not support thumbnail generation', {
          fileId: file.id,
          mimeType: file.mimeType,
        });
        return;
      }

      progressCallback(20);

      // Download file from S3
      const fileBuffer = await s3Service.downloadFile({
        key: file.s3Key,
        tenantId: file.tenantId,
        userId: 'system',
      });

      progressCallback(40);

      // Generate thumbnails
      await thumbnailService.generateThumbnails({
        originalBuffer: fileBuffer,
        originalMimeType: file.mimeType,
        fileId: file.id,
        tenantId: file.tenantId,
        userId: file.uploadedBy,
      });

      progressCallback(100);
    } catch (error) {
      logger.error('Thumbnail generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: file.id,
      });
      throw error;
    }
  }

  /**
   * Execute document conversion job
   */
  private async executeDocumentConversion(file: any, progressCallback: (progress: number) => void): Promise<void> {
    try {
      progressCallback(10);

      // Check if file type supports conversion
      if (!documentConverter.isConversionSupported(file.mimeType)) {
        logger.info('File type does not support conversion', {
          fileId: file.id,
          mimeType: file.mimeType,
        });
        return;
      }

      progressCallback(20);

      // Download file from S3
      const fileBuffer = await s3Service.downloadFile({
        key: file.s3Key,
        tenantId: file.tenantId,
        userId: 'system',
      });

      progressCallback(40);

      // Convert document to markdown
      const conversionResult = await documentConverter.convertToMarkdown(
        fileBuffer,
        file.mimeType,
        {
          preserveFormatting: true,
          includeMetadata: true,
          extractImages: false, // Skip images for now
        }
      );

      progressCallback(70);

      // Upload converted content to S3
      const convertedBuffer = Buffer.from(conversionResult.markdown, 'utf8');
      const s3Result = await s3Service.uploadFile({
        file: convertedBuffer,
        filename: `${file.filename}_converted.md`,
        mimeType: 'text/markdown',
        tenantId: file.tenantId,
        folder: 'conversions',
        userId: file.uploadedBy,
        isPublic: false,
      });

      progressCallback(90);

      // Save conversion record
      await prisma.fileConversion.create({
        data: {
          fileId: file.id,
          fromFormat: file.mimeType,
          toFormat: 'text/markdown',
          status: 'COMPLETED',
          convertedS3Key: s3Result.key,
          convertedUrl: s3Result.url,
          convertedSize: convertedBuffer.length,
          metadata: {
            originalMetadata: conversionResult.metadata,
            warnings: conversionResult.warnings,
          },
        },
      });

      progressCallback(100);
    } catch (error) {
      // Save failed conversion record
      await prisma.fileConversion.create({
        data: {
          fileId: file.id,
          fromFormat: file.mimeType,
          toFormat: 'text/markdown',
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  /**
   * Execute metadata extraction job
   */
  private async executeMetadataExtraction(file: any, progressCallback: (progress: number) => void): Promise<void> {
    try {
      progressCallback(10);

      // Download file from S3
      const fileBuffer = await s3Service.downloadFile({
        key: file.s3Key,
        tenantId: file.tenantId,
        userId: 'system',
      });

      progressCallback(40);

      // Extract metadata based on file type
      let metadata: any = {};

      if (documentConverter.isConversionSupported(file.mimeType)) {
        const conversionResult = await documentConverter.convertToMarkdown(
          fileBuffer,
          file.mimeType,
          { includeMetadata: true }
        );
        metadata = conversionResult.metadata || {};
      }

      progressCallback(80);

      // Update file record with extracted metadata
      await prisma.file.update({
        where: { id: file.id },
        data: {
          metadata: {
            ...file.metadata,
            extracted: metadata,
            extractedAt: new Date().toISOString(),
          },
        },
      });

      progressCallback(100);
    } catch (error) {
      logger.error('Metadata extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: file.id,
      });
      throw error;
    }
  }

  /**
   * Execute text extraction job
   */
  private async executeTextExtraction(file: any, progressCallback: (progress: number) => void): Promise<void> {
    try {
      progressCallback(10);

      // Download file from S3
      const fileBuffer = await s3Service.downloadFile({
        key: file.s3Key,
        tenantId: file.tenantId,
        userId: 'system',
      });

      progressCallback(30);

      let extractedText = '';

      // Extract text based on file type
      if (documentConverter.isConversionSupported(file.mimeType)) {
        const conversionResult = await documentConverter.convertToMarkdown(
          fileBuffer,
          file.mimeType
        );
        extractedText = conversionResult.markdown;
      } else if (file.mimeType.startsWith('text/')) {
        extractedText = fileBuffer.toString('utf8');
      }

      progressCallback(80);

      // Store extracted text (you might want to store this in a separate table or search index)
      await prisma.file.update({
        where: { id: file.id },
        data: {
          metadata: {
            ...file.metadata,
            extractedText: extractedText.substring(0, 10000), // Store first 10k characters
            textExtractedAt: new Date().toISOString(),
            textLength: extractedText.length,
          },
        },
      });

      progressCallback(100);
    } catch (error) {
      logger.error('Text extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileId: file.id,
      });
      throw error;
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    try {
      await prisma.fileProcessingJob.update({
        where: { id: jobId },
        data: { progress: Math.min(100, Math.max(0, progress)) },
      });
    } catch (error) {
      logger.error('Failed to update job progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        progress,
      });
    }
  }

  /**
   * Sort queue by priority
   */
  private sortQueueByPriority(): void {
    // This is a simplified sorting - in production you'd want more sophisticated prioritization
    this.processingQueue.sort((a, b) => {
      // Higher priority jobs first
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      // In a real implementation, you'd fetch the actual job priorities
      return 0; // Placeholder
    });
  }

  /**
   * Determine required jobs for a file type
   */
  private determineRequiredJobs(mimeType: string): Array<'VIRUS_SCAN' | 'THUMBNAIL_GENERATION' | 'DOCUMENT_CONVERSION' | 'METADATA_EXTRACTION' | 'TEXT_EXTRACTION'> {
    const jobs: Array<'VIRUS_SCAN' | 'THUMBNAIL_GENERATION' | 'DOCUMENT_CONVERSION' | 'METADATA_EXTRACTION' | 'TEXT_EXTRACTION'> = [];

    // Always scan for viruses
    if (config.upload.enableVirusScanning) {
      jobs.push('VIRUS_SCAN');
    }

    // Generate thumbnails for supported types
    if (thumbnailService.canGenerateThumbnail(mimeType)) {
      jobs.push('THUMBNAIL_GENERATION');
    }

    // Convert documents to markdown
    if (documentConverter.isConversionSupported(mimeType)) {
      jobs.push('DOCUMENT_CONVERSION');
      jobs.push('METADATA_EXTRACTION');
      jobs.push('TEXT_EXTRACTION');
    }

    return jobs;
  }

  /**
   * Get job priority based on type
   */
  private getJobPriority(jobType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    switch (jobType) {
      case 'VIRUS_SCAN':
        return 'URGENT';
      case 'THUMBNAIL_GENERATION':
        return 'HIGH';
      case 'DOCUMENT_CONVERSION':
        return 'MEDIUM';
      case 'METADATA_EXTRACTION':
        return 'LOW';
      case 'TEXT_EXTRACTION':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    return prisma.fileProcessingJob.findUnique({
      where: { id: jobId },
      include: { file: true },
    });
  }

  /**
   * Get jobs for a file
   */
  async getFileJobs(fileId: string): Promise<any[]> {
    return prisma.fileProcessingJob.findMany({
      where: { fileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const activeJob = this.activeJobs.get(jobId);
    
    if (activeJob && activeJob.cancelFn) {
      activeJob.cancelFn();
    }

    await prisma.fileProcessingJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    // Remove from queue if pending
    const queueIndex = this.processingQueue.indexOf(jobId);
    if (queueIndex > -1) {
      this.processingQueue.splice(queueIndex, 1);
    }
  }

  /**
   * Schedule cleanup jobs
   */
  private scheduleCleanupJobs(): void {
    // Clean up old completed/failed jobs daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running job cleanup');
        
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 7); // Keep jobs for 7 days

        const deletedJobs = await prisma.fileProcessingJob.deleteMany({
          where: {
            AND: [
              {
                OR: [
                  { status: 'COMPLETED' },
                  { status: 'FAILED' },
                  { status: 'CANCELLED' },
                ],
              },
              { createdAt: { lt: oldDate } },
            ],
          },
        });

        logger.info('Job cleanup completed', { deletedCount: deletedJobs.count });
      } catch (error) {
        logger.error('Job cleanup failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.processingQueue.length,
      activeJobs: this.activeJobs.size,
      maxConcurrency: config.processing.concurrency,
      isProcessing: this.isProcessing,
    };
  }
}

export const fileProcessingService = new FileProcessingService();