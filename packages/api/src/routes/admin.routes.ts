import { RouteDefinition } from '../server';
export const adminRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/api/v1/admin/tenants', handler: 'admin.listTenants', auth: true, permissions: ['admin'] },
  { method: 'POST', path: '/api/v1/admin/tenants', handler: 'admin.createTenant', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/tenants/:id', handler: 'admin.getTenant', auth: true, permissions: ['admin'] },
  { method: 'PUT', path: '/api/v1/admin/tenants/:id', handler: 'admin.updateTenant', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/users', handler: 'admin.listUsers', auth: true, permissions: ['admin'] },
  { method: 'POST', path: '/api/v1/admin/users', handler: 'admin.createUser', auth: true, permissions: ['admin'] },
  { method: 'PUT', path: '/api/v1/admin/users/:id', handler: 'admin.updateUser', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/roles', handler: 'admin.listRoles', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/audit-logs', handler: 'admin.auditLogs', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/api-keys', handler: 'admin.listApiKeys', auth: true, permissions: ['admin'] },
  { method: 'POST', path: '/api/v1/admin/api-keys', handler: 'admin.createApiKey', auth: true, permissions: ['admin'] },
  { method: 'DELETE', path: '/api/v1/admin/api-keys/:id', handler: 'admin.revokeApiKey', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/health', handler: 'system.health', auth: false },
  { method: 'GET', path: '/api/v1/health/detailed', handler: 'system.healthDetailed', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/incidents', handler: 'admin.incidents', auth: true, permissions: ['admin'] },
  { method: 'GET', path: '/api/v1/admin/system-health', handler: 'admin.systemHealth', auth: true, permissions: ['admin'] },
];
