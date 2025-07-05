import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

let prisma: PrismaClient;

// Global setup for backend integration tests
beforeAll(async () => {
  console.log('🔧 Setting up backend integration test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/smartwiki_test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
  process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
  process.env.S3_BUCKET_NAME = 'test-smartwiki-bucket';
  
  try {
    // Initialize Prisma client for testing
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['error'], // Only log errors in tests
    });

    // For now, we'll use mocked database operations
    // In production, you might want to:
    // 1. Use a separate test database
    // 2. Run migrations
    // 3. Seed test data
    
    console.log('✅ Backend integration test environment ready!');
  } catch (error) {
    console.error('❌ Failed to setup backend integration tests:', error);
    throw error;
  }
});

// Reset data before each test
beforeEach(async () => {
  // Clear any test data or reset mocks
  if (global.testDatabase) {
    (global.testDatabase as any).clear();
  }
  
  // Reset all mocks
  if (typeof vi !== 'undefined') {
    vi.clearAllMocks();
  }
});

// Global cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up backend integration test environment...');
  
  try {
    if (prisma) {
      await prisma.$disconnect();
    }
    console.log('✅ Backend integration test cleanup complete!');
  } catch (error) {
    console.error('❌ Failed to cleanup backend integration tests:', error);
  }
});

// Export for use in tests
export { prisma };