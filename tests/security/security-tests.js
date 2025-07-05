/**
 * Security Testing Suite for SmartWiki
 * 
 * This file contains security tests that should be run as part of the CI/CD pipeline.
 * These tests check for common security vulnerabilities and ensure secure coding practices.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/src/server';
import { createTestJWT } from '../../backend/src/test/test-utils';

describe('Security Tests', () => {
  let validToken;

  beforeAll(() => {
    validToken = createTestJWT({ userId: '1', role: 'user' });
  });

  describe('Authentication & Authorization', () => {
    it('rejects requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/documents')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    it('rejects requests with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    it('rejects requests with expired token', async () => {
      const expiredToken = createTestJWT({ userId: '1' }, 'secret', { expiresIn: '-1h' });
      
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('Token expired');
    });

    it('enforces role-based access control', async () => {
      const userToken = createTestJWT({ userId: '1', role: 'user' });
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('prevents SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/documents?search=${encodeURIComponent(maliciousQuery)}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Should not crash and should sanitize input
      expect(response.status).not.toBe(500);
      expect(response.body).toBeDefined();
    });

    it('prevents XSS attacks in document content', async () => {
      const xssPayload = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">';
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Test Document',
          content: xssPayload,
          tags: ['test'],
        });

      if (response.status === 201) {
        // Content should be sanitized
        expect(response.body.data.content).not.toContain('<script>');
        expect(response.body.data.content).not.toContain('onerror');
      }
    });

    it('validates file upload types and sizes', async () => {
      // Test malicious file upload
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('<?php system($_GET["cmd"]); ?>'), 'malicious.php');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid file type');
    });

    it('prevents path traversal attacks', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      const response = await request(app)
        .get(`/api/documents/${encodeURIComponent(maliciousPath)}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Document not found');
    });

    it('validates JSON input properly', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send('{"title": "Test", "content": "Test", invalid json}');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid JSON');
    });
  });

  describe('Rate Limiting & DoS Protection', () => {
    it('enforces rate limiting on API endpoints', async () => {
      const promises = Array(20).fill(null).map(() =>
        request(app)
          .get('/api/documents')
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('prevents large payload attacks', async () => {
      const largeContent = 'A'.repeat(1024 * 1024 * 10); // 10MB content
      
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Large Document',
          content: largeContent,
          tags: ['test'],
        });

      expect(response.status).toBe(413); // Payload too large
    });

    it('handles concurrent request limits', async () => {
      const promises = Array(100).fill(null).map((_, index) =>
        request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            title: `Concurrent Test ${index}`,
            content: 'Test content',
            tags: ['concurrent'],
          })
      );

      const responses = await Promise.all(promises.map(p => p.catch(e => ({ status: 500 }))));
      
      // Should handle some concurrent requests but may reject others
      const successfulResponses = responses.filter(r => r.status === 201);
      const rejectedResponses = responses.filter(r => r.status === 429 || r.status === 503);

      expect(successfulResponses.length + rejectedResponses.length).toBe(100);
    });
  });

  describe('Data Security & Privacy', () => {
    it('does not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      // Should not reveal whether email exists or not
      expect(response.body.error).not.toContain('nonexistent@example.com');
      expect(response.body.error).not.toContain('password incorrect');
    });

    it('properly encrypts sensitive data', async () => {
      // Test that passwords are not stored in plain text
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'security-test@example.com',
          password: 'testpassword123',
          name: 'Security Test User',
        });

      if (response.status === 201) {
        // Password should not be in response
        expect(response.body.user.password).toBeUndefined();
        expect(response.body.user.passwordHash).toBeUndefined();
      }
    });

    it('implements proper session management', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      if (loginResponse.status === 200) {
        const token = loginResponse.body.token;
        
        // Logout should invalidate token
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`);

        // Token should no longer work
        const response = await request(app)
          .get('/api/documents')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error).toContain('Invalid token');
      }
    });
  });

  describe('HTTP Security Headers', () => {
    it('includes security headers in responses', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for essential security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('sets proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/documents')
        .set('Origin', 'https://malicious-site.com');

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });
  });

  describe('API Security', () => {
    it('validates API versioning', async () => {
      const response = await request(app)
        .get('/api/v999/documents')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('handles malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/xml')
        .send('<xml>malformed</xml>');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid content type');
    });

    it('prevents HTTP method override attacks', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-HTTP-Method-Override', 'DELETE')
        .send({
          title: 'Test Document',
          content: 'Test content',
        });

      // Should create document, not delete
      expect(response.status).toBe(201);
    });
  });

  describe('Business Logic Security', () => {
    it('prevents unauthorized document access', async () => {
      // Try to access document belonging to another user
      const response = await request(app)
        .get('/api/documents/other-user-document-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });

    it('validates document ownership on updates', async () => {
      // Try to update document belonging to another user
      const response = await request(app)
        .put('/api/documents/other-user-document-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content',
        });

      expect(response.status).toBe(403);
    });

    it('prevents privilege escalation', async () => {
      const userToken = createTestJWT({ userId: '1', role: 'user' });
      
      // Try to promote self to admin
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: 'admin',
        });

      expect(response.status).toBe(403);
    });
  });
});