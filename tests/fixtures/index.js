export * from './users.js'
export * from './documents.js'
export * from './tenants.js'

// AWS Mock responses
export const mockAwsResponses = {
  bedrock: {
    invokeModel: {
      body: JSON.stringify({
        completion: 'This is a mock response from AWS Bedrock.',
        stop_reason: 'end_turn'
      })
    },
    
    createKnowledgeBase: {
      knowledgeBaseId: 'kb-mock-123',
      name: 'Test Knowledge Base',
      status: 'CREATING'
    },
    
    retrieveAndGenerate: {
      output: {
        text: 'Generated response based on retrieved knowledge.'
      },
      retrievalResults: [
        {
          content: {
            text: 'Retrieved content chunk 1'
          },
          score: 0.95
        },
        {
          content: {
            text: 'Retrieved content chunk 2'
          },
          score: 0.87
        }
      ]
    }
  },
  
  s3: {
    putObject: {
      ETag: '"mock-etag-123"',
      Location: 'https://mock-bucket.s3.amazonaws.com/mock-key'
    },
    
    getObject: {
      Body: Buffer.from('Mock file content'),
      ContentType: 'application/pdf',
      ContentLength: 1024
    },
    
    deleteObject: {
      DeleteMarker: false
    }
  },
  
  opensearch: {
    search: {
      hits: {
        total: {
          value: 2,
          relation: 'eq'
        },
        hits: [
          {
            _id: 'doc-1',
            _score: 0.95,
            _source: {
              title: 'Test Document 1',
              content: 'This is test content for document 1',
              metadata: {
                userId: 'user-1',
                tenantId: 'tenant-1'
              }
            }
          },
          {
            _id: 'doc-2',
            _score: 0.87,
            _source: {
              title: 'Test Document 2',
              content: 'This is test content for document 2',
              metadata: {
                userId: 'user-1',
                tenantId: 'tenant-1'
              }
            }
          }
        ]
      }
    }
  }
}

// Compliance test data
export const mockComplianceData = {
  gdprDocuments: [
    {
      id: 'gdpr-1',
      title: 'GDPR Article 6 - Lawfulness of processing',
      content: 'Processing shall be lawful only if and to the extent that at least one of the following applies...',
      standard: 'GDPR',
      article: '6'
    },
    {
      id: 'gdpr-2',
      title: 'GDPR Article 7 - Conditions for consent',
      content: 'Where processing is based on consent, the controller shall be able to demonstrate...',
      standard: 'GDPR',
      article: '7'
    }
  ],
  
  sox404Documents: [
    {
      id: 'sox-1',
      title: 'SOX Section 404 - Management Assessment',
      content: 'The Commission shall prescribe rules requiring each annual report...',
      standard: 'SOX',
      section: '404'
    }
  ],
  
  complianceReport: {
    id: 'report-1',
    documentId: 'user-doc-1',
    standards: ['GDPR', 'SOX'],
    results: {
      overall: {
        score: 85,
        status: 'partial_compliance'
      },
      byStandard: {
        GDPR: {
          score: 90,
          violations: [
            {
              article: '6',
              severity: 'medium',
              description: 'Missing explicit consent mechanism'
            }
          ],
          recommendations: [
            'Implement clear consent collection process',
            'Add consent withdrawal mechanism'
          ]
        },
        SOX: {
          score: 80,
          violations: [
            {
              section: '404',
              severity: 'high',
              description: 'Insufficient internal controls documentation'
            }
          ],
          recommendations: [
            'Document internal control procedures',
            'Establish management assessment process'
          ]
        }
      }
    },
    generatedAt: new Date().toISOString()
  }
}