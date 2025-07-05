import { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock Express objects
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  method: 'GET',
  url: '/',
  ip: '127.0.0.1',
  ...overrides,
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res;
};

export const createMockNext = (): NextFunction => vi.fn();

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: '$2a$10$test.hash.for.testing.purposes',
  role: 'user' as const,
  tenantId: '1',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestDocument = (overrides = {}) => ({
  id: '1',
  title: 'Test Document',
  content: '# Test Document\n\nThis is a test document.',
  excerpt: 'This is a test document.',
  tags: ['test', 'mock'],
  category: 'general',
  isPublic: true,
  authorId: '1',
  tenantId: '1',
  version: 1,
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestTenant = (overrides = {}) => ({
  id: '1',
  name: 'Test Organization',
  slug: 'test-org',
  domain: 'test.smartwiki.com',
  settings: {
    theme: 'light',
    features: {
      ai: true,
      collaboration: true,
      analytics: true,
    },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// JWT helpers
export const createTestJWT = (payload = {}, secret = 'test-secret') => {
  const defaultPayload = {
    userId: '1',
    email: 'test@example.com',
    role: 'user',
    tenantId: '1',
    ...payload,
  };

  return jwt.sign(defaultPayload, secret, { expiresIn: '1h' });
};

export const createAuthenticatedRequest = (userPayload = {}) => {
  const token = createTestJWT(userPayload);
  return createMockRequest({
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
};

// Database helpers
export const createTestDatabase = () => {
  const db = new Map();
  
  return {
    get: (key: string) => db.get(key),
    set: (key: string, value: any) => db.set(key, value),
    delete: (key: string) => db.delete(key),
    clear: () => db.clear(),
    has: (key: string) => db.has(key),
    size: () => db.size,
    keys: () => Array.from(db.keys()),
    values: () => Array.from(db.values()),
    entries: () => Array.from(db.entries()),
  };
};

// API testing helpers
export const expectSuccessResponse = (response: any, expectedData?: any) => {
  expect(response.status).toBe(200);
  if (expectedData) {
    expect(response.body).toEqual(expect.objectContaining(expectedData));
  }
};

export const expectErrorResponse = (response: any, expectedStatus: number, expectedMessage?: string) => {
  expect(response.status).toBe(expectedStatus);
  if (expectedMessage) {
    expect(response.body.error).toContain(expectedMessage);
  }
};

export const expectValidationError = (response: any, field?: string) => {
  expect(response.status).toBe(400);
  expect(response.body.error).toBeDefined();
  if (field) {
    expect(response.body.error).toContain(field);
  }
};

// AWS mock helpers
export const createMockS3Response = (data = {}) => ({
  $metadata: {
    httpStatusCode: 200,
    requestId: 'test-request-id',
  },
  ...data,
});

export const createMockBedrockResponse = (content = 'Test AI response') => ({
  body: {
    transformToString: () => JSON.stringify({
      completion: content,
      stop_reason: 'end_turn',
    }),
  },
  $metadata: {
    httpStatusCode: 200,
    requestId: 'test-request-id',
  },
});

// Performance testing helpers
export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    executionTime: end - start,
  };
};

export const expectPerformanceThreshold = (executionTime: number, threshold: number) => {
  expect(executionTime).toBeLessThan(threshold);
};