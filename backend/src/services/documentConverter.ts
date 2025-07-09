import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { convert } from 'html-to-text';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ConversionOptions {
  preserveFormatting?: boolean;
  extractImages?: boolean;
  includeMetadata?: boolean;
  markdownOptions?: {
    headingStyle?: 'atx' | 'setext';
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
  };
}

export interface ConversionResult {
  markdown: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    pages?: number;
    wordCount?: number;
    characterCount?: number;
  };
  images?: Array<{
    id: string;
    buffer: Buffer;
    contentType: string;
    width?: number;
    height?: number;
  }>;
  warnings?: string[];
}

export class DocumentConverter {
  /**
   * Convert PDF to Markdown
   */
  async convertPdfToMarkdown(pdfBuffer: Buffer, options: ConversionOptions = {}): Promise<ConversionResult> {
    try {
      logger.info('Converting PDF to Markdown', { 
        size: pdfBuffer.length,
        preserveFormatting: options.preserveFormatting 
      });

      const pdfData = await pdfParse(pdfBuffer);
      
      // Extract text content
      let text = pdfData.text;
      
      // Basic markdown conversion
      let markdown = this.convertTextToMarkdown(text, options);
      
      // Extract metadata
      const metadata = {
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        subject: pdfData.info?.Subject,
        creator: pdfData.info?.Creator,
        producer: pdfData.info?.Producer,
        creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
        modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
        pages: pdfData.numpages,
        wordCount: this.countWords(text),
        characterCount: text.length,
      };

      logger.info('PDF converted to Markdown successfully', {
        pages: metadata.pages,
        wordCount: metadata.wordCount,
        characterCount: metadata.characterCount,
      });

      return {
        markdown,
        metadata: options.includeMetadata ? metadata : undefined,
        warnings: [],
      };
    } catch (error) {
      logger.error('Failed to convert PDF to Markdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: pdfBuffer.length,
      });
      throw new Error(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert DOCX to Markdown
   */
  async convertDocxToMarkdown(docxBuffer: Buffer, options: ConversionOptions = {}): Promise<ConversionResult> {
    try {
      logger.info('Converting DOCX to Markdown', { 
        size: docxBuffer.length,
        preserveFormatting: options.preserveFormatting 
      });

      const mammothOptions = {
        convertImage: options.extractImages ? mammoth.images.imgElement((image: any) => {
          // Store image for later extraction
          return image.read('base64').then((imageBuffer: string) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
              alt: image.altText || '',
            };
          });
        }) : undefined,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => h2:fresh",
          "b => strong",
          "i => em",
          "u => u",
          "strike => del",
          "p[style-name='Quote'] => blockquote",
          "p[style-name='Code'] => pre",
        ],
      };

      const result = await mammoth.convertToHtml(docxBuffer, mammothOptions);
      
      // Convert HTML to Markdown
      const markdown = this.convertHtmlToMarkdown(result.value, options);
      
      // Extract images if requested
      const images: Array<{
        id: string;
        buffer: Buffer;
        contentType: string;
        width?: number;
        height?: number;
      }> = [];

      if (options.extractImages) {
        // Extract images from DOCX
        const imageResults = await mammoth.extractRawText(docxBuffer);
        // This is a simplified approach - in production, you'd need more sophisticated image extraction
      }

      // Extract text for metadata
      const plainText = convert(result.value, {
        wordwrap: false,
        selectors: [
          { selector: 'img', format: 'skip' },
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        ],
      });

      const metadata = {
        wordCount: this.countWords(plainText),
        characterCount: plainText.length,
      };

      logger.info('DOCX converted to Markdown successfully', {
        warnings: result.messages.length,
        wordCount: metadata.wordCount,
        characterCount: metadata.characterCount,
      });

      return {
        markdown,
        metadata: options.includeMetadata ? metadata : undefined,
        images: options.extractImages ? images : undefined,
        warnings: result.messages.map((msg: any) => msg.message),
      };
    } catch (error) {
      logger.error('Failed to convert DOCX to Markdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: docxBuffer.length,
      });
      throw new Error(`DOCX conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert HTML to Markdown
   */
  convertHtmlToMarkdown(html: string, options: ConversionOptions = {}): string {
    try {
      // Use html-to-text for basic conversion, then enhance for markdown
      const plainText = convert(html, {
        wordwrap: false,
        selectors: [
          { selector: 'h1', format: 'block', options: { uppercase: false } },
          { selector: 'h2', format: 'block', options: { uppercase: false } },
          { selector: 'h3', format: 'block', options: { uppercase: false } },
          { selector: 'h4', format: 'block', options: { uppercase: false } },
          { selector: 'h5', format: 'block', options: { uppercase: false } },
          { selector: 'h6', format: 'block', options: { uppercase: false } },
          { selector: 'p', format: 'block' },
          { selector: 'br', format: 'block' },
          { selector: 'blockquote', format: 'block' },
          { selector: 'strong', format: 'inline' },
          { selector: 'b', format: 'inline' },
          { selector: 'em', format: 'inline' },
          { selector: 'i', format: 'inline' },
          { selector: 'code', format: 'inline' },
          { selector: 'pre', format: 'block' },
          { selector: 'ul', format: 'block' },
          { selector: 'ol', format: 'block' },
          { selector: 'li', format: 'block' },
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
          { selector: 'img', format: 'skip' },
        ],
      });

      return this.enhanceMarkdownFormatting(plainText, options);
    } catch (error) {
      logger.error('Failed to convert HTML to Markdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        htmlLength: html.length,
      });
      throw new Error(`HTML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert plain text to Markdown with basic formatting
   */
  private convertTextToMarkdown(text: string, options: ConversionOptions = {}): string {
    let markdown = text;

    // Clean up text
    markdown = markdown.replace(/\r\n/g, '\n'); // Normalize line endings
    markdown = markdown.replace(/\r/g, '\n'); // Handle old Mac line endings
    
    // Remove excessive whitespace
    markdown = markdown.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
    markdown = markdown.replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double newlines

    // Try to detect headings (lines in ALL CAPS followed by content)
    markdown = markdown.replace(/^([A-Z][A-Z\s]{3,})\n(?=\w)/gm, '# $1\n');
    
    // Try to detect bullet points
    markdown = markdown.replace(/^[-•*]\s+(.+)/gm, '- $1');
    
    // Try to detect numbered lists
    markdown = markdown.replace(/^(\d+)[.)]\s+(.+)/gm, '$1. $2');

    // Add spacing around detected structures
    markdown = markdown.replace(/^(#+\s.+)$/gm, '\n$1\n');
    
    return markdown.trim();
  }

  /**
   * Enhance markdown formatting
   */
  private enhanceMarkdownFormatting(text: string, options: ConversionOptions = {}): string {
    const markdownOptions = options.markdownOptions || {};
    let enhanced = text;

    // Apply heading style preference
    if (markdownOptions.headingStyle === 'setext') {
      enhanced = enhanced.replace(/^# (.+)$/gm, '$1\n='.repeat(50));
      enhanced = enhanced.replace(/^## (.+)$/gm, '$1\n-'.repeat(30));
    }

    // Apply bullet list marker preference
    if (markdownOptions.bulletListMarker && markdownOptions.bulletListMarker !== '-') {
      enhanced = enhanced.replace(/^- /gm, `${markdownOptions.bulletListMarker} `);
    }

    // Apply code block style preference
    if (markdownOptions.codeBlockStyle === 'fenced') {
      enhanced = enhanced.replace(/^    (.+)$/gm, '```\n$1\n```');
    }

    return enhanced;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Convert RTF to Markdown (basic implementation)
   */
  async convertRtfToMarkdown(rtfBuffer: Buffer, options: ConversionOptions = {}): Promise<ConversionResult> {
    try {
      logger.info('Converting RTF to Markdown', { size: rtfBuffer.length });

      // Basic RTF to plain text conversion
      const rtfText = rtfBuffer.toString('utf8');
      
      // Remove RTF control codes (very basic implementation)
      let plainText = rtfText.replace(/\{\\[^}]*\}/g, ''); // Remove RTF control groups
      plainText = plainText.replace(/\\[a-z]+\d*\s?/g, ''); // Remove RTF control words
      plainText = plainText.replace(/[{}]/g, ''); // Remove remaining braces
      
      const markdown = this.convertTextToMarkdown(plainText, options);
      
      const metadata = {
        wordCount: this.countWords(plainText),
        characterCount: plainText.length,
      };

      logger.info('RTF converted to Markdown successfully', {
        wordCount: metadata.wordCount,
        characterCount: metadata.characterCount,
      });

      return {
        markdown,
        metadata: options.includeMetadata ? metadata : undefined,
        warnings: ['RTF conversion is basic and may not preserve all formatting'],
      };
    } catch (error) {
      logger.error('Failed to convert RTF to Markdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: rtfBuffer.length,
      });
      throw new Error(`RTF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert based on file type
   */
  async convertToMarkdown(
    fileBuffer: Buffer,
    mimeType: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    try {
      logger.info('Converting file to Markdown', { 
        mimeType,
        size: fileBuffer.length,
        options 
      });

      switch (mimeType) {
        case 'application/pdf':
          return await this.convertPdfToMarkdown(fileBuffer, options);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.convertDocxToMarkdown(fileBuffer, options);
        
        case 'application/msword':
          // For .doc files, we'd need a different library like antiword or libreoffice
          throw new Error('DOC file conversion not implemented - please convert to DOCX first');
        
        case 'application/rtf':
        case 'text/rtf':
          return await this.convertRtfToMarkdown(fileBuffer, options);
        
        case 'text/html':
          const html = fileBuffer.toString('utf8');
          const markdown = this.convertHtmlToMarkdown(html, options);
          return {
            markdown,
            metadata: options.includeMetadata ? {
              characterCount: html.length,
              wordCount: this.countWords(markdown),
            } : undefined,
          };
        
        case 'text/plain':
        case 'text/markdown':
          const text = fileBuffer.toString('utf8');
          const convertedMarkdown = mimeType === 'text/plain' 
            ? this.convertTextToMarkdown(text, options)
            : text;
          return {
            markdown: convertedMarkdown,
            metadata: options.includeMetadata ? {
              characterCount: text.length,
              wordCount: this.countWords(text),
            } : undefined,
          };
        
        default:
          throw new Error(`Unsupported file type for conversion: ${mimeType}`);
      }
    } catch (error) {
      logger.error('File conversion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mimeType,
        bufferSize: fileBuffer.length,
      });
      throw error;
    }
  }

  /**
   * Get supported conversion types
   */
  getSupportedConversions(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/rtf',
      'text/rtf',
      'text/html',
      'text/plain',
      'text/markdown',
    ];
  }

  /**
   * Check if file type is supported for conversion
   */
  isConversionSupported(mimeType: string): boolean {
    return this.getSupportedConversions().includes(mimeType);
  }
}

export const documentConverter = new DocumentConverter();