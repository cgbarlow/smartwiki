import { vi } from 'vitest'
import '@testing-library/jest-dom'
import { server } from '../mocks/server.js'

// Mock environment variables
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret')
vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
vi.stubEnv('AWS_REGION', 'us-east-1')
vi.stubEnv('AWS_ACCESS_KEY_ID', 'test')
vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test')
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    beforePopState: vi.fn(),
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    },
    isFallback: false,
    isLocaleDomain: true,
    isReady: true,
    defaultLocale: 'en',
    domainLocales: [],
    isPreview: false
  })
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}))

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock', () => ({
  BedrockClient: vi.fn(() => ({
    send: vi.fn()
  })),
  InvokeModelCommand: vi.fn()
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn()
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn()
}))

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    tenant: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }))
}))

// Setup MSW
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

// Global test utilities
global.mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  tenantId: 'tenant-1'
}

global.mockDocument = {
  id: 'doc-1',
  title: 'Test Document',
  content: 'Test content',
  userId: 'user-1',
  tenantId: 'tenant-1'
}