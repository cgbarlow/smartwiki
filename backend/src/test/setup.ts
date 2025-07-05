import { vi } from 'vitest';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup for Node.js backend
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/smartwiki_test';
  
  // Mock AWS SDK clients
  vi.mock('@aws-sdk/client-bedrock', () => ({
    BedrockClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  }));

  vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  }));

  vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  }));

  vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
    CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  }));

  // Mock console methods for clean test output
  global.console = {
    ...console,
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup if needed
});

afterAll(async () => {
  // Cleanup and restore all mocks
  vi.restoreAllMocks();
});