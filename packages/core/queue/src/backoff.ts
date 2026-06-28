import type { BackoffOptions } from './types';

/** Fully-resolved backoff configuration with defaults applied. */
export interface ResolvedBackoff {
  baseMs: number;
  factor: number;
  maxMs: number;
  jitter: number;
}

const DEFAULT_BACKOFF: ResolvedBackoff = {
  baseMs: 1000,
  factor: 2,
  maxMs: 30_000,
  jitter: 0.1,
};

/** Merge caller-supplied backoff options with sane defaults. */
export function resolveBackoff(opts?: BackoffOptions): ResolvedBackoff {
  return {
    baseMs: opts?.baseMs ?? DEFAULT_BACKOFF.baseMs,
    factor: opts?.factor ?? DEFAULT_BACKOFF.factor,
    maxMs: opts?.maxMs ?? DEFAULT_BACKOFF.maxMs,
    jitter: clamp(opts?.jitter ?? DEFAULT_BACKOFF.jitter, 0, 1),
  };
}

/**
 * Compute the delay (ms) before the next retry for a given attempt count.
 *
 * `attempt` is 1-based: 1 means the first failure (first retry). The delay
 * grows exponentially (base * factor^(attempt-1)), is capped at `maxMs`, and
 * has optional symmetric jitter applied to avoid thundering-herd retries.
 *
 * @param rng injectable random source in [0,1); defaults to Math.random.
 */
export function computeBackoffDelay(
  attempt: number,
  cfg: ResolvedBackoff,
  rng: () => number = Math.random,
): number {
  if (attempt < 1) {
    return 0;
  }
  const raw = cfg.baseMs * Math.pow(cfg.factor, attempt - 1);
  const capped = Math.min(raw, cfg.maxMs);
  if (cfg.jitter <= 0) {
    return Math.round(capped);
  }
  // Symmetric jitter: spread within +/- (jitter * capped).
  const spread = capped * cfg.jitter;
  const offset = (rng() * 2 - 1) * spread;
  return Math.max(0, Math.round(capped + offset));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
