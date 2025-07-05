export const mockUsers = {
  admin: {
    id: 'user-admin',
    email: 'admin@smartwiki.com',
    name: 'Admin User',
    role: 'admin',
    tenantId: 'tenant-1',
    permissions: ['read', 'write', 'admin']
  },
  
  user: {
    id: 'user-regular',
    email: 'user@smartwiki.com',
    name: 'Regular User',
    role: 'user',
    tenantId: 'tenant-1',
    permissions: ['read', 'write']
  },
  
  viewer: {
    id: 'user-viewer',
    email: 'viewer@smartwiki.com',
    name: 'Viewer User',
    role: 'viewer',
    tenantId: 'tenant-1',
    permissions: ['read']
  },
  
  // User from different tenant
  otherTenant: {
    id: 'user-other',
    email: 'user@other-tenant.com',
    name: 'Other Tenant User',
    role: 'user',
    tenantId: 'tenant-2',
    permissions: ['read', 'write']
  }
}

export const createMockUser = (overrides = {}) => {
  return {
    id: `user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    tenantId: 'tenant-1',
    permissions: ['read', 'write'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  }
}