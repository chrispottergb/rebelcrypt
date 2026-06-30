import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'http';
import { JwtService } from '@music-ai/security';
import { MetricsRegistry } from '@music-ai/observability';
import { AuditLog } from '@music-ai/governance';
import { Router } from './router';
import { DataStore, type HandlerFn, type RequestContext, type AuthInfo } from './context';
import { handlerRegistry } from './handlers';
import type { Persistence } from './persistence';
import type { RouteDefinition } from '../server';

export interface HttpServerOptions {
  routes: RouteDefinition[];
  jwtSecret: string;
  corsOrigins: string[];
  persistence?: Persistence | null;
}

export interface HttpServer {
  server: Server;
  store: DataStore;
  metrics: MetricsRegistry;
  audit: AuditLog;
  /** Load persisted documents into the in-memory cache (no-op without a DB). */
  hydrate(): Promise<void>;
  listen(port: number, host: string): Promise<void>;
  close(): Promise<void>;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseQuery(url: string): Record<string, string> {
  const q: Record<string, string> = {};
  const idx = url.indexOf('?');
  if (idx === -1) return q;
  const search = url.slice(idx + 1);
  for (const pair of search.split('&')) {
    if (!pair) continue;
    const [k, v] = pair.split('=');
    if (k) q[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  }
  return q;
}

function pathOf(url: string): string {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function authFromHeader(authz: string | undefined, jwt: JwtService): AuthInfo | null {
  if (!authz || !authz.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verifyToken(authz.slice(7));
    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  } catch {
    return null;
  }
}

export function createHttpServer(opts: HttpServerOptions): HttpServer {
  const router = new Router(opts.routes);
  const persistence = opts.persistence ?? null;
  const store = new DataStore(persistence ?? undefined);
  const jwt = new JwtService({ secret: opts.jwtSecret });
  const metrics = new MetricsRegistry();
  const audit = new AuditLog();
  const requests = metrics.counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'status'],
  });
  const registry: Record<string, HandlerFn> = handlerRegistry(jwt, metrics, audit);

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = (req.method ?? 'GET').toUpperCase();
    const url = req.url ?? '/';
    const path = pathOf(url);
    const origin = opts.corsOrigins.includes('*') ? '*' : opts.corsOrigins[0] ?? '*';

    const send = (status: number, body: unknown, extra?: Record<string, string>): void => {
      requests.inc({ method, status: String(status) });
      const payload = body === undefined ? '' : JSON.stringify(body);
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        ...extra,
      });
      res.end(payload);
    };

    if (method === 'OPTIONS') {
      send(204, undefined);
      return;
    }

    // Prometheus metrics endpoint, served outside the route table.
    if (method === 'GET' && path === '/api/v1/metrics') {
      requests.inc({ method, status: '200' });
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
      res.end(metrics.render());
      return;
    }

    const matched = router.match(method, path);
    if (!matched) {
      send(router.pathExists(path) ? 405 : 404, {
        error: router.pathExists(path) ? 'Method not allowed' : 'Not found',
        path,
      });
      return;
    }

    const auth = authFromHeader(req.headers['authorization'], jwt);
    if (matched.route.auth && !auth) {
      send(401, { error: 'Unauthorized' });
      return;
    }

    const handler = registry[matched.route.handler];
    if (!handler) {
      send(501, { error: 'Not implemented', handler: matched.route.handler });
      return;
    }

    try {
      const body = await readBody(req);
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === 'string') headers[k] = v;
      }
      const ctx: RequestContext = {
        method,
        path,
        params: matched.params,
        query: parseQuery(url),
        headers,
        body,
        auth,
      };
      const result = await handler(ctx, store);
      if (MUTATING.has(method)) {
        audit.record({
          action: matched.route.handler,
          actorId: auth?.userId ?? 'anonymous',
          success: result.status < 400,
          metadata: { path, status: result.status },
        });
      }
      send(result.status, result.body, result.headers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      send(500, { error: 'Internal server error', detail: message });
    }
  }

  return {
    server,
    store,
    metrics,
    audit,
    hydrate: async () => {
      if (!persistence) return;
      const all = await persistence.loadAll();
      for (const [name, rows] of Object.entries(all)) {
        store.byName[name]?.hydrate(rows);
      }
    },
    listen: (port: number, host: string) =>
      new Promise<void>((resolve) => server.listen(port, host, resolve)),
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      if (persistence) await persistence.close();
    },
  };
}
