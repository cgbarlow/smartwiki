export const mockDocuments = {
  basic: {
    id: 'doc-basic',
    title: 'Basic Document',
    content: 'This is a basic test document with some content.',
    type: 'text/markdown',
    userId: 'user-regular',
    tenantId: 'tenant-1',
    tags: ['test', 'basic'],
    metadata: {
      wordCount: 10,
      readTime: 1
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  
  compliance: {
    id: 'doc-compliance',
    title: 'GDPR Compliance Guide',
    content: `# GDPR Compliance Guide

## Article 6 - Lawfulness of processing

Processing shall be lawful only if and to the extent that at least one of the following applies:

(a) the data subject has given consent to the processing of his or her personal data for one or more specific purposes;

(b) processing is necessary for the performance of a contract to which the data subject is party or in order to take steps at the request of the data subject prior to entering into a contract;

## Article 7 - Conditions for consent

Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data.`,
    type: 'text/markdown',
    userId: 'user-admin',
    tenantId: 'tenant-1',
    tags: ['compliance', 'gdpr', 'privacy'],
    metadata: {
      wordCount: 89,
      readTime: 5,
      complianceStandard: 'GDPR'
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  
  large: {
    id: 'doc-large',
    title: 'Large Document for Testing',
    content: Array(1000).fill('This is a test sentence. ').join(''),
    type: 'text/markdown',
    userId: 'user-regular',
    tenantId: 'tenant-1',
    tags: ['test', 'large', 'performance'],
    metadata: {
      wordCount: 5000,
      readTime: 20
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
}

export const createMockDocument = (overrides = {}) => {
  return {
    id: `doc-${Date.now()}`,
    title: 'Test Document',
    content: 'This is test content for the document.',
    type: 'text/markdown',
    userId: 'user-regular',
    tenantId: 'tenant-1',
    tags: [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}

export const createMockFile = (overrides = {}) => {
  return {
    id: `file-${Date.now()}`,
    originalName: 'test-document.pdf',
    fileName: `${Date.now()}-test-document.pdf`,
    mimeType: 'application/pdf',
    size: 1024000,
    url: 'https://example.com/files/test-document.pdf',
    thumbnailUrl: 'https://example.com/files/thumbnails/test-document.jpg',
    userId: 'user-regular',
    tenantId: 'tenant-1',
    createdAt: new Date().toISOString(),
    ...overrides
  }
}