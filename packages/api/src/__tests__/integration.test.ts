import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server';
import { createHttpServer, type HttpServer } from '../http/server';

let http: HttpServer;
let base: string;

before(async () => {
  const app = createApp({ jwtSecret: 'integration-secret', corsOrigins: ['*'] });
  http = createHttpServer({
    routes: app.routes,
    jwtSecret: app.config.jwtSecret,
    corsOrigins: app.config.corsOrigins,
  });
  await http.listen(0, '127.0.0.1');
  const addr = http.server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}/api/v1`;
});

after(async () => {
  await http.close();
});

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

test('health endpoint is public and reports ok', async () => {
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.json.status, 'ok');
});

test('protected route rejects unauthenticated requests', async () => {
  const res = await req('GET', '/auth/me');
  assert.equal(res.status, 401);
});

test('unknown route returns 404', async () => {
  const res = await req('GET', '/does-not-exist');
  assert.equal(res.status, 404);
});

test('full auth flow: register -> login -> access protected resource', async () => {
  const reg = await req('POST', '/auth/register', {
    email: 'it@example.com',
    password: 'pw123',
    tenantId: 'acme',
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.email, 'it@example.com');

  // duplicate registration is rejected
  const dup = await req('POST', '/auth/register', { email: 'it@example.com', password: 'x' });
  assert.equal(dup.status, 400);

  const login = await req('POST', '/auth/login', { email: 'it@example.com', password: 'pw123' });
  assert.equal(login.status, 200);
  assert.ok(login.json.accessToken);
  const token = login.json.accessToken as string;

  // wrong password fails
  const bad = await req('POST', '/auth/login', { email: 'it@example.com', password: 'nope' });
  assert.equal(bad.status, 401);

  const me = await req('GET', '/auth/me', undefined, token);
  assert.equal(me.status, 200);
  assert.equal(me.json.tenantId, 'acme');
});

test('genres endpoint serves the real registry', async () => {
  const login = await req('POST', '/auth/login', { email: 'it@example.com', password: 'pw123' });
  const token = login.json.accessToken as string;
  const res = await req('GET', '/genres', undefined, token);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
  assert.ok(res.json.length > 10);
});

test('track CRUD lifecycle', async () => {
  const login = await req('POST', '/auth/login', { email: 'it@example.com', password: 'pw123' });
  const token = login.json.accessToken as string;

  const create = await req('POST', '/tracks', { title: 'Test Track', genre: 'rock' }, token);
  assert.equal(create.status, 201);
  const id = create.json.id as string;

  const get = await req('GET', `/tracks/${id}`, undefined, token);
  assert.equal(get.status, 200);
  assert.equal(get.json.title, 'Test Track');

  const missingTitle = await req('POST', '/tracks', { genre: 'rock' }, token);
  assert.equal(missingTitle.status, 400);

  const del = await req('DELETE', `/tracks/${id}`, undefined, token);
  assert.equal(del.status, 200);

  const gone = await req('GET', `/tracks/${id}`, undefined, token);
  assert.equal(gone.status, 404);
});

test('workflow execute returns a completed run', async () => {
  const login = await req('POST', '/auth/login', { email: 'it@example.com', password: 'pw123' });
  const token = login.json.accessToken as string;

  const wf = await req('POST', '/workflows', { name: 'IT WF', nodes: [{ type: 'llm.generate' }] }, token);
  assert.equal(wf.status, 201);
  const run = await req('POST', `/workflows/${wf.json.id}/execute`, {}, token);
  assert.equal(run.status, 201);
  assert.equal(run.json.status, 'completed');
  assert.equal(run.json.steps.length, 1);
});

test('royalty split math is correct', async () => {
  const login = await req('POST', '/auth/login', { email: 'it@example.com', password: 'pw123' });
  const token = login.json.accessToken as string;
  const res = await req(
    'POST',
    '/royalties/calculate',
    { amount: 1000, splits: [{ holder: 'artist', percent: 70 }, { holder: 'label', percent: 30 }] },
    token,
  );
  assert.equal(res.status, 200);
  assert.equal(res.json.total, 1000);
  assert.equal(res.json.lines[0].amount, 700);
  assert.equal(res.json.lines[1].amount, 300);
});

test('mutating requests are recorded in the governance audit log', async () => {
  const login = await req('POST', '/auth/login', { email: 'it@example.com', password: 'pw123' });
  const token = login.json.accessToken as string;
  const res = await req('GET', '/admin/audit-logs', undefined, token);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json));
  assert.ok(res.json.length > 0);
  // newest-first: most recent entry should be this very listing's precursor activity
  assert.ok(res.json.some((e: any) => e.action === 'auth.login'));
});

test('prometheus metrics endpoint exposes counters', async () => {
  const res = await fetch(`${base}/metrics`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /http_requests_total/);
  assert.match(text, /# TYPE http_requests_total counter/);
});
