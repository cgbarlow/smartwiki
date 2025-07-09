import { fileTypeFromBuffer } from 'file-type';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config/config';

// Dynamic import for ClamScan since it might not be available in all environments
let NodeClam: any = null;
try {
  NodeClam = require('clamscan');
} catch (error) {
  logger.warn('ClamScan not available - virus scanning disabled');
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    detectedMimeType: string;
    detectedExtension: string;
    size: number;
    checksum: string;
  };
  virusScanResult?: {
    isClean: boolean;
    threat?: string;
    scanEngine?: string;
  };
}

export interface ValidationOptions {
  allowedTypes?: string[];
  maxFileSize?: number;
  enableVirusScanning?: boolean;
  strictTypeChecking?: boolean;
  allowExecutables?: boolean;
}

export class FileValidationService {
  private clamScan: any = null;

  constructor() {
    this.initializeVirusScanner();
  }

  /**
   * Initialize virus scanner
   */
  private async initializeVirusScanner(): Promise<void> {
    if (!NodeClam || !config.upload.enableVirusScanning) {
      logger.info('Virus scanning disabled');
      return;
    }

    try {
      this.clamScan = await new NodeClam().init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: null,
        debugMode: config.isDevelopment,
        clamdscan: {
          host: config.upload.clamavHost,
          port: config.upload.clamavPort,
          timeout: 60000,
          localFallback: true,
        },
        preference: 'clamdscan',
      });

      logger.info('Virus scanner initialized successfully', {
        host: config.upload.clamavHost,
        port: config.upload.clamavPort,
      });
    } catch (error) {
      logger.error('Failed to initialize virus scanner', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate uploaded file
   */
  async validateFile(
    fileBuffer: Buffer,
    originalName: string,
    declaredMimeType: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      logger.info('Validating file', {
        originalName,
        declaredMimeType,
        size: fileBuffer.length,
      });

      // Generate file checksum
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Detect actual file type
      const detectedType = await fileTypeFromBuffer(fileBuffer);
      const detectedMimeType = detectedType?.mime || 'application/octet-stream';
      const detectedExtension = detectedType?.ext || '';

      // Basic size validation
      const maxFileSize = options.maxFileSize || config.upload.maxFileSize;
      if (fileBuffer.length > maxFileSize) {
        errors.push(`File size ${fileBuffer.length} bytes exceeds maximum allowed size of ${maxFileSize} bytes`);
      }

      if (fileBuffer.length === 0) {
        errors.push('File is empty');
      }

      // File type validation
      const allowedTypes = options.allowedTypes || config.upload.allowedTypes;
      await this.validateFileType(
        detectedMimeType,
        declaredMimeType,
        originalName,
        allowedTypes,
        options,
        errors,
        warnings
      );

      // Security validations
      this.validateSecurity(fileBuffer, detectedMimeType, originalName, options, errors, warnings);

      // Virus scanning
      let virusScanResult;
      if (options.enableVirusScanning && config.upload.enableVirusScanning) {
        virusScanResult = await this.scanForViruses(fileBuffer);
        
        if (virusScanResult && !virusScanResult.isClean) {
          errors.push(`File contains malware: ${virusScanResult.threat}`);
        }
      }

      const isValid = errors.length === 0;

      logger.info('File validation completed', {
        originalName,
        isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        detectedMimeType,
        checksum,
      });

      return {
        isValid,
        errors,
        warnings,
        fileInfo: {
          detectedMimeType,
          detectedExtension,
          size: fileBuffer.length,
          checksum,
        },
        virusScanResult,
      };
    } catch (error) {
      logger.error('File validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalName,
        declaredMimeType,
      });

      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        fileInfo: {
          detectedMimeType: 'unknown',
          detectedExtension: '',
          size: fileBuffer.length,
          checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
        },
      };
    }
  }

  /**
   * Validate file type
   */
  private async validateFileType(
    detectedMimeType: string,
    declaredMimeType: string,
    originalName: string,
    allowedTypes: string[],
    options: ValidationOptions,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check if detected type is in allowed types
    const isDetectedTypeAllowed = allowedTypes.some(type => 
      detectedMimeType.includes(type) || type === '*'
    );

    if (!isDetectedTypeAllowed) {
      errors.push(`File type ${detectedMimeType} is not allowed`);
    }

    // Strict type checking
    if (options.strictTypeChecking) {
      if (detectedMimeType !== declaredMimeType) {
        const warning = `Declared MIME type (${declaredMimeType}) does not match detected type (${detectedMimeType})`;
        
        // If types are significantly different, treat as error
        if (this.areTypesSimilar(detectedMimeType, declaredMimeType)) {
          warnings.push(warning);
        } else {
          errors.push(warning);
        }
      }

      // Check file extension matches content
      const expectedExtensions = this.getExpectedExtensions(detectedMimeType);
      const actualExtension = originalName.split('.').pop()?.toLowerCase() || '';
      
      if (expectedExtensions.length > 0 && !expectedExtensions.includes(actualExtension)) {
        warnings.push(`File extension .${actualExtension} may not match content type ${detectedMimeType}`);
      }
    }
  }

  /**
   * Validate security aspects
   */
  private validateSecurity(
    fileBuffer: Buffer,
    detectedMimeType: string,
    originalName: string,
    options: ValidationOptions,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for executable files
    if (!options.allowExecutables) {
      const executableTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program',
        'application/vnd.microsoft.portable-executable',
        'application/x-sh',
        'application/x-bat',
        'text/x-shellscript',
      ];

      if (executableTypes.includes(detectedMimeType)) {
        errors.push('Executable files are not allowed');
      }

      // Check file extension for executables
      const executableExtensions = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'scr', 'com', 'pif'];
      const extension = originalName.split('.').pop()?.toLowerCase() || '';
      
      if (executableExtensions.includes(extension)) {
        errors.push(`Files with extension .${extension} are not allowed`);
      }
    }

    // Check for suspicious patterns in filename
    this.validateFilename(originalName, errors, warnings);

    // Check for zip bombs (basic check)
    if (detectedMimeType.includes('zip') || detectedMimeType.includes('compressed')) {
      this.checkForZipBomb(fileBuffer, errors, warnings);
    }

    // Check for suspicious binary patterns
    this.checkSuspiciousBinaryPatterns(fileBuffer, detectedMimeType, warnings);
  }

  /**
   * Validate filename for security issues
   */
  private validateFilename(filename: string, errors: string[], warnings: string[]): void {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.push('Filename contains invalid path characters');
    }

    // Check for hidden files
    if (filename.startsWith('.')) {
      warnings.push('Hidden files may not be processed correctly');
    }

    // Check for very long filenames
    if (filename.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)');
    }

    // Check for suspicious extensions
    const suspiciousExtensions = ['scr', 'pif', 'com', 'bat', 'cmd', 'vbs', 'js'];
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    if (suspiciousExtensions.includes(extension)) {
      warnings.push(`File extension .${extension} may be potentially dangerous`);
    }

    // Check for double extensions
    const parts = filename.split('.');
    if (parts.length > 3) {
      warnings.push('File has multiple extensions which may be suspicious');
    }
  }

  /**
   * Basic zip bomb detection
   */
  private checkForZipBomb(fileBuffer: Buffer, errors: string[], warnings: string[]): void {
    // This is a very basic check - in production, you'd want more sophisticated detection
    const maxCompressionRatio = 100; // 100:1 ratio seems suspicious
    
    // For now, just check if the file claims to be very small but is actually large when uncompressed
    // This would require actually decompressing the file, which is complex
    // Instead, we'll do a simple heuristic check
    
    if (fileBuffer.length < 1000 && fileBuffer.length > 0) {
      // Very small compressed files might be suspicious
      warnings.push('Very small compressed file detected - potential zip bomb');
    }
  }

  /**
   * Check for suspicious binary patterns
   */
  private checkSuspiciousBinaryPatterns(
    fileBuffer: Buffer,
    detectedMimeType: string,
    warnings: string[]
  ): void {
    // Check for executable signatures in non-executable files
    if (!detectedMimeType.includes('executable') && !detectedMimeType.includes('application')) {
      const executableSignatures = [
        Buffer.from([0x4D, 0x5A]), // MZ (Windows PE)
        Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF
        Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O
        Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O 64-bit
      ];

      for (const signature of executableSignatures) {
        if (fileBuffer.subarray(0, signature.length).equals(signature)) {
          warnings.push('File appears to contain executable code');
          break;
        }
      }
    }

    // Check for script injection in text files
    if (detectedMimeType.startsWith('text/') || detectedMimeType.includes('html')) {
      const content = fileBuffer.toString('utf8').toLowerCase();
      const suspiciousPatterns = [
        '<script',
        'javascript:',
        'vbscript:',
        'onload=',
        'onerror=',
        'eval(',
        'document.cookie',
      ];

      for (const pattern of suspiciousPatterns) {
        if (content.includes(pattern)) {
          warnings.push('File contains potentially suspicious script content');
          break;
        }
      }
    }
  }

  /**
   * Scan file for viruses
   */
  private async scanForViruses(fileBuffer: Buffer): Promise<{ isClean: boolean; threat?: string; scanEngine?: string } | null> {
    if (!this.clamScan) {
      logger.debug('Virus scanner not available');
      return null;
    }

    try {
      logger.info('Scanning file for viruses', { size: fileBuffer.length });

      const scanResult = await this.clamScan.scanBuffer(fileBuffer);
      
      const isClean = scanResult.isInfected === false;
      
      logger.info('Virus scan completed', {
        isClean,
        threat: scanResult.viruses?.join(', '),
        scanEngine: 'ClamAV',
      });

      return {
        isClean,
        threat: scanResult.viruses?.join(', '),
        scanEngine: 'ClamAV',
      };
    } catch (error) {
      logger.error('Virus scanning failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return null to indicate scan couldn't be performed, but don't fail validation
      return null;
    }
  }

  /**
   * Check if two MIME types are similar
   */
  private areTypesSimilar(type1: string, type2: string): boolean {
    // Extract base types
    const base1 = type1.split('/')[0];
    const base2 = type2.split('/')[0];
    
    return base1 === base2;
  }

  /**
   * Get expected file extensions for a MIME type
   */
  private getExpectedExtensions(mimeType: string): string[] {
    const mimeToExtensions: { [key: string]: string[] } = {
      'application/pdf': ['pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
      'application/msword': ['doc'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.ms-powerpoint': ['ppt'],
      'text/plain': ['txt', 'text'],
      'text/markdown': ['md', 'markdown'],
      'text/html': ['html', 'htm'],
      'text/css': ['css'],
      'text/javascript': ['js'],
      'application/json': ['json'],
      'application/xml': ['xml'],
      'text/xml': ['xml'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/svg+xml': ['svg'],
      'image/webp': ['webp'],
      'image/bmp': ['bmp'],
      'image/tiff': ['tiff', 'tif'],
      'audio/mpeg': ['mp3'],
      'audio/wav': ['wav'],
      'video/mp4': ['mp4'],
      'video/webm': ['webm'],
      'application/zip': ['zip'],
      'application/x-rar-compressed': ['rar'],
      'application/x-7z-compressed': ['7z'],
    };

    return mimeToExtensions[mimeType] || [];
  }

  /**
   * Get file type information from buffer
   */
  async getFileTypeInfo(buffer: Buffer): Promise<{
    mimeType: string;
    extension: string;
    isSupported: boolean;
  }> {
    try {
      const detectedType = await fileTypeFromBuffer(buffer);
      const mimeType = detectedType?.mime || 'application/octet-stream';
      const extension = detectedType?.ext || '';
      
      const isSupported = config.upload.allowedTypes.some(type => 
        mimeType.includes(type) || type === '*'
      );

      return {
        mimeType,
        extension,
        isSupported,
      };
    } catch (error) {
      logger.error('Failed to detect file type', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        mimeType: 'application/octet-stream',
        extension: '',
        isSupported: false,
      };
    }
  }

  /**
   * Validate file before upload
   */
  async validateBeforeUpload(
    file: Express.Multer.File,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    return this.validateFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        enableVirusScanning: true,
        strictTypeChecking: true,
        allowExecutables: false,
        ...options,
      }
    );
  }
}

export const fileValidationService = new FileValidationService();