import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth handlers
  http.post('/api/auth/signin', () => {
    return HttpResponse.json({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      },
      token: 'mock-jwt-token'
    })
  }),

  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1'
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }),

  // Document API handlers
  http.get('/api/documents', () => {
    return HttpResponse.json({
      documents: [
        {
          id: 'doc-1',
          title: 'Test Document 1',
          content: 'Test content 1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          createdAt: new Date().toISOString()
        },
        {
          id: 'doc-2', 
          title: 'Test Document 2',
          content: 'Test content 2',
          userId: 'user-1',
          tenantId: 'tenant-1',
          createdAt: new Date().toISOString()
        }
      ],
      total: 2
    })
  }),

  http.post('/api/documents', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: 'doc-new',
      title: body.title,
      content: body.content,
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('/api/documents/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: `Test Document ${params.id}`,
      content: `Test content for document ${params.id}`,
      userId: 'user-1',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString()
    })
  }),

  http.put('/api/documents/:id', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: params.id,
      title: body.title,
      content: body.content,
      userId: 'user-1',
      tenantId: 'tenant-1',
      updatedAt: new Date().toISOString()
    })
  }),

  http.delete('/api/documents/:id', ({ params }) => {
    return HttpResponse.json({ success: true })
  }),

  // File upload handlers
  http.post('/api/files/upload', () => {
    return HttpResponse.json({
      fileId: 'file-123',
      url: 'https://example.com/file-123.pdf',
      originalName: 'test-document.pdf',
      size: 1024000,
      type: 'application/pdf'
    }, { status: 201 })
  }),

  // RAG/Search handlers
  http.post('/api/search', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      results: [
        {
          id: 'result-1',
          title: 'Relevant Document 1',
          excerpt: 'This document contains information relevant to your query...',
          score: 0.95,
          documentId: 'doc-1'
        },
        {
          id: 'result-2',
          title: 'Relevant Document 2', 
          excerpt: 'Another relevant excerpt matching your search...',
          score: 0.87,
          documentId: 'doc-2'
        }
      ],
      query: body.query,
      totalResults: 2
    })
  }),

  // Agent/Compliance handlers
  http.post('/api/agents/compliance/analyze', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      analysisId: 'analysis-123',
      status: 'completed',
      results: {
        complianceScore: 85,
        violations: [
          {
            section: 'Section 4.2',
            severity: 'medium',
            description: 'Missing required documentation'
          }
        ],
        recommendations: [
          'Add required compliance documentation',
          'Review security protocols'
        ]
      }
    })
  }),

  // AWS Bedrock mock handlers
  http.post('https://bedrock.us-east-1.amazonaws.com/*', () => {
    return HttpResponse.json({
      body: JSON.stringify({
        completion: 'This is a mocked AI response from Bedrock.',
        stop_reason: 'end_turn'
      })
    })
  }),

  // Error handlers for testing error scenarios
  http.get('/api/error/500', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }),

  http.get('/api/error/404', () => {
    return HttpResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    )
  }),

  http.get('/api/error/unauthorized', () => {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  })
]