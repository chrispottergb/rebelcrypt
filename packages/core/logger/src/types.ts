/**
 * Core type definitions for the structured logger.
 */

/** Ordered set of severity levels supported by the logger. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Numeric severity ranking. Higher numbers indicate more severe events.
 * Used for level filtering: a record is emitted only when its level's
 * rank is >= the configured minimum level's rank.
 */
export const LEVEL_RANK: Readonly<Record<LogLevel, number>> = Object.freeze({
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
});

/** A JSON-serializable value usable as structured log context. */
export type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogValue[]
  | { [key: string]: LogValue };

/** Arbitrary structured fields attached to a log record. */
export type LogBindings = Record<string, LogValue>;

/**
 * A fully assembled log record handed to a {@link LogSink}. Already merged
 * with inherited bindings, timestamped, and (if configured) redacted.
 */
export interface LogRecord {
  /** Severity level of this record. */
  readonly level: LogLevel;
  /** Numeric rank of {@link level} for downstream filtering/routing. */
  readonly levelRank: number;
  /** ISO-8601 timestamp of when the record was created. */
  readonly time: string;
  /** Epoch milliseconds, useful for ordering without parsing. */
  readonly epochMs: number;
  /** Human-readable message. */
  readonly msg: string;
  /** Logical name of the logger (e.g. service or module). */
  readonly name?: string;
  /** Merged structured context (bindings + per-call fields). */
  readonly fields: LogBindings;
  /** Optional serialized error details. */
  readonly err?: SerializedError;
}

/** Normalized representation of an Error for JSON output. */
export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly code?: string;
  readonly cause?: SerializedError;
}

/**
 * Minimal subset of Node's WritableStream needed to emit log lines.
 * Decouples the logger from a concrete stream implementation.
 */
export interface WritableLike {
  write(chunk: string): unknown;
}

/**
 * A sink consumes finished log records. Implementors decide how to format
 * and where to deliver them. The default sink JSON-serializes records and
 * writes them to a {@link WritableLike}.
 */
export type LogSink = (record: LogRecord) => void;

/** Configuration accepted by {@link LogFactory} / createLogger. */
export interface LoggerConfig {
  /** Minimum level to emit. Defaults to 'info'. */
  level?: LogLevel;
  /** Logical name for the root logger. */
  name?: string;
  /** Base bindings merged into every record. */
  bindings?: LogBindings;
  /** Destination stream for the default sink. Ignored when `sink` is set. */
  stream?: WritableLike;
  /** Custom sink. Overrides the default stream-based sink when provided. */
  sink?: LogSink;
  /**
   * Field keys (case-insensitive) whose values should be masked before
   * emission. Applied recursively across nested objects and arrays.
   */
  redactKeys?: readonly string[];
  /** Replacement string for redacted values. Defaults to '[REDACTED]'. */
  redactPlaceholder?: string;
  /** Injectable clock, primarily for deterministic testing. */
  now?: () => number;
}

/** Handle returned by {@link Logger.time}. Call to record elapsed duration. */
export type TimerDone = (extraFields?: LogBindings, level?: LogLevel) => number;
