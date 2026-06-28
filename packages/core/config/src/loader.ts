import { coerceValue } from './coerce';
import { ConfigError, type ConfigIssue } from './errors';
import type { ConfigFromSchema, Schema } from './schema';

/**
 * A read-only source of raw string values. `process.env` satisfies this.
 */
export type ConfigSource = Readonly<Record<string, string | undefined>>;

export interface LoadOptions {
  /**
   * Source record to read from. Defaults to `process.env`.
   */
  readonly source?: ConfigSource;
  /**
   * When true, treat empty strings as absent (so defaults / required logic
   * apply). Defaults to true.
   */
  readonly treatEmptyAsMissing?: boolean;
}

/**
 * Load, validate, coerce and freeze a configuration object from a schema.
 *
 * Collects ALL missing/invalid issues and throws a single {@link ConfigError}
 * rather than failing on the first problem.
 *
 * @throws {ConfigError} if any key is missing (and required, no default) or
 *   fails coercion/validation.
 */
export function loadConfig<S extends Schema>(
  schema: S,
  options: LoadOptions = {},
): Readonly<ConfigFromSchema<S>> {
  const source: ConfigSource = options.source ?? process.env;
  const treatEmptyAsMissing = options.treatEmptyAsMissing ?? true;

  const issues: ConfigIssue[] = [];
  const result: Record<string, string | number | boolean> = {};

  for (const key of Object.keys(schema)) {
    const field = schema[key];
    if (field === undefined) {
      continue;
    }
    const sourceKey = field.env ?? key;
    const rawRead = source[sourceKey];
    const isMissing =
      rawRead === undefined || (treatEmptyAsMissing && rawRead.trim() === '');

    if (isMissing) {
      if (field.default !== undefined) {
        result[key] = field.default;
        continue;
      }
      const required = field.required ?? true;
      if (required) {
        issues.push({
          key: sourceKey,
          reason: field.description
            ? `required but not set (${field.description})`
            : 'required but not set',
        });
      }
      continue;
    }

    const outcome = coerceValue(rawRead, field);
    if (outcome.ok) {
      result[key] = outcome.value;
    } else {
      issues.push({ key: sourceKey, reason: outcome.reason, received: rawRead });
    }
  }

  if (issues.length > 0) {
    // Stable ordering for deterministic error messages.
    issues.sort((a, b) => a.key.localeCompare(b.key));
    throw new ConfigError(issues);
  }

  return Object.freeze(result) as Readonly<ConfigFromSchema<S>>;
}

/**
 * Non-throwing variant. Returns either the typed config or the collected error.
 */
export type SafeLoadResult<S extends Schema> =
  | { readonly ok: true; readonly config: Readonly<ConfigFromSchema<S>> }
  | { readonly ok: false; readonly error: ConfigError };

/**
 * Load config without throwing. Useful for surfacing all issues in a UI or
 * health check without try/catch control flow.
 */
export function safeLoadConfig<S extends Schema>(
  schema: S,
  options: LoadOptions = {},
): SafeLoadResult<S> {
  try {
    return { ok: true, config: loadConfig(schema, options) };
  } catch (err) {
    if (err instanceof ConfigError) {
      return { ok: false, error: err };
    }
    throw err;
  }
}
