import { RouteDefinition } from '../server';
export const analyticsRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/api/v1/analytics/kpis', handler: 'analytics.kpis', auth: true, permissions: ['analytics:read'] },
  { method: 'GET', path: '/api/v1/analytics/kpis/:metric', handler: 'analytics.getKpi', auth: true, permissions: ['analytics:read'] },
  { method: 'GET', path: '/api/v1/analytics/forecasts', handler: 'analytics.forecasts', auth: true, permissions: ['analytics:read'] },
  { method: 'POST', path: '/api/v1/analytics/forecasts/generate', handler: 'analytics.generateForecast', auth: true, permissions: ['analytics:create'] },
  { method: 'GET', path: '/api/v1/analytics/segments', handler: 'analytics.segments', auth: true, permissions: ['analytics:read'] },
  { method: 'GET', path: '/api/v1/experiments', handler: 'experiments.list', auth: true, permissions: ['experiments:read'] },
  { method: 'POST', path: '/api/v1/experiments', handler: 'experiments.create', auth: true, permissions: ['experiments:create'] },
  { method: 'GET', path: '/api/v1/experiments/:id', handler: 'experiments.get', auth: true, permissions: ['experiments:read'] },
  { method: 'POST', path: '/api/v1/experiments/:id/start', handler: 'experiments.start', auth: true, permissions: ['experiments:execute'] },
  { method: 'POST', path: '/api/v1/experiments/:id/stop', handler: 'experiments.stop', auth: true, permissions: ['experiments:execute'] },
  { method: 'GET', path: '/api/v1/experiments/:id/results', handler: 'experiments.results', auth: true, permissions: ['experiments:read'] },
  { method: 'GET', path: '/api/v1/analytics/revenue', handler: 'analytics.revenue', auth: true, permissions: ['analytics:read'] },
  { method: 'GET', path: '/api/v1/analytics/costs', handler: 'analytics.costs', auth: true, permissions: ['analytics:read'] },
];
