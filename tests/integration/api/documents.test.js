import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../backend/src/server';
import { createTestUser, createTestDocument, createTestJWT, expectSuccessResponse, expectErrorResponse } from '../../../backend/src/test/test-utils';

describe('Documents API Integration', () => {
  let authToken;
  let testUser;
  let testDocument;

  beforeAll(async () => {
    // Setup test user and authentication
    testUser = createTestUser();
    authToken = createTestJWT({ userId: testUser.id, email: testUser.email });
    testDocument = createTestDocument({ authorId: testUser.id });
  });

  beforeEach(async () => {
    // Reset any test data between tests
    if (global.resetTestData) {
      await global.resetTestData();
    }
  });

  describe('GET /api/documents', () => {
    it('returns list of documents for authenticated user', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('supports pagination parameters', async () => {
      const response = await request(app)
        .get('/api/documents')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('supports filtering by tags', async () => {
      const response = await request(app)
        .get('/api/documents')
        .query({ tags: 'test,mock' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.filters.tags).toEqual(['test', 'mock']);
    });

    it('supports search functionality', async () => {
      const response = await request(app)
        .get('/api/documents')
        .query({ search: 'test document' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.filters.search).toBe('test document');
    });

    it('requires authentication', async () => {
      const response = await request(app)
        .get('/api/documents')
        .expect(401);

      expectErrorResponse(response, 401, 'Unauthorized');
    });
  });

  describe('POST /api/documents', () => {
    const newDocument = {
      title: 'New Test Document',
      content: '# New Document\n\nThis is a new test document.',
      tags: ['new', 'test'],
      category: 'testing',
      isPublic: false,
    };

    it('creates new document with valid data', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDocument)
        .expect(201);

      expectSuccessResponse(response);
      expect(response.body.data.title).toBe(newDocument.title);
      expect(response.body.data.authorId).toBe(testUser.id);
      expect(response.body.data.id).toBeDefined();
    });

    it('validates required fields', async () => {
      const invalidDocument = { title: '' }; // Missing required fields

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDocument)
        .expect(400);

      expectErrorResponse(response, 400);
      expect(response.body.errors).toBeDefined();
    });

    it('sanitizes HTML content', async () => {
      const documentWithHtml = {
        ...newDocument,
        content: '<script>alert("xss")</script># Safe Content',
      };

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentWithHtml)
        .expect(201);

      // Should strip script tags but keep markdown
      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).toContain('# Safe Content');
    });

    it('generates automatic tags if not provided', async () => {
      const documentWithoutTags = {
        ...newDocument,
        tags: undefined,
      };

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(documentWithoutTags)
        .expect(201);

      expect(response.body.data.tags).toBeInstanceOf(Array);
      expect(response.body.data.tags.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('returns specific document by ID', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);
      expect(response.body.data.id).toBe(testDocument.id);
      expect(response.body.data.title).toBe(testDocument.title);
    });

    it('increments view count on access', async () => {
      // First request
      const response1 = await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialViewCount = response1.body.data.viewCount;

      // Second request
      const response2 = await request(app)
        .get(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body.data.viewCount).toBe(initialViewCount + 1);
    });

    it('returns 404 for non-existent document', async () => {
      const response = await request(app)
        .get('/api/documents/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expectErrorResponse(response, 404, 'Document not found');
    });

    it('enforces privacy settings for non-public documents', async () => {
      const privateDocument = createTestDocument({ 
        isPublic: false, 
        authorId: 'different-user-id' 
      });

      const response = await request(app)
        .get(`/api/documents/${privateDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('PUT /api/documents/:id', () => {
    const updateData = {
      title: 'Updated Test Document',
      content: '# Updated Content\n\nThis document has been updated.',
      tags: ['updated', 'test'],
    };

    it('updates document with valid data', async () => {
      const response = await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expectSuccessResponse(response);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.version).toBe(testDocument.version + 1);
    });

    it('maintains version history', async () => {
      const response = await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Check version history endpoint
      const historyResponse = await request(app)
        .get(`/api/documents/${testDocument.id}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.data.length).toBeGreaterThan(1);
    });

    it('only allows author to update document', async () => {
      const otherUserToken = createTestJWT({ userId: 'other-user-id' });

      const response = await request(app)
        .put(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(updateData)
        .expect(403);

      expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('soft deletes document', async () => {
      const documentToDelete = createTestDocument({ authorId: testUser.id });

      const response = await request(app)
        .delete(`/api/documents/${documentToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expectSuccessResponse(response);

      // Verify document is no longer accessible
      await request(app)
        .get(`/api/documents/${documentToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('only allows author to delete document', async () => {
      const otherUserToken = createTestJWT({ userId: 'other-user-id' });

      const response = await request(app)
        .delete(`/api/documents/${testDocument.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expectErrorResponse(response, 403, 'Access denied');
    });
  });

  describe('Performance Tests', () => {
    it('handles bulk document creation efficiently', async () => {
      const documents = Array(10).fill(null).map((_, index) => ({
        title: `Bulk Document ${index}`,
        content: `# Document ${index}\n\nContent for document ${index}`,
        tags: ['bulk', 'test'],
        category: 'testing',
      }));

      const startTime = Date.now();

      const promises = documents.map(doc =>
        request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send(doc)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within reasonable time (2 seconds for 10 documents)
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('handles pagination efficiently with large datasets', async () => {
      const response = await request(app)
        .get('/api/documents')
        .query({ page: 1, limit: 100 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return within reasonable time even with large limit
      expect(response.body.data.length).toBeLessThanOrEqual(100);
    });
  });
});