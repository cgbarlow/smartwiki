export const mockTenants = {
  primary: {
    id: 'tenant-1',
    name: 'Primary Tenant',
    domain: 'primary.smartwiki.com',
    subdomain: 'primary',
    settings: {
      allowFileUpload: true,
      maxFileSize: 10485760, // 10MB
      allowedFileTypes: ['pdf', 'docx', 'txt', 'md'],
      theme: 'default',
      features: {
        compliance: true,
        agents: true,
        api: true
      }
    },
    limits: {
      users: 100,
      documents: 10000,
      storage: 1073741824 // 1GB
    },
    subscription: {
      plan: 'professional',
      status: 'active',
      expiresAt: '2025-12-31T23:59:59Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  
  secondary: {
    id: 'tenant-2',
    name: 'Secondary Tenant',
    domain: 'secondary.smartwiki.com',
    subdomain: 'secondary',
    settings: {
      allowFileUpload: true,
      maxFileSize: 5242880, // 5MB
      allowedFileTypes: ['pdf', 'txt'],
      theme: 'dark',
      features: {
        compliance: false,
        agents: true,
        api: false
      }
    },
    limits: {
      users: 50,
      documents: 5000,
      storage: 536870912 // 512MB
    },
    subscription: {
      plan: 'basic',
      status: 'active',
      expiresAt: '2025-06-30T23:59:59Z'
    },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  
  trial: {
    id: 'tenant-trial',
    name: 'Trial Tenant',
    domain: 'trial.smartwiki.com',
    subdomain: 'trial',
    settings: {
      allowFileUpload: true,
      maxFileSize: 1048576, // 1MB
      allowedFileTypes: ['txt', 'md'],
      theme: 'default',
      features: {
        compliance: false,
        agents: false,
        api: false
      }
    },
    limits: {
      users: 5,
      documents: 100,
      storage: 104857600 // 100MB
    },
    subscription: {
      plan: 'trial',
      status: 'trial',
      expiresAt: '2025-08-01T23:59:59Z'
    },
    createdAt: '2025-07-01T00:00:00Z',
    updatedAt: '2025-07-01T00:00:00Z'
  }
}

export const createMockTenant = (overrides = {}) => {
  return {
    id: `tenant-${Date.now()}`,
    name: 'Test Tenant',
    domain: 'test.smartwiki.com',
    subdomain: 'test',
    settings: {
      allowFileUpload: true,
      maxFileSize: 10485760,
      allowedFileTypes: ['pdf', 'docx', 'txt', 'md'],
      theme: 'default',
      features: {
        compliance: true,
        agents: true,
        api: true
      }
    },
    limits: {
      users: 100,
      documents: 10000,
      storage: 1073741824
    },
    subscription: {
      plan: 'professional',
      status: 'active',
      expiresAt: '2025-12-31T23:59:59Z'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}