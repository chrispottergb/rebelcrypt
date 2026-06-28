import { RouteDefinition } from '../server';
export const workflowRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/api/v1/workflows', handler: 'workflows.list', auth: true, permissions: ['workflows:read'] },
  { method: 'POST', path: '/api/v1/workflows', handler: 'workflows.create', auth: true, permissions: ['workflows:create'] },
  { method: 'GET', path: '/api/v1/workflows/:id', handler: 'workflows.get', auth: true, permissions: ['workflows:read'] },
  { method: 'PUT', path: '/api/v1/workflows/:id', handler: 'workflows.update', auth: true, permissions: ['workflows:update'] },
  { method: 'DELETE', path: '/api/v1/workflows/:id', handler: 'workflows.delete', auth: true, permissions: ['workflows:delete'] },
  { method: 'POST', path: '/api/v1/workflows/:id/execute', handler: 'workflows.execute', auth: true, permissions: ['workflows:execute'] },
  { method: 'GET', path: '/api/v1/workflows/:id/runs', handler: 'workflows.listRuns', auth: true, permissions: ['workflows:read'] },
  { method: 'GET', path: '/api/v1/workflows/:id/runs/:runId', handler: 'workflows.getRun', auth: true, permissions: ['workflows:read'] },
  { method: 'POST', path: '/api/v1/workflows/:id/runs/:runId/cancel', handler: 'workflows.cancelRun', auth: true, permissions: ['workflows:execute'] },
  { method: 'GET', path: '/api/v1/workflows/nodes/registry', handler: 'workflows.nodeRegistry', auth: true, permissions: ['workflows:read'] },
];
