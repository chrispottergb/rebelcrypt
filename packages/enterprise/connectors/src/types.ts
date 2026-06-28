/**
 * Core type definitions for the connector framework.
 *
 * These types describe *configuration and capability metadata* for external
 * music-industry systems. They deliberately do not perform live network calls;
 * transport is injected (see {@link FetchLike}) so the framework stays testable
 * and offline-friendly.
 */

/** Logical category of an external system this framework can integrate with. */
export type ConnectorKind = 'dsp' | 'pro' | 'distributor' | 'crm';

/** Discrete capabilities a connector may advertise. */
export type Capability =
  | 'catalog.read'
  | 'catalog.write'
  | 'streams.read'
  | 'royalties.read'
  | 'royalties.report'
  | 'releases.deliver'
  | 'releases.takedown'
  | 'contacts.read'
  | 'contacts.write'
  | 'webhooks.subscribe';

/** Supported authentication strategies. */
export type AuthKind = 'oauth2' | 'apikey';

/** OAuth2 client-credentials / authorization-code configuration. */
export interface OAuth2Config {
  readonly kind: 'oauth2';
  readonly clientId: string;
  /** Reference to a secret in a vault, NOT the raw secret value. */
  readonly clientSecretRef: string;
  readonly tokenUrl: string;
  readonly scopes: readonly string[];
  /** Seconds before expiry at which a token should be proactively refreshed. */
  readonly refreshSkewSeconds: number;
}

/** API-key (header or query) authentication configuration. */
export interface ApiKeyConfig {
  readonly kind: 'apikey';
  /** Reference to the secret in a vault, NOT the raw key value. */
  readonly apiKeyRef: string;
  /** Where the key is placed on outbound requests. */
  readonly placement: 'header' | 'query';
  /** Header or query-parameter name carrying the key. */
  readonly paramName: string;
  /** Optional prefix, e.g. "Bearer " or "Token ". */
  readonly valuePrefix?: string;
}

export type AuthConfig = OAuth2Config | ApiKeyConfig;

/** Token-bucket style rate-limit descriptor advertised by an upstream API. */
export interface RateLimitDescriptor {
  /** Sustained requests permitted per window. */
  readonly requestsPerWindow: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
  /** Maximum burst above the sustained rate. */
  readonly burst: number;
  /** Response header carrying the remaining-quota hint, if any. */
  readonly remainingHeader?: string;
  /** Response header carrying the reset timestamp, if any. */
  readonly resetHeader?: string;
}

/** Exponential-backoff retry policy. */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  /** Multiplier applied to delay after each failed attempt. */
  readonly backoffFactor: number;
  /** Jitter fraction in [0, 1] applied to each computed delay. */
  readonly jitter: number;
  /** HTTP status codes that should trigger a retry. */
  readonly retryableStatuses: readonly number[];
}

/** Static configuration describing how to reach and talk to an upstream. */
export interface ConnectorConfig {
  readonly id: string;
  readonly kind: ConnectorKind;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly auth: AuthConfig;
  readonly capabilities: readonly Capability[];
  readonly rateLimit: RateLimitDescriptor;
  readonly retry: RetryPolicy;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs: number;
}

/** Normalized inbound request the framework hands to a connector. */
export interface NormalizedRequest<TBody = unknown> {
  readonly operation: string;
  readonly path: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly query?: Readonly<Record<string, string | number | boolean>>;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: TBody;
}

/** Normalized response returned by a connector after mapping. */
export interface NormalizedResponse<TData = unknown> {
  readonly ok: boolean;
  readonly status: number;
  readonly data: TData;
  readonly headers: Readonly<Record<string, string>>;
  /** Number of transport attempts actually made (1 = first try succeeded). */
  readonly attempts: number;
}

/** Minimal logger interface; library code never writes to console directly. */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Shape of a fetch-like transport. Compatible with the WHATWG `fetch`. */
export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<TransportResponse>;

/** Minimal subset of a Response object the framework needs. */
export interface TransportResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** A reference to a secret resolved out-of-band (e.g. from a vault). */
export type SecretResolver = (ref: string) => Promise<string>;

/** Descriptor for a recurring or one-shot synchronization job. */
export interface SyncJobDescriptor {
  readonly id: string;
  readonly connectorId: string;
  readonly operation: string;
  /** Cron expression for recurring jobs; absent for one-shot jobs. */
  readonly schedule?: string;
  /** ISO-8601 high-water mark for incremental syncs. */
  readonly cursor?: string;
  readonly direction: 'inbound' | 'outbound';
  readonly enabled: boolean;
}

/** Result of executing a sync job. */
export interface SyncJobResult {
  readonly jobId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly recordsProcessed: number;
  readonly nextCursor?: string;
  readonly errors: readonly string[];
}
