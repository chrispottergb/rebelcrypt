/**
 * @music-ai/config
 *
 * Type-safe, schema-driven configuration loading with validation, coercion,
 * aggregated error reporting and connection-string parsing helpers.
 */
export { ConfigError } from './errors';
export type { ConfigIssue } from './errors';

export { defineSchema, f } from './schema';
export type {
  AnyField,
  BooleanField,
  ConfigFromSchema,
  EnumField,
  FieldKind,
  NumberField,
  ResolvedFieldType,
  Schema,
  StringField,
} from './schema';

export { coerceValue } from './coerce';
export type { CoerceResult } from './coerce';

export { loadConfig, safeLoadConfig } from './loader';
export type {
  ConfigSource,
  LoadOptions,
  SafeLoadResult,
} from './loader';

export { parseDatabaseUrl, parseRedisUrl } from './urls';
export type { DatabaseUrlParts, RedisUrlParts } from './urls';
