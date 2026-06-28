import { randomUUID } from 'node:crypto';
import { computeBackoffDelay, resolveBackoff, type ResolvedBackoff } from './backoff';
import type {
  EnqueueOptions,
  Job,
  JobEvent,
  JobEventListener,
  QueueOptions,
  QueueStats,
  Worker,
} from './types';

interface ResolvedQueueOptions {
  concurrency: number;
  maxAttempts: number;
  backoff: ResolvedBackoff;
  deadLetterTtlMs: number;
  now: () => number;
}

/**
 * An in-memory `JobQueue`.
 *
 * Designed so a Redis-backed implementation can satisfy the same public API:
 * `enqueue`, `process`, `on`, `drain`, `close`, plus the inspection helpers.
 * All scheduling is driven by an internal timer + a tick loop that honours
 * priority, delay and concurrency.
 */
export class JobQueue<T> {
  private readonly name: string;
  private readonly opts: ResolvedQueueOptions;

  /** Jobs waiting or delayed, kept in a single list and sorted on demand. */
  private readonly pending: Array<Job<T>> = [];
  /** Currently running jobs keyed by id. */
  private readonly active = new Map<string, Job<T>>();
  /** Terminal dead-lettered jobs keyed by id. */
  private readonly deadLetter = new Map<string, Job<T>>();
  /** Live dedupe keys -> job id, cleared when the job reaches a terminal state. */
  private readonly dedupeIndex = new Map<string, string>();

  private completedCount = 0;
  private worker?: Worker<T>;
  private listeners = new Map<JobEvent, Set<JobEventListener<T>>>();

  private timer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private draining = false;
  private drainWaiters: Array<() => void> = [];

  constructor(name: string, options: QueueOptions = {}) {
    this.name = name;
    this.opts = {
      concurrency: Math.max(1, options.concurrency ?? 1),
      maxAttempts: Math.max(1, options.maxAttempts ?? 3),
      backoff: resolveBackoff(options.backoff),
      deadLetterTtlMs: Math.max(0, options.deadLetterTtlMs ?? 0),
      now: options.now ?? Date.now,
    };
  }

  /** Register the single worker function and start the processing loop. */
  process(worker: Worker<T>): void {
    if (this.worker) {
      throw new Error(`Queue "${this.name}" already has a worker registered`);
    }
    this.assertOpen();
    this.worker = worker;
    this.schedule(0);
  }

  /**
   * Enqueue a job. Returns the created job, or the existing live job when a
   * dedupe key collides (in which case nothing new is scheduled).
   */
  enqueue(data: T, options: EnqueueOptions = {}): Job<T> {
    this.assertOpen();
    if (this.draining) {
      throw new Error(`Queue "${this.name}" is draining; enqueue rejected`);
    }

    if (options.dedupeKey) {
      const existingId = this.dedupeIndex.get(options.dedupeKey);
      if (existingId) {
        const existing = this.findLiveJob(existingId);
        if (existing) {
          return existing;
        }
        this.dedupeIndex.delete(options.dedupeKey);
      }
    }

    const now = this.opts.now();
    const delayMs = Math.max(0, options.delayMs ?? 0);
    const runAt = now + delayMs;
    const job: Job<T> = {
      id: options.id ?? randomUUID(),
      name: this.name,
      data,
      status: delayMs > 0 ? 'delayed' : 'waiting',
      priority: options.priority ?? 0,
      ...(options.dedupeKey !== undefined ? { dedupeKey: options.dedupeKey } : {}),
      runAt,
      attempts: 0,
      maxAttempts: Math.max(1, options.maxAttempts ?? this.opts.maxAttempts),
      createdAt: now,
    };

    this.pending.push(job);
    if (options.dedupeKey) {
      this.dedupeIndex.set(options.dedupeKey, job.id);
    }
    this.emit('enqueued', job);
    this.schedule(0);
    return job;
  }

  /** Subscribe to a lifecycle event. Returns an unsubscribe function. */
  on(event: JobEvent, listener: JobEventListener<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /** Cancel a pending (not-yet-active) job by id. Returns true if removed. */
  cancel(id: string): boolean {
    const idx = this.pending.findIndex((j) => j.id === id);
    if (idx === -1) {
      return false;
    }
    const [job] = this.pending.splice(idx, 1);
    if (!job) {
      return false;
    }
    job.status = 'cancelled';
    job.finishedAt = this.opts.now();
    this.releaseDedupe(job);
    this.emit('cancelled', job);
    return true;
  }

  /** Snapshot of current queue counts. */
  stats(): QueueStats {
    let waiting = 0;
    let delayed = 0;
    for (const job of this.pending) {
      if (job.status === 'delayed') {
        delayed += 1;
      } else {
        waiting += 1;
      }
    }
    return {
      waiting,
      delayed,
      active: this.active.size,
      completed: this.completedCount,
      dead: this.deadLetter.size,
    };
  }

  /** Read-only view of dead-lettered jobs. */
  getDeadLetters(): ReadonlyArray<Readonly<Job<T>>> {
    return [...this.deadLetter.values()];
  }

  /** Re-enqueue a dead-lettered job for another round of attempts. */
  retryDead(id: string): Job<T> | undefined {
    const job = this.deadLetter.get(id);
    if (!job) {
      return undefined;
    }
    this.deadLetter.delete(id);
    return this.enqueue(job.data, {
      priority: job.priority,
      maxAttempts: job.maxAttempts,
    });
  }

  /**
   * Wait until every pending and active job has reached a terminal state.
   * New enqueues are rejected while draining. Resolves immediately if idle.
   */
  async drain(): Promise<void> {
    this.draining = true;
    this.schedule(0);
    if (this.isIdle()) {
      this.draining = false;
      this.emit('drained');
      return;
    }
    await new Promise<void>((resolve) => {
      this.drainWaiters.push(resolve);
    });
  }

  /**
   * Gracefully drain then stop the queue. After close, the instance rejects
   * further enqueue/process calls.
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    await this.drain();
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.listeners.clear();
  }

  // ---- internals -------------------------------------------------------

  private isIdle(): boolean {
    return this.active.size === 0 && this.pending.length === 0;
  }

  private findLiveJob(id: string): Job<T> | undefined {
    return this.active.get(id) ?? this.pending.find((j) => j.id === id);
  }

  private releaseDedupe(job: Job<T>): void {
    if (job.dedupeKey && this.dedupeIndex.get(job.dedupeKey) === job.id) {
      this.dedupeIndex.delete(job.dedupeKey);
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error(`Queue "${this.name}" is closed`);
    }
  }

  /** (Re)arm the tick timer to fire after `delay` ms, coalescing timers. */
  private schedule(delay: number): void {
    if (this.closed || !this.worker) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.tick();
    }, Math.max(0, delay));
    // Don't keep the event loop alive solely for the queue timer.
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  /** One scheduling pass: promote delayed jobs and dispatch eligible work. */
  private tick(): void {
    if (this.closed || !this.worker) {
      return;
    }
    const now = this.opts.now();

    // Promote delayed jobs whose time has come.
    for (const job of this.pending) {
      if (job.status === 'delayed' && job.runAt <= now) {
        job.status = 'waiting';
      }
    }

    // Dispatch as many ready jobs as concurrency allows, highest priority and
    // earliest createdAt first.
    while (this.active.size < this.opts.concurrency) {
      const next = this.takeNextReady(now);
      if (!next) {
        break;
      }
      void this.run(next);
    }

    this.maybeResolveDrain();
    this.armNextDelayTimer(now);
  }

  /** Remove and return the highest-priority ready job, or undefined. */
  private takeNextReady(now: number): Job<T> | undefined {
    let bestIdx = -1;
    let best: Job<T> | undefined;
    for (let i = 0; i < this.pending.length; i += 1) {
      const job = this.pending[i];
      if (!job || job.status !== 'waiting' || job.runAt > now) {
        continue;
      }
      if (
        !best ||
        job.priority > best.priority ||
        (job.priority === best.priority && job.createdAt < best.createdAt)
      ) {
        best = job;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      return undefined;
    }
    this.pending.splice(bestIdx, 1);
    return best;
  }

  /** Arm a timer for the soonest delayed job so it wakes on time. */
  private armNextDelayTimer(now: number): void {
    if (this.timer) {
      return;
    }
    let soonest = Infinity;
    for (const job of this.pending) {
      if (job.status === 'delayed' && job.runAt < soonest) {
        soonest = job.runAt;
      }
    }
    if (soonest !== Infinity) {
      this.schedule(Math.max(0, soonest - now));
    }
  }

  /** Execute a job through the worker, handling success/failure transitions. */
  private async run(job: Job<T>): Promise<void> {
    const worker = this.worker;
    if (!worker) {
      this.pending.push(job);
      return;
    }
    job.status = 'active';
    job.attempts += 1;
    job.processedAt = this.opts.now();
    this.active.set(job.id, job);
    this.emit('active', job);

    try {
      await worker(job);
      this.onSuccess(job);
    } catch (err) {
      this.onFailure(job, err);
    } finally {
      this.active.delete(job.id);
      // Keep draining/processing moving after a slot frees up.
      this.schedule(0);
    }
  }

  private onSuccess(job: Job<T>): void {
    job.status = 'completed';
    job.finishedAt = this.opts.now();
    this.completedCount += 1;
    this.releaseDedupe(job);
    this.emit('completed', job);
  }

  private onFailure(job: Job<T>, err: unknown): void {
    job.lastError = err instanceof Error ? err.message : String(err);
    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
      job.finishedAt = this.opts.now();
      this.releaseDedupe(job);
      this.deadLetter.set(job.id, job);
      this.scheduleDeadLetterEviction(job.id);
      this.emit('dead', job);
      return;
    }
    const delay = computeBackoffDelay(job.attempts, this.opts.backoff);
    job.status = 'delayed';
    job.runAt = this.opts.now() + delay;
    this.emit('failed', job);
    this.pending.push(job);
    this.emit('retrying', job);
  }

  private scheduleDeadLetterEviction(id: string): void {
    if (this.opts.deadLetterTtlMs <= 0) {
      return;
    }
    const t = setTimeout(() => {
      this.deadLetter.delete(id);
    }, this.opts.deadLetterTtlMs);
    if (typeof t.unref === 'function') {
      t.unref();
    }
  }

  private maybeResolveDrain(): void {
    if (!this.draining || !this.isIdle()) {
      return;
    }
    this.draining = false;
    const waiters = this.drainWaiters;
    this.drainWaiters = [];
    this.emit('drained');
    for (const resolve of waiters) {
      resolve();
    }
  }

  private emit(event: JobEvent, job?: Job<T>): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      return;
    }
    for (const listener of set) {
      try {
        listener(job);
      } catch {
        // Listener errors must never break the queue loop.
      }
    }
  }
}
