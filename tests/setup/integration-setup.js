const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

let prisma;

// Setup function called before all integration tests
export const setupIntegrationTests = async () => {
  console.log('🔧 Setting up integration test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/smartwiki_test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
  
  try {
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Reset database schema (uncomment if using real DB)
    // console.log('📦 Resetting test database...');
    // execSync('cd backend && npx prisma migrate reset --force --skip-generate', { stdio: 'inherit' });
    
    // Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData();
    
    console.log('✅ Integration test environment ready!');
  } catch (error) {
    console.error('❌ Failed to setup integration tests:', error);
    throw error;
  }
};

// Cleanup function called after all integration tests
export const teardownIntegrationTests = async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  try {
    if (prisma) {
      await prisma.$disconnect();
    }
    console.log('✅ Integration test cleanup complete!');
  } catch (error) {
    console.error('❌ Failed to cleanup integration tests:', error);
  }
};

// Seed minimal test data
const seedTestData = async () => {
  // For now, use in-memory data since we're mocking the database
  // In a real scenario, you would seed actual test data
  console.log('Using mocked database - no seeding required');
};

// Reset data between tests
export const resetTestData = async () => {
  // Clear any cached data or reset mocks
  if (global.testDatabase) {
    global.testDatabase.clear();
  }
};

// Global setup
global.setupIntegrationTests = setupIntegrationTests;
global.teardownIntegrationTests = teardownIntegrationTests;
global.resetTestData = resetTestData;