import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  mapOk,
  mapErr,
  fromThrowable,
} from '@music-ai/types';

test('ok/err construct the right shape', () => {
  const o = ok(42);
  assert.deepEqual(o, { ok: true, value: 42 });
  const e = err('boom');
  assert.deepEqual(e, { ok: false, error: 'boom' });
});

test('isOk / isErr discriminate correctly', () => {
  assert.equal(isOk(ok(1)), true);
  assert.equal(isErr(ok(1)), false);
  assert.equal(isOk(err('x')), false);
  assert.equal(isErr(err('x')), true);
});

test('unwrap returns the value or throws the error', () => {
  assert.equal(unwrap(ok('value')), 'value');
  const boom = new Error('explode');
  assert.throws(() => unwrap(err(boom)), /explode/);
  // non-Error errors are normalized to an Error
  assert.throws(() => unwrap(err('plain string')), /plain string/);
});

test('unwrapOr returns value on Ok and fallback on Err', () => {
  assert.equal(unwrapOr(ok(10), 99), 10);
  assert.equal(unwrapOr(err('nope'), 99), 99);
});

test('mapOk transforms Ok and passes Err through untouched', () => {
  const mapped = mapOk(ok(2), (n: number) => n * 5);
  assert.deepEqual(mapped, { ok: true, value: 10 });
  const e = err('orig');
  assert.equal(mapOk(e, (n: number) => n * 5), e); // same reference returned
});

test('mapErr transforms Err and passes Ok through untouched', () => {
  const mapped = mapErr(err('bad'), (s: string) => s.toUpperCase());
  assert.deepEqual(mapped, { ok: false, error: 'BAD' });
  const o = ok(7);
  assert.equal(mapErr(o, () => 'never'), o);
});

test('fromThrowable captures success and failure as a Result', () => {
  const good = fromThrowable(() => 123);
  assert.deepEqual(good, { ok: true, value: 123 });
  const bad = fromThrowable(() => {
    throw new Error('kaboom');
  });
  assert.equal(isErr(bad), true);
  if (isErr(bad)) {
    assert.match(bad.error.message, /kaboom/);
  }
});
