/**
 * Core type definitions for the job queue.
 *
 * These types are deliberately transport-agnostic so the same surface can be
 * re-implemented on top of Redis (or any broker) later without callers caring.
 */

/** Lifecycle states a job can move through. */
export type JobStatus =
  | 'waiting' // accepted, not yet eligible to run (may be delayed)
  | 'delayed' // scheduled for a future timestamp
  | 'active' // currently being processed by a worker
  | 'completed' // handler resolved successfully
  | 'failed' // handler threw but attempts remain
  | 'dead' // exhausted all attempts; moved to dead-letter
  | 'cancelled'; // removed before it could run

/** Names of lifecycle events consumers can subscribe to. */
export type JobEvent =
  | 'enqueued'
  | 'active'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'dead'
  | 'cancelled'
  | 'drained';

/** A unit of work tracked by the queue. */
export interface Job<T> {
  /** Globally unique job id. */
  readonly id: string;
  /** Logical queue/topic name this job belongs to. */
  readonly name: string;
  /** Caller-supplied payload. */
  readonly data: T;
  /** Current lifecycle status. */
  status: JobStatus;
  /** Higher number = scheduled before lower numbers. Default 0. */
  readonly priority: number;
  /** Optional dedupe key; while a live job shares it, duplicates are dropped. */
  readonly dedupeKey?: string;
  /** Epoch ms at which the job becomes eligible to run. */
  runAt: number;
  /** How many times the handler has been invoked so far. */
  attempts: number;
  /** Maximum handler invocations before the job is dead-lettered. */
  readonly maxAttempts: number;
  /** Epoch ms when the job was first enqueued. */
  readonly createdAt: number;
  /** Epoch ms when the job last transitioned to `active`. */
  processedAt?: number;
  /** Epoch ms when the job reached a terminal state. */
  finishedAt?: number;
  /** Serialized message from the last failure, if any. */
  lastError?: string;
}

/** Options accepted when enqueuing a single job. */
export interface EnqueueOptions {
  /** Higher runs first. Default 0. */
  priority?: number;
  /** Delay in ms before the job becomes eligible. Default 0. */
  delayMs?: number;
  /** Dedupe key; a second enqueue with a live key is ignored. */
  dedupeKey?: string;
  /** Override the queue-level default attempt cap for this job. */
  maxAttempts?: number;
  /** Provide a stable id (otherwise a random one is generated). */
  id?: string;
}

/** Backoff strategy used to compute retry delays. */
export interface BackoffOptions {
  /** Base delay in ms for the first retry. Default 1000. */
  baseMs?: number;
  /** Multiplier applied per attempt (exponential). Default 2. */
  factor?: number;
  /** Upper bound on a single retry delay in ms. Default 30000. */
  maxMs?: number;
  /** Random jitter fraction in [0,1] applied to each delay. Default 0.1. */
  jitter?: number;
}

/** Queue construction options. */
export interface QueueOptions {
  /** Number of jobs processed concurrently. Default 1. */
  concurrency?: number;
  /** Default attempt cap for jobs that don't override it. Default 3. */
  maxAttempts?: number;
  /** Retry backoff configuration. */
  backoff?: BackoffOptions;
  /** How long a dead-lettered job is retained, in ms. 0 = forever. */
  deadLetterTtlMs?: number;
  /** Injected clock for testability; defaults to Date.now. */
  now?: () => number;
}

/**
 * Handler that processes a job. May be async. Throwing (or rejecting)
 * triggers the retry/backoff path.
 */
export type Worker<T> = (job: Job<T>) => void | Promise<void>;

/**
 * Listener invoked when a lifecycle event fires. Job-scoped events ('enqueued',
 * 'active', 'completed', 'failed', 'retrying', 'dead', 'cancelled') receive the
 * relevant job; queue-scoped events ('drained') receive `undefined`.
 */
export type JobEventListener<T> = (job?: Readonly<Job<T>>) => void;

/** Read-only snapshot of queue counts by status. */
export interface QueueStats {
  waiting: number;
  delayed: number;
  active: number;
  completed: number;
  dead: number;
}
