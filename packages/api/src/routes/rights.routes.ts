import { RouteDefinition } from '../server';
export const rightsRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/api/v1/rights/contracts', handler: 'rights.listContracts', auth: true, permissions: ['rights:read'] },
  { method: 'POST', path: '/api/v1/rights/contracts', handler: 'rights.createContract', auth: true, permissions: ['rights:create'] },
  { method: 'GET', path: '/api/v1/rights/contracts/:id', handler: 'rights.getContract', auth: true, permissions: ['rights:read'] },
  { method: 'PUT', path: '/api/v1/rights/contracts/:id', handler: 'rights.updateContract', auth: true, permissions: ['rights:update'] },
  { method: 'GET', path: '/api/v1/rights/bundles', handler: 'rights.listBundles', auth: true, permissions: ['rights:read'] },
  { method: 'POST', path: '/api/v1/rights/bundles', handler: 'rights.createBundle', auth: true, permissions: ['rights:create'] },
  { method: 'GET', path: '/api/v1/rights/territories', handler: 'rights.listTerritories', auth: true },
  { method: 'GET', path: '/api/v1/rights/check/:trackId/:territory', handler: 'rights.checkTerritory', auth: true, permissions: ['rights:read'] },
  { method: 'POST', path: '/api/v1/royalties/calculate', handler: 'royalties.calculate', auth: true, permissions: ['rights:read'] },
  { method: 'GET', path: '/api/v1/royalties/reports', handler: 'royalties.reports', auth: true, permissions: ['rights:read'] },
  { method: 'GET', path: '/api/v1/royalties/forecasts', handler: 'royalties.forecasts', auth: true, permissions: ['rights:read'] },
];
