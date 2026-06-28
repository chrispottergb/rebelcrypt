/**
 * @music-ai/queue
 *
 * In-memory job queue with priority, delay, dedupe, retry/exponential-backoff,
 * dead-letter collection, lifecycle events, concurrency control, and graceful
 * drain/close. The public surface is broker-agnostic so a Redis-backed
 * implementation can be slotted in later.
 */
export { JobQueue } from './queue';
export { computeBackoffDelay, resolveBackoff } from './backoff';
export type { ResolvedBackoff } from './backoff';
export type {
  BackoffOptions,
  EnqueueOptions,
  Job,
  JobEvent,
  JobEventListener,
  JobStatus,
  QueueOptions,
  QueueStats,
  Worker,
} from './types';
