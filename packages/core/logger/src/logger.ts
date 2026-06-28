import { Redactor, serializeError } from './redact';
import { createStreamSink } from './sink';
import {
  LEVEL_RANK,
  type LogBindings,
  type LoggerConfig,
  type LogLevel,
  type LogRecord,
  type LogSink,
  type TimerDone,
} from './types';

/**
 * Internal immutable runtime shared by a root logger and all of its children.
 * Children differ only by their merged bindings and (optionally) name; the
 * sink, clock, redactor, and level threshold are shared by reference.
 */
interface LoggerRuntime {
  readonly sink: LogSink;
  readonly redactor: Redactor;
  readonly now: () => number;
  /** Mutable minimum rank so setLevel on any logger affects the tree. */
  minRank: number;
  level: LogLevel;
}

const DEFAULT_LEVEL: LogLevel = 'info';

/**
 * A structured, leveled logger.
 *
 * Records are JSON objects merged from inherited bindings and per-call fields,
 * filtered by level, optionally redacted, and handed to an injectable sink.
 * Instances are cheap to derive via {@link Logger.child}.
 */
export class Logger {
  private readonly runtime: LoggerRuntime;
  private readonly bindings: LogBindings;
  private readonly nameValue: string | undefined;

  /** @internal Use {@link createLogger} to construct a root logger. */
  constructor(
    runtime: LoggerRuntime,
    bindings: LogBindings,
    name: string | undefined,
  ) {
    this.runtime = runtime;
    this.bindings = bindings;
    this.nameValue = name;
  }

  /** The logical name of this logger, if any. */
  get name(): string | undefined {
    return this.nameValue;
  }

  /** The current minimum emitted level for this logger's tree. */
  get level(): LogLevel {
    return this.runtime.level;
  }

  /**
   * Adjusts the minimum level. Affects this logger and every logger sharing its
   * runtime (root and all descendants), since the threshold is shared.
   */
  setLevel(level: LogLevel): void {
    this.runtime.level = level;
    this.runtime.minRank = LEVEL_RANK[level];
  }

  /** Returns true if a record at `level` would currently be emitted. */
  isLevelEnabled(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= this.runtime.minRank;
  }

  /**
   * Creates a child logger inheriting this logger's bindings, with `bindings`
   * merged on top. An optional `name` overrides the inherited name.
   */
  child(bindings: LogBindings, name?: string): Logger {
    const merged: LogBindings = { ...this.bindings, ...bindings };
    return new Logger(
      this.runtime,
      merged,
      name ?? this.nameValue,
    );
  }

  trace(msg: string, fields?: LogBindings): void {
    this.emit('trace', msg, fields);
  }

  debug(msg: string, fields?: LogBindings): void {
    this.emit('debug', msg, fields);
  }

  info(msg: string, fields?: LogBindings): void {
    this.emit('info', msg, fields);
  }

  warn(msg: string, fields?: LogBindings): void {
    this.emit('warn', msg, fields);
  }

  /**
   * Logs at error level. An optional `error` is normalized and attached under
   * the record's `err` property.
   */
  error(msg: string, error?: unknown, fields?: LogBindings): void {
    this.emit('error', msg, fields, error);
  }

  /** Logs at fatal level. See {@link Logger.error} for `error` handling. */
  fatal(msg: string, error?: unknown, fields?: LogBindings): void {
    this.emit('fatal', msg, fields, error);
  }

  /**
   * Starts a timer. The returned function, when called, logs the elapsed
   * duration (in milliseconds) under a `durationMs` field and returns it.
   *
   * @example
   * const done = log.time('db.query');
   * await query();
   * done({ rows: 42 }); // logs "db.query" with durationMs + rows
   */
  time(label: string, level: LogLevel = 'info'): TimerDone {
    const start = this.runtime.now();
    return (extraFields?: LogBindings, doneLevel?: LogLevel): number => {
      const durationMs = this.runtime.now() - start;
      this.emit(doneLevel ?? level, label, {
        ...extraFields,
        durationMs,
      });
      return durationMs;
    };
  }

  private emit(
    level: LogLevel,
    msg: string,
    fields?: LogBindings,
    error?: unknown,
  ): void {
    const rank = LEVEL_RANK[level];
    if (rank < this.runtime.minRank) {
      return;
    }

    const mergedFields: LogBindings =
      fields === undefined
        ? this.bindings
        : { ...this.bindings, ...fields };

    const finalFields = this.runtime.redactor.enabled
      ? this.runtime.redactor.apply(mergedFields)
      : mergedFields;

    const epochMs = this.runtime.now();
    const record: LogRecord = {
      level,
      levelRank: rank,
      time: new Date(epochMs).toISOString(),
      epochMs,
      msg,
      ...(this.nameValue !== undefined ? { name: this.nameValue } : {}),
      fields: finalFields,
      ...(error !== undefined ? { err: serializeError(error) } : {}),
    };

    this.runtime.sink(record);
  }
}

/**
 * Creates a configured root {@link Logger}.
 *
 * When no `sink` is supplied, a JSON-line sink is built around `stream`
 * (defaulting to a stream backed by `process.stdout`-like behavior is avoided;
 * an explicit stream should be provided in library contexts).
 */
export function createLogger(config: LoggerConfig = {}): Logger {
  const level = config.level ?? DEFAULT_LEVEL;
  const now = config.now ?? Date.now;

  const sink: LogSink =
    config.sink ?? createStreamSink(config.stream ?? voidStream());

  const redactor = new Redactor(
    config.redactKeys ?? [],
    config.redactPlaceholder ?? '[REDACTED]',
  );

  const runtime: LoggerRuntime = {
    sink,
    redactor,
    now,
    minRank: LEVEL_RANK[level],
    level,
  };

  return new Logger(runtime, config.bindings ?? {}, config.name);
}

/**
 * Fallback stream that discards output. Used only when neither a custom sink
 * nor a stream is provided, ensuring the logger never writes to a global
 * console implicitly.
 */
function voidStream(): { write(chunk: string): boolean } {
  return {
    write(_chunk: string): boolean {
      return true;
    },
  };
}
