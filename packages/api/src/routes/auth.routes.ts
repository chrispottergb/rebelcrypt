import { RouteDefinition } from '../server';
export const authRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/api/v1/auth/register', handler: 'auth.register', auth: false },
  { method: 'POST', path: '/api/v1/auth/login', handler: 'auth.login', auth: false },
  { method: 'POST', path: '/api/v1/auth/refresh', handler: 'auth.refresh', auth: false },
  { method: 'POST', path: '/api/v1/auth/logout', handler: 'auth.logout', auth: true },
  { method: 'GET', path: '/api/v1/auth/me', handler: 'auth.me', auth: true },
  { method: 'POST', path: '/api/v1/auth/forgot-password', handler: 'auth.forgotPassword', auth: false },
  { method: 'POST', path: '/api/v1/auth/reset-password', handler: 'auth.resetPassword', auth: false },
  { method: 'POST', path: '/api/v1/auth/verify-email', handler: 'auth.verifyEmail', auth: false },
  { method: 'POST', path: '/api/v1/auth/mfa/enable', handler: 'auth.enableMfa', auth: true },
  { method: 'POST', path: '/api/v1/auth/mfa/verify', handler: 'auth.verifyMfa', auth: true },
];
