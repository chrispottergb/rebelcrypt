import { RateLimitDescriptor, RetryPolicy } from './types';

/**
 * Sensible default policy presets. Connectors may override any of these in
 * their {@link ConnectorConfig}.
 */

/** Conservative retry policy suitable for most idempotent reads. */
export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 4,
  baseDelayMs: 250,
  maxDelayMs: 8_000,
  backoffFactor: 2,
  jitter: 0.2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/** Aggressive retry policy for low-latency, high-availability upstreams. */
export const FAST_RETRY: RetryPolicy = {
  maxAttempts: 6,
  baseDelayMs: 100,
  maxDelayMs: 3_000,
  backoffFactor: 1.8,
  jitter: 0.3,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/** Typical DSP analytics rate limit (Spotify-like). */
export const DSP_RATE_LIMIT: RateLimitDescriptor = {
  requestsPerWindow: 180,
  windowMs: 60_000,
  burst: 20,
  remainingHeader: 'X-RateLimit-Remaining',
  resetHeader: 'X-RateLimit-Reset',
};

/** Conservative PRO reporting rate limit. */
export const PRO_RATE_LIMIT: RateLimitDescriptor = {
  requestsPerWindow: 30,
  windowMs: 60_000,
  burst: 5,
};

/** Distributor delivery rate limit. */
export const DISTRIBUTOR_RATE_LIMIT: RateLimitDescriptor = {
  requestsPerWindow: 60,
  windowMs: 60_000,
  burst: 10,
  remainingHeader: 'RateLimit-Remaining',
};

/** CRM rate limit (HubSpot-like). */
export const CRM_RATE_LIMIT: RateLimitDescriptor = {
  requestsPerWindow: 100,
  windowMs: 10_000,
  burst: 15,
  remainingHeader: 'X-HubSpot-RateLimit-Remaining',
};
