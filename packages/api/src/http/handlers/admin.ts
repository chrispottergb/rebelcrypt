import { randomUUID } from 'crypto';
import { ok, created, notFound, badRequest } from '../context';
import type { HandlerFn, RequestContext } from '../context';
import type { StoredUser } from '../context';
import type { HandlerDeps } from '../handlers';

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

function safeUser(u: StoredUser): Omit<StoredUser, 'passwordHash'> {
  const { passwordHash: _omit, ...rest } = u;
  void _omit;
  return rest;
}

const ROLES = [
  { name: 'admin', description: 'Full platform administration' },
  { name: 'builder', description: 'Create and manage workflows' },
  { name: 'operator', description: 'Run and monitor operations' },
  { name: 'partner', description: 'External partner access' },
  { name: 'viewer', description: 'Read-only access' },
  { name: 'exec', description: 'Executive dashboards and KPIs' },
];

function healthDetailed(): Record<string, unknown> {
  return { status: 'ok', services: { api: 'up', database: 'up', redis: 'up' }, version: '0.1.0' };
}

function maskKey(row: Record<string, unknown>): Record<string, unknown> {
  const key = typeof row['key'] === 'string' ? (row['key'] as string) : '';
  return { ...row, key: key ? `${key.slice(0, 6)}…${key.slice(-4)}` : '' };
}

export function makeAdminHandlers(deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    // ---- health ----
    'system.health': () => ok({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }),
    'system.healthDetailed': () => ok(healthDetailed()),
    'admin.systemHealth': () => ok(healthDetailed()),

    // ---- tenants ----
    'admin.listTenants': (_ctx, store) => ok(store.tenants.list()),
    'admin.createTenant': (ctx: RequestContext, store) => {
      const b = asRecord(ctx.body);
      if (!b['name']) return badRequest('name is required');
      const tenant = store.tenants.insert({ tenantId: 'system', ...b });
      return created(tenant);
    },
    'admin.getTenant': (ctx, store) => {
      const t = store.tenants.get(ctx.params['id'] ?? '');
      return t ? ok(t) : notFound('tenant not found');
    },
    'admin.updateTenant': (ctx, store) => {
      const updated = store.tenants.update(ctx.params['id'] ?? '', asRecord(ctx.body));
      return updated ? ok(updated) : notFound('tenant not found');
    },

    // ---- users ----
    'admin.listUsers': (_ctx, store) => ok(store.users.list().map(safeUser)),
    'admin.createUser': (ctx, store) => {
      const b = asRecord(ctx.body);
      const email = b['email'] ? String(b['email']) : '';
      if (!email) return badRequest('email is required');
      const user = store.users.insert({
        tenantId: ctx.auth?.tenantId ?? 'default',
        email,
        passwordHash: '',
        roles: Array.isArray(b['roles']) ? (b['roles'] as string[]) : ['viewer'],
        status: 'active',
      });
      return created(safeUser(user));
    },
    'admin.updateUser': (ctx, store) => {
      const updated = store.users.update(ctx.params['id'] ?? '', asRecord(ctx.body) as Partial<StoredUser>);
      return updated ? ok(safeUser(updated)) : notFound('user not found');
    },

    // ---- roles ----
    'admin.listRoles': () => ok(ROLES),

    // ---- audit & incidents ----
    'admin.auditLogs': (ctx) => {
      const limit = ctx.query['limit'] ? Number(ctx.query['limit']) : 100;
      return ok(deps.audit.query({ limit }));
    },
    'admin.incidents': () => ok([]),

    // ---- api keys ----
    'admin.listApiKeys': (_ctx, store) => ok(store.apiKeys.list().map(maskKey)),
    'admin.createApiKey': (ctx, store) => {
      const b = asRecord(ctx.body);
      const label = b['label'] ? String(b['label']) : 'default';
      const key = `sk_${randomUUID().replace(/-/g, '')}`;
      const row = store.apiKeys.insert({ tenantId: ctx.auth?.tenantId ?? 'default', label, key });
      return created(row); // full key returned once on creation
    },
    'admin.revokeApiKey': (ctx, store) => {
      const removed = store.apiKeys.remove(ctx.params['id'] ?? '');
      return removed ? ok({ revoked: true }) : notFound('api key not found');
    },
  };
}
