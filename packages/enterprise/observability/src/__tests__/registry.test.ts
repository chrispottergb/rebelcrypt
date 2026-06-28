import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MetricsRegistry } from '@music-ai/observability';

test('counter increments and is queryable by value', () => {
  const reg = new MetricsRegistry();
  const c = reg.counter({ name: 'requests_total', help: 'total requests' });
  assert.equal(c.get(), 0);
  c.inc();
  c.inc({}, 4);
  assert.equal(c.get(), 5);
  assert.equal(reg.size, 1);
});

test('counter tracks separate series per label set', () => {
  const reg = new MetricsRegistry();
  const c = reg.counter({ name: 'http_requests_total', help: 'http', labelNames: ['method'] });
  c.inc({ method: 'GET' }, 3);
  c.inc({ method: 'POST' });
  assert.equal(c.get({ method: 'GET' }), 3);
  assert.equal(c.get({ method: 'POST' }), 1);
  assert.equal(c.get({ method: 'DELETE' }), 0);
});

test('counter rejects negative increments and unknown labels', () => {
  const reg = new MetricsRegistry();
  const c = reg.counter({ name: 'errors_total', help: 'errors', labelNames: ['code'] });
  assert.throws(() => c.inc({}, -1));
  assert.throws(() => c.inc({ bogus: 'x' }));
});

test('render produces valid Prometheus text with HELP, TYPE, name and value', () => {
  const reg = new MetricsRegistry('musicai');
  const c = reg.counter({ name: 'plays_total', help: 'tracks played', labelNames: ['region'] });
  c.inc({ region: 'us' }, 7);
  const text = reg.render();
  // prefix is applied to the metric name
  assert.match(text, /# HELP musicai_plays_total tracks played/);
  assert.match(text, /# TYPE musicai_plays_total counter/);
  // sample line with rendered labels and value
  assert.match(text, /musicai_plays_total\{region="us"\} 7/);
  // output ends with a trailing newline
  assert.ok(text.endsWith('\n'));
});

test('empty registry renders to an empty string', () => {
  const reg = new MetricsRegistry();
  assert.equal(reg.render(), '');
});
