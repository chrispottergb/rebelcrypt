import { JwtService, TokenPayload } from './jwt';
import { RbacService, Role } from './rbac';

export interface Request {
  headers: Record<string, string | undefined>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: TokenPayload;
  tenantId?: string;
}

export interface Response {
  status(code: number): Response;
  json(data: unknown): void;
}

export type NextFunction = () => void;
export type Middleware = (req: Request, res: Response, next: NextFunction) => void;

export function authMiddleware(jwtService: JwtService): Middleware {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwtService.verifyToken(token);
      req.user = payload;
      req.tenantId = payload.tenantId;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      res.status(401).json({ error: message });
    }
  };
}

export function rbacMiddleware(
  rbacService: RbacService,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin',
): Middleware {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userRoles = req.user.roles as Role[];
    if (!rbacService.checkPermission(userRoles, resource, action)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function tenantMiddleware(): Middleware {
  return (req, res, next) => {
    if (!req.user?.tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }
    req.tenantId = req.user.tenantId;
    next();
  };
}

export function rateLimitMiddleware(maxRpm: number = 60): Middleware {
  const counters = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const key = req.user?.userId ?? req.headers['x-forwarded-for'] ?? 'anonymous';
    const now = Date.now();
    let entry = counters.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + 60000 };
      counters.set(key, entry);
    }

    entry.count++;
    if (entry.count > maxRpm) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    next();
  };
}

export function auditMiddleware(
  logFn: (entry: Record<string, unknown>) => void,
): Middleware {
  return (req, _res, next) => {
    logFn({
      userId: req.user?.userId,
      tenantId: req.tenantId,
      timestamp: new Date().toISOString(),
      headers: { userAgent: req.headers['user-agent'] },
    });
    next();
  };
}
