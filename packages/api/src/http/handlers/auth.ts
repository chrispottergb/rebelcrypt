import { scryptSync, timingSafeEqual } from 'crypto';
import { ok, created, badRequest } from '../context';
import type { HandlerFn } from '../context';
import type { HandlerDeps } from '../handlers';

function hashPassword(password: string): string {
  return scryptSync(password, 'static-salt', 64).toString('hex');
}

function passwordMatches(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  if (computed.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

export function makeAuthHandlers(deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    'auth.register': (ctx, store) => {
      const b = asRecord(ctx.body);
      const email = b['email'] ? String(b['email']) : '';
      const password = b['password'] ? String(b['password']) : '';
      if (!email || !password) return badRequest('email and password are required');
      const existing = store.users.list().find((u) => u.email === email);
      if (existing) return badRequest('email already registered');
      const user = store.users.insert({
        tenantId: b['tenantId'] ? String(b['tenantId']) : 'default',
        email,
        passwordHash: hashPassword(password),
        roles: ['viewer'],
        status: 'active',
      });
      return created({ id: user.id, email: user.email, roles: user.roles });
    },

    'auth.login': (ctx, store) => {
      const b = asRecord(ctx.body);
      const email = b['email'] ? String(b['email']) : '';
      const password = b['password'] ? String(b['password']) : '';
      const user = store.users.list().find((u) => u.email === email);
      if (!user || !passwordMatches(password, user.passwordHash)) {
        return { status: 401, body: { error: 'Invalid credentials' } };
      }
      return ok({
        accessToken: deps.jwt.generateAccessToken({
          id: user.id,
          tenantId: user.tenantId,
          roles: user.roles,
          permissions: [],
        }),
        refreshToken: deps.jwt.generateRefreshToken(user),
        user: { id: user.id, email: user.email, roles: user.roles },
      });
    },

    'auth.refresh': (ctx) => {
      const b = asRecord(ctx.body);
      const token = b['refreshToken'] ? String(b['refreshToken']) : '';
      try {
        return ok({ accessToken: deps.jwt.refreshAccessToken(token) });
      } catch {
        return { status: 401, body: { error: 'Invalid refresh token' } };
      }
    },

    'auth.logout': () => ok({ success: true }),

    'auth.me': (ctx) => ok(ctx.auth),

    'auth.forgotPassword': (ctx) => {
      const b = asRecord(ctx.body);
      return ok({ sent: true, email: b['email'] ? String(b['email']) : null });
    },

    'auth.resetPassword': () => ok({ reset: true }),

    'auth.verifyEmail': () => ok({ verified: true }),

    'auth.enableMfa': (ctx) => {
      const userId = ctx.auth?.userId ?? 'user';
      return ok({ mfaEnabled: true, secret: `MFA-${userId.slice(0, 8).toUpperCase()}` });
    },

    'auth.verifyMfa': () => ok({ verified: true }),
  };
}
