import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RbacService, EncryptionService } from '@music-ai/security';

test('RbacService: admin wildcard grants every action on any resource', () => {
  const rbac = new RbacService();
  assert.equal(rbac.checkPermission(['admin'], 'workflows', 'delete'), true);
  assert.equal(rbac.checkPermission(['admin'], 'anything', 'admin'), true);
  assert.equal(rbac.checkPermission(['admin'], 'random-resource', 'execute'), true);
});

test('RbacService: builder has scoped permissions and is denied elsewhere', () => {
  const rbac = new RbacService();
  // builder can create workflows
  assert.equal(rbac.checkPermission(['builder'], 'workflows', 'create'), true);
  // builder can only read analytics (no update)
  assert.equal(rbac.checkPermission(['builder'], 'analytics', 'read'), true);
  assert.equal(rbac.checkPermission(['builder'], 'analytics', 'update'), false);
  // builder cannot delete tracks (only create/read/update granted)
  assert.equal(rbac.checkPermission(['builder'], 'tracks', 'delete'), false);
});

test('RbacService: viewer is read-only and unknown roles grant nothing', () => {
  const rbac = new RbacService();
  assert.equal(rbac.checkPermission(['viewer'], 'tracks', 'read'), true);
  assert.equal(rbac.checkPermission(['viewer'], 'tracks', 'update'), false);
  // unknown role short-circuits to false
  assert.equal(rbac.checkPermission(['nope' as any], 'tracks', 'read'), false);
  // empty role list is always denied
  assert.equal(rbac.checkPermission([], 'tracks', 'read'), false);
});

test('RbacService: multiple roles are unioned', () => {
  const rbac = new RbacService();
  // viewer alone cannot execute workflows, operator can
  assert.equal(rbac.checkPermission(['viewer'], 'workflows', 'execute'), false);
  assert.equal(rbac.checkPermission(['viewer', 'operator'], 'workflows', 'execute'), true);
});

test('RbacService: role helpers and metadata', () => {
  const rbac = new RbacService();
  assert.equal(rbac.hasRole(['viewer', 'operator'], 'operator'), true);
  assert.equal(rbac.hasRole(['viewer'], 'admin'), false);
  assert.equal(rbac.hasAnyRole(['viewer'], ['admin', 'viewer']), true);
  assert.equal(rbac.hasAnyRole(['viewer'], ['admin', 'exec']), false);
  assert.ok(rbac.getAllRoles().includes('admin'));
  assert.ok(rbac.getPermissionsForRole('partner').length > 0);
  assert.deepEqual(rbac.getPermissionsForRole('nope' as any), []);
});

test('EncryptionService: encrypt then decrypt round-trips to the original', () => {
  const enc = new EncryptionService('test-master-key');
  const plaintext = 'top secret éñ 🎵 payload';
  const cipher = enc.encrypt(plaintext);
  assert.equal(enc.decrypt(cipher), plaintext);
  // empty string round-trips too
  assert.equal(enc.decrypt(enc.encrypt('')), '');
});

test('EncryptionService: ciphertext is non-deterministic but still decrypts', () => {
  const enc = new EncryptionService('test-master-key');
  const a = enc.encrypt('same input');
  const b = enc.encrypt('same input');
  assert.notEqual(a, b); // random salt + iv each time
  assert.equal(enc.decrypt(a), 'same input');
  assert.equal(enc.decrypt(b), 'same input');
  // format is salt:iv:tag:data
  assert.equal(a.split(':').length, 4);
});

test('EncryptionService: wrong key or malformed input fails to decrypt', () => {
  const enc = new EncryptionService('key-one');
  const other = new EncryptionService('key-two');
  const cipher = enc.encrypt('hello');
  assert.throws(() => other.decrypt(cipher)); // wrong key -> auth tag mismatch
  assert.throws(() => enc.decrypt('not:valid'), /Invalid ciphertext format/);
});

test('EncryptionService: password hashing verifies correctly', () => {
  const enc = new EncryptionService();
  const stored = enc.hashPassword('hunter2');
  assert.equal(enc.verifyPassword('hunter2', stored), true);
  assert.equal(enc.verifyPassword('wrong', stored), false);
  // distinct salts produce distinct hashes for the same password
  assert.notEqual(enc.hashPassword('hunter2'), stored);
});
