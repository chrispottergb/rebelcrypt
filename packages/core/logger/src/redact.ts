import type { LogBindings, LogValue, SerializedError } from './types';

/**
 * Recursively masks values whose keys match the configured set. Matching is
 * case-insensitive. Returns a new structure; the input is never mutated.
 */
export class Redactor {
  private readonly keys: ReadonlySet<string>;
  private readonly placeholder: string;
  private readonly active: boolean;

  constructor(keys: readonly string[] = [], placeholder = '[REDACTED]') {
    this.keys = new Set(keys.map((k) => k.toLowerCase()));
    this.placeholder = placeholder;
    this.active = this.keys.size > 0;
  }

  /** Whether any redaction keys are configured. */
  get enabled(): boolean {
    return this.active;
  }

  /** Returns a redacted copy of a bindings object. */
  apply(fields: LogBindings): LogBindings {
    if (!this.active) {
      return fields;
    }
    return this.redactObject(fields, new WeakSet<object>());
  }

  private shouldMask(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  private redactValue(value: LogValue, seen: WeakSet<object>): LogValue {
    if (value === null || value === undefined) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item, seen));
    }
    if (typeof value === 'object') {
      return this.redactObject(value as LogBindings, seen);
    }
    return value;
  }

  private redactObject(
    obj: LogBindings,
    seen: WeakSet<object>,
  ): LogBindings {
    // Guard against cyclic references that would otherwise overflow.
    if (seen.has(obj)) {
      return {};
    }
    seen.add(obj);

    const out: LogBindings = {};
    for (const key of Object.keys(obj)) {
      if (this.shouldMask(key)) {
        out[key] = this.placeholder;
        continue;
      }
      out[key] = this.redactValue(obj[key] as LogValue, seen);
    }
    return out;
  }
}

/** Normalizes an unknown thrown value into a serializable error shape. */
export function serializeError(input: unknown, depth = 3): SerializedError {
  if (input instanceof Error) {
    const out: SerializedError = {
      name: input.name,
      message: input.message,
    };
    const mutable = out as { -readonly [K in keyof SerializedError]: SerializedError[K] };
    if (input.stack !== undefined) {
      mutable.stack = input.stack;
    }
    const maybeCode = (input as { code?: unknown }).code;
    if (typeof maybeCode === 'string' || typeof maybeCode === 'number') {
      mutable.code = String(maybeCode);
    }
    const cause = (input as { cause?: unknown }).cause;
    if (cause !== undefined && cause !== null && depth > 0) {
      mutable.cause = serializeError(cause, depth - 1);
    }
    return out;
  }
  return {
    name: 'NonError',
    message: typeof input === 'string' ? input : safeStringify(input),
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
