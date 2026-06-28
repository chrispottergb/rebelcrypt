import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadConfig,
  safeLoadConfig,
  defineSchema,
  f,
  ConfigError,
  parseDatabaseUrl,
  parseRedisUrl,
} from '@music-ai/config';

test('loadConfig coerces strings into their declared types', () => {
  const schema = defineSchema({
    PORT: f.number({ integer: true }),
    DEBUG: f.boolean(),
    NAME: f.string(),
    MODE: f.enum(['dev', 'prod'] as const),
  });
  const cfg = loadConfig(schema, {
    source: { PORT: '8080', DEBUG: 'yes', NAME: 'svc', MODE: 'prod' },
  });
  assert.equal(cfg.PORT, 8080);
  assert.equal(typeof cfg.PORT, 'number');
  assert.equal(cfg.DEBUG, true);
  assert.equal(cfg.NAME, 'svc');
  assert.equal(cfg.MODE, 'prod');
});

test('loadConfig applies defaults and is frozen', () => {
  const schema = defineSchema({
    PORT: f.number({ default: 3000 }),
    HOST: f.string({ default: 'localhost' }),
  });
  const cfg = loadConfig(schema, { source: {} });
  assert.equal(cfg.PORT, 3000);
  assert.equal(cfg.HOST, 'localhost');
  assert.ok(Object.isFrozen(cfg));
});

test('loadConfig aggregates ALL missing required keys into one ConfigError', () => {
  const schema = defineSchema({
    A: f.string(),
    B: f.number(),
    C: f.string({ default: 'ok' }), // has default, should NOT be reported
  });
  let caught: ConfigError | undefined;
  try {
    loadConfig(schema, { source: {} });
  } catch (e) {
    caught = e as ConfigError;
  }
  assert.ok(caught instanceof ConfigError);
  assert.deepEqual(caught!.keys(), ['A', 'B']); // sorted, C excluded
  assert.equal(caught!.issues.length, 2);
  assert.match(caught!.message, /2 issue/);
});

test('loadConfig reports coercion failures (bad number, bad enum)', () => {
  const schema = defineSchema({
    PORT: f.number(),
    MODE: f.enum(['a', 'b'] as const),
  });
  const res = safeLoadConfig(schema, {
    source: { PORT: 'not-a-number', MODE: 'c' },
  });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.deepEqual(res.error.keys(), ['MODE', 'PORT']);
  }
});

test('safeLoadConfig returns ok result when everything validates', () => {
  const schema = defineSchema({ X: f.string() });
  const res = safeLoadConfig(schema, { source: { X: 'hi' } });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.config.X, 'hi');
  }
});

test('parseDatabaseUrl extracts structured parts', () => {
  const parts = parseDatabaseUrl(
    'postgres://user:p%40ss@db.example.com:5432/appdb?sslmode=require',
  );
  assert.equal(parts.protocol, 'postgres:');
  assert.equal(parts.host, 'db.example.com');
  assert.equal(parts.port, 5432);
  assert.equal(parts.user, 'user');
  assert.equal(parts.password, 'p@ss'); // decoded
  assert.equal(parts.database, 'appdb');
  assert.equal(parts.params.sslmode, 'require');
});

test('parseDatabaseUrl defaults the port by scheme and requires a db name', () => {
  const parts = parseDatabaseUrl('postgres://localhost/mydb');
  assert.equal(parts.port, 5432); // default postgres port
  assert.equal(parts.user, undefined);
  assert.throws(
    () => parseDatabaseUrl('postgres://localhost:5432/'),
    ConfigError,
  );
  assert.throws(() => parseDatabaseUrl('::::not a url'), ConfigError);
});

test('parseRedisUrl handles db index, tls and scheme validation', () => {
  const parts = parseRedisUrl('redis://:secret@localhost:6379/2');
  assert.equal(parts.host, 'localhost');
  assert.equal(parts.port, 6379);
  assert.equal(parts.password, 'secret');
  assert.equal(parts.db, 2);
  assert.equal(parts.tls, false);

  const secure = parseRedisUrl('rediss://cache:7000/0');
  assert.equal(secure.tls, true);
  assert.equal(secure.db, 0);

  assert.throws(() => parseRedisUrl('http://localhost/0'), ConfigError);
  assert.throws(() => parseRedisUrl('redis://localhost/-1'), ConfigError);
});
