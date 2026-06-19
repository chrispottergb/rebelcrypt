import { createHmac, randomBytes } from 'crypto';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface JwtConfig {
  secret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  issuer: string;
}

const DEFAULT_JWT_CONFIG: JwtConfig = {
  secret: process.env['JWT_SECRET'] ?? 'change-me-in-production',
  accessTokenTtlSeconds: 3600,
  refreshTokenTtlSeconds: 604800,
  issuer: 'music-ai-ecosystem',
};

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

export class JwtService {
  private config: JwtConfig;

  constructor(config?: Partial<JwtConfig>) {
    this.config = { ...DEFAULT_JWT_CONFIG, ...config };
  }

  generateAccessToken(user: { id: string; tenantId: string; roles: string[]; permissions: string[] }): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
      type: 'access',
      iat: now,
      exp: now + this.config.accessTokenTtlSeconds,
    };
    return this.sign(payload);
  }

  generateRefreshToken(user: { id: string; tenantId: string }): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      roles: [],
      permissions: [],
      type: 'refresh',
      iat: now,
      exp: now + this.config.refreshTokenTtlSeconds,
    };
    return this.sign(payload);
  }

  verifyToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSig = this.hmac(`${headerB64}.${payloadB64}`);

    if (expectedSig !== signatureB64) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  }

  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyToken(refreshToken);
    if (payload.type !== 'refresh') throw new Error('Not a refresh token');

    return this.generateAccessToken({
      id: payload.userId,
      tenantId: payload.tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
    });
  }

  private sign(payload: TokenPayload): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = this.hmac(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  private hmac(data: string): string {
    return createHmac('sha256', this.config.secret).update(data).digest('base64url');
  }

  static generateSecret(): string {
    return randomBytes(64).toString('hex');
  }
}
