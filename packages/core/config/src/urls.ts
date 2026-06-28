import { ConfigError } from './errors';

/**
 * Structured components parsed from a DATABASE_URL connection string.
 */
export interface DatabaseUrlParts {
  readonly protocol: string;
  readonly host: string;
  readonly port: number;
  readonly user: string | undefined;
  readonly password: string | undefined;
  /** Database name (leading slash stripped). */
  readonly database: string;
  /** Decoded query parameters (e.g. sslmode, schema). */
  readonly params: Readonly<Record<string, string>>;
}

/**
 * Structured components parsed from a REDIS_URL connection string.
 */
export interface RedisUrlParts {
  readonly protocol: string;
  readonly host: string;
  readonly port: number;
  readonly password: string | undefined;
  readonly username: string | undefined;
  /** Logical database index (path segment), defaulting to 0. */
  readonly db: number;
  /** True when the scheme is `rediss:` (TLS). */
  readonly tls: boolean;
}

const DEFAULT_DB_PORTS: Readonly<Record<string, number>> = {
  'postgres:': 5432,
  'postgresql:': 5432,
  'mysql:': 3306,
  'mariadb:': 3306,
  'mongodb:': 27017,
};

function tryParseUrl(raw: string, key: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError([
      { key, reason: 'is not a valid URL', received: raw },
    ]);
  }
  return url;
}

function readParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    params[k] = v;
  }
  return params;
}

/**
 * Parse a database connection string into typed components.
 *
 * @param raw the connection string, e.g.
 *   `postgres://user:pass@localhost:5432/app?sslmode=require`
 * @param key the config key name used in error reporting.
 * @throws {ConfigError} if the URL is malformed or missing a database name.
 */
export function parseDatabaseUrl(
  raw: string,
  key = 'DATABASE_URL',
): DatabaseUrlParts {
  const url = tryParseUrl(raw, key);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (database === '') {
    throw new ConfigError([
      { key, reason: 'is missing a database name in its path', received: raw },
    ]);
  }

  const fallbackPort = DEFAULT_DB_PORTS[url.protocol] ?? 0;
  const port = url.port === '' ? fallbackPort : Number(url.port);

  return {
    protocol: url.protocol,
    host: url.hostname,
    port,
    user: url.username === '' ? undefined : decodeURIComponent(url.username),
    password:
      url.password === '' ? undefined : decodeURIComponent(url.password),
    database,
    params: Object.freeze(readParams(url)),
  };
}

/**
 * Parse a Redis connection string into typed components.
 *
 * @param raw the connection string, e.g. `redis://:pass@localhost:6379/2`
 * @param key the config key name used in error reporting.
 * @throws {ConfigError} if the URL is malformed or uses a non-redis scheme.
 */
export function parseRedisUrl(raw: string, key = 'REDIS_URL'): RedisUrlParts {
  const url = tryParseUrl(raw, key);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new ConfigError([
      {
        key,
        reason: `expected redis:// or rediss:// scheme, got "${url.protocol}"`,
        received: raw,
      },
    ]);
  }

  const dbSegment = url.pathname.replace(/^\//, '');
  let db = 0;
  if (dbSegment !== '') {
    const parsed = Number(dbSegment);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new ConfigError([
        {
          key,
          reason: `database index "${dbSegment}" must be a non-negative integer`,
          received: raw,
        },
      ]);
    }
    db = parsed;
  }

  const port = url.port === '' ? 6379 : Number(url.port);

  return {
    protocol: url.protocol,
    host: url.hostname,
    port,
    username: url.username === '' ? undefined : decodeURIComponent(url.username),
    password:
      url.password === '' ? undefined : decodeURIComponent(url.password),
    db,
    tls: url.protocol === 'rediss:',
  };
}
