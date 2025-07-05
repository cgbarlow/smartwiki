import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { createMockUser, createMockDocument, createMockTenant } from '../fixtures/index.js'

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(ui, options = {}) {
  const {
    user = createMockUser(),
    tenant = createMockTenant(),
    ...renderOptions
  } = options

  // Mock session provider
  const SessionProvider = ({ children }) => {
    return children
  }

  // Mock tenant provider
  const TenantProvider = ({ children }) => {
    return children
  }

  function Wrapper({ children }) {
    return (
      <SessionProvider>
        <TenantProvider>
          {children}
        </TenantProvider>
      </SessionProvider>
    )
  }

  return {
    user,
    tenant,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  }
}

/**
 * Create a mock API response
 */
export function createMockApiResponse(data, options = {}) {
  const {
    status = 200,
    statusText = 'OK',
    headers = { 'Content-Type': 'application/json' }
  } = options

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data))
  }
}

/**
 * Mock fetch implementation
 */
export function mockFetch(responses = {}) {
  const mockFn = vi.fn()
  
  Object.entries(responses).forEach(([url, response]) => {
    if (typeof response === 'function') {
      mockFn.mockImplementation((requestUrl) => {
        if (requestUrl.includes(url)) {
          return Promise.resolve(response())
        }
      })
    } else {
      mockFn.mockImplementation((requestUrl) => {
        if (requestUrl.includes(url)) {
          return Promise.resolve(createMockApiResponse(response))
        }
      })
    }
  })
  
  global.fetch = mockFn
  return mockFn
}

/**
 * Wait for async operations to complete
 */
export function waitFor(callback, options = {}) {
  const { timeout = 1000, interval = 50 } = options
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    function check() {
      try {
        const result = callback()
        if (result) {
          resolve(result)
          return
        }
      } catch (error) {
        // Continue waiting
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'))
        return
      }
      
      setTimeout(check, interval)
    }
    
    check()
  })
}

/**
 * Create a mock Prisma client
 */
export function createMockPrisma() {
  return {
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    tenant: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    file: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn) => fn(this))
  }
}

/**
 * Create a mock AWS SDK client
 */
export function createMockAwsClient(serviceName, methods = {}) {
  const mockClient = {
    send: vi.fn()
  }
  
  Object.entries(methods).forEach(([methodName, implementation]) => {
    mockClient[methodName] = vi.fn(implementation)
  })
  
  return mockClient
}

/**
 * Performance testing helper
 */
export async function measurePerformance(fn, iterations = 1) {
  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await fn()
    const end = performance.now()
    times.push(end - start)
  }
  
  return {
    min: Math.min(...times),
    max: Math.max(...times),
    average: times.reduce((a, b) => a + b, 0) / times.length,
    median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
    times
  }
}

/**
 * Database seeding helper
 */
export async function seedTestData(prisma) {
  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: createMockTenant({ id: 'test-tenant' })
  })
  
  // Create test users
  const admin = await prisma.user.create({
    data: createMockUser({
      id: 'test-admin',
      email: 'admin@test.com',
      role: 'admin',
      tenantId: tenant.id
    })
  })
  
  const user = await prisma.user.create({
    data: createMockUser({
      id: 'test-user',
      email: 'user@test.com',
      role: 'user',
      tenantId: tenant.id
    })
  })
  
  // Create test documents
  const documents = await Promise.all([
    prisma.document.create({
      data: createMockDocument({
        id: 'test-doc-1',
        title: 'Test Document 1',
        userId: user.id,
        tenantId: tenant.id
      })
    }),
    prisma.document.create({
      data: createMockDocument({
        id: 'test-doc-2',
        title: 'Test Document 2',
        userId: admin.id,
        tenantId: tenant.id
      })
    })
  ])
  
  return {
    tenant,
    users: { admin, user },
    documents
  }
}