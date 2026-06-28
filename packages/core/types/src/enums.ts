/**
 * Common platform-wide enumerations. Implemented as `const` objects plus a
 * derived union type so they are both usable as runtime values and as narrow
 * string-literal types (without the pitfalls of TypeScript `enum`).
 */

/** Deployment environment a process is running in. */
export const Environment = {
  Local: 'local',
  Development: 'development',
  Staging: 'staging',
  Production: 'production',
} as const;
export type Environment = (typeof Environment)[keyof typeof Environment];

/** Lifecycle state of an asynchronous job or pipeline run. */
export const JobStatus = {
  Pending: 'pending',
  Queued: 'queued',
  Running: 'running',
  Succeeded: 'succeeded',
  Failed: 'failed',
  Cancelled: 'cancelled',
  Retrying: 'retrying',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

/** Visibility / access scope of a resource. */
export const Visibility = {
  Private: 'private',
  Internal: 'internal',
  Unlisted: 'unlisted',
  Public: 'public',
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

/** Coarse severity level shared by audit events and logs. */
export const Severity = {
  Debug: 'debug',
  Info: 'info',
  Notice: 'notice',
  Warning: 'warning',
  Error: 'error',
  Critical: 'critical',
} as const;
export type Severity = (typeof Severity)[keyof typeof Severity];

/** Sort direction for list / pagination queries. */
export const SortDirection = {
  Asc: 'asc',
  Desc: 'desc',
} as const;
export type SortDirection =
  (typeof SortDirection)[keyof typeof SortDirection];

/** Set of terminal job statuses (no further transitions expected). */
export const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  JobStatus.Succeeded,
  JobStatus.Failed,
  JobStatus.Cancelled,
]);

/** Whether a job status represents a final, non-transitioning state. */
export const isTerminalJobStatus = (status: JobStatus): boolean =>
  TERMINAL_JOB_STATUSES.has(status);
