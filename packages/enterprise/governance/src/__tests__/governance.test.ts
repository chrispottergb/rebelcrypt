import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuditLog, PolicyEngine, classifyField } from '@music-ai/governance';

test('AuditLog records an entry and query returns it', () => {
  const now = 1000;
  const log = new AuditLog(100, () => now);
  const entry = log.record({ action: 'policy.decision', actorId: 'u1', success: true });
  assert.equal(entry.action, 'policy.decision');
  assert.equal(entry.severity, 'info'); // success defaults to info
  assert.equal(log.size, 1);
  const results = log.query({ action: 'policy.decision' });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, entry.id);
});

test('AuditLog returns entries newest-first and honors limit', () => {
  let now = 0;
  const log = new AuditLog(100, () => (now += 10));
  const a = log.record({ action: 'a', success: true });
  const b = log.record({ action: 'b', success: true });
  const c = log.record({ action: 'c', success: false });
  const all = log.query();
  assert.equal(all.length, 3);
  // newest first
  assert.equal(all[0].id, c.id);
  assert.equal(all[2].id, a.id);
  // limit caps the result while keeping newest-first order
  const limited = log.query({ limit: 2 });
  assert.equal(limited.length, 2);
  assert.equal(limited[0].id, c.id);
  assert.equal(limited[1].id, b.id);
});

test('AuditLog defaults failed actions to warning severity and filters by success', () => {
  const log = new AuditLog(10, () => 5);
  log.record({ action: 'x', success: true });
  const failed = log.record({ action: 'y', success: false });
  assert.equal(failed.severity, 'warning');
  const onlyFailures = log.query({ success: false });
  assert.equal(onlyFailures.length, 1);
  assert.equal(onlyFailures[0].action, 'y');
});

test('PolicyEngine allows when an allow rule matches', () => {
  const engine = new PolicyEngine([
    {
      id: 'allow-read-tracks',
      effect: 'allow',
      actions: ['read'],
      resourceTypes: ['track'],
    },
  ]);
  const decision = engine.evaluate({
    subject: { id: 'u1', type: 'user' },
    action: 'read',
    resource: { id: 't1', type: 'track' },
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.effect, 'allow');
  assert.equal(decision.matchedRuleId, 'allow-read-tracks');
});

test('PolicyEngine denies by default and lets explicit deny win over allow', () => {
  const engine = new PolicyEngine([
    { id: 'allow-all', effect: 'allow', actions: ['*'], resourceTypes: ['*'] },
    { id: 'deny-delete', effect: 'deny', actions: ['delete'], resourceTypes: ['track'] },
  ]);
  // no rule matches -> default deny
  const empty = new PolicyEngine();
  assert.equal(
    empty.isAllowed({ subject: { id: 'u', type: 'user' }, action: 'read', resource: { id: 'r', type: 'track' } }),
    false,
  );
  // deny precedes allow at equal priority
  const del = engine.evaluate({
    subject: { id: 'u1', type: 'user' },
    action: 'delete',
    resource: { id: 't1', type: 'track' },
  });
  assert.equal(del.allowed, false);
  assert.equal(del.matchedRuleId, 'deny-delete');
});

test('classifyField detects PII categories and protection requirements', () => {
  const email = classifyField('email');
  assert.equal(email.category, 'contact');
  assert.equal(email.sensitivity, 'confidential');
  assert.equal(email.requiresProtection, true);

  const ssn = classifyField('ssn');
  assert.equal(ssn.category, 'governmentId');
  assert.equal(ssn.sensitivity, 'restricted');
  assert.equal(ssn.requiresProtection, true);

  const plain = classifyField('color');
  assert.equal(plain.category, 'none');
  assert.equal(plain.sensitivity, 'public');
  assert.equal(plain.requiresProtection, false);
});
