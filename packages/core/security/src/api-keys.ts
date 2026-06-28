import { createHash, randomBytes } from 'crypto';

export interface ApiKey {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  rateLimitRpm: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export class ApiKeyService {
  generateApiKey(partnerId: string, scopes: string[] = []): { key: string; keyHash: string; keyPrefix: string } {
    const key = `mai_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.slice(0, 12);
    void partnerId;
    void scopes;
    return { key, keyHash, keyPrefix };
  }

  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  validateApiKey(key: string, storedHash: string): boolean {
    const hash = this.hashKey(key);
    return hash === storedHash;
  }

  isExpired(apiKey: ApiKey): boolean {
    if (!apiKey.expiresAt) return false;
    return new Date() > apiKey.expiresAt;
  }

  isRevoked(apiKey: ApiKey): boolean {
    return apiKey.revokedAt !== null;
  }

  hasScope(apiKey: ApiKey, requiredScope: string): boolean {
    if (apiKey.scopes.includes('*')) return true;
    return apiKey.scopes.includes(requiredScope);
  }
}
