import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JobQueue } from '@music-ai/queue';

/**
 * The queue's internal timers call `.unref()` so they never keep the process
 * alive on their own. When the only pending work is an unref'd timer, Node's
 * test runner can decide the event loop is "done" and tear the test down before
 * our completion promise settles. `keepAlive` holds a ref'd timer open while we
 * await queue activity, then clears it.
 */
async function keepAlive<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  const ticker = setInterval(() => {}, 50); // ref'd: keeps the loop alive
  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => reject(new Error('keepAlive timeout')), ms);
    t.unref();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearInterval(ticker);
  }
}

test('enqueue + worker processes a job to completion', async () => {
  const q = new JobQueue<{ n: number }>('process-test');
  const processed: number[] = [];

  const done = new Promise<void>((resolve) => {
    q.on('completed', (job) => {
      processed.push((job!.data as { n: number }).n);
      resolve();
    });
  });

  q.process(async (job) => {
    await Promise.resolve();
    void job;
  });

  const job = q.enqueue({ n: 7 });
  assert.equal(job.status, 'waiting');
  assert.equal(job.attempts, 0);

  await keepAlive(done);
  assert.deepEqual(processed, [7]);
  assert.equal(q.stats().completed, 1);
  assert.equal(q.stats().active, 0);
  await keepAlive(q.close());
});

test('multiple jobs all complete and drain resolves', async () => {
  const q = new JobQueue<number>('drain-test', { concurrency: 2 });
  const seen: number[] = [];
  q.process(async (job) => {
    seen.push(job.data);
  });
  q.enqueue(1);
  q.enqueue(2);
  q.enqueue(3);
  await keepAlive(q.drain());
  assert.equal(q.stats().completed, 3);
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
  await keepAlive(q.close());
});

test('failing job retries and lands in dead-letter after max attempts', async () => {
  // Tiny backoff so retries fire almost immediately.
  const q = new JobQueue<string>('retry-test', {
    maxAttempts: 3,
    backoff: { baseMs: 1, factor: 1, maxMs: 5, jitter: 0 },
  });

  let attempts = 0;
  const dead = new Promise<any>((resolve) => {
    q.on('dead', (job) => resolve(job));
  });

  q.process(async () => {
    attempts += 1;
    throw new Error('always fails');
  });

  q.enqueue('payload');

  const deadJob = await keepAlive(dead);
  assert.equal(attempts, 3); // exactly maxAttempts invocations
  assert.equal(deadJob.status, 'dead');
  assert.equal(deadJob.attempts, 3);
  assert.match(deadJob.lastError, /always fails/);

  const letters = q.getDeadLetters();
  assert.equal(letters.length, 1);
  assert.equal(q.stats().dead, 1);
  assert.equal(q.stats().completed, 0);
  await keepAlive(q.close());
});

test('a job that recovers before exhausting attempts completes', async () => {
  const q = new JobQueue<string>('recover-test', {
    maxAttempts: 5,
    backoff: { baseMs: 1, factor: 1, maxMs: 5, jitter: 0 },
  });

  let calls = 0;
  const completed = new Promise<void>((resolve) => {
    q.on('completed', () => resolve());
  });

  q.process(async () => {
    calls += 1;
    if (calls < 3) {
      throw new Error('transient');
    }
  });

  q.enqueue('payload');
  await keepAlive(completed);
  assert.equal(calls, 3);
  assert.equal(q.stats().completed, 1);
  assert.equal(q.stats().dead, 0);
  await keepAlive(q.close());
});

test('dedupeKey drops duplicate live enqueues', async () => {
  const q = new JobQueue<string>('dedupe-test');
  // No worker registered yet, so jobs stay pending and dedupe is observable.
  const a = q.enqueue('x', { dedupeKey: 'k1' });
  const b = q.enqueue('y', { dedupeKey: 'k1' });
  assert.equal(a.id, b.id); // second enqueue returns the existing job
  assert.equal(q.stats().waiting, 1);

  // Register a worker so the queued job can drain; without one, drain() would
  // never make progress (schedule() is a no-op until a worker exists).
  const completed = new Promise<void>((resolve) => q.on('completed', () => resolve()));
  q.process(async () => {});
  await keepAlive(completed);
  assert.equal(q.stats().completed, 1); // only the deduped job ran, not two
  await keepAlive(q.close());
});
