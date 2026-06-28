import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JwtService } from '@music-ai/security';

test('jwt round-trips a user', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const token = jwt.generateAccessToken({ id: 'u1', tenantId: 't1', roles: ['viewer'], permissions: [] });
  const payload = jwt.verifyToken(token);
  assert.equal(payload.userId, 'u1');
  assert.equal(payload.tenantId, 't1');
});
