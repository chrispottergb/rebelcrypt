import { createHash } from 'node:crypto';

/**
 * Deterministic hashing helpers used for stable bucketing (A/B assignment,
 * referral attribution). The same input always maps to the same bucket,
 * independent of process or machine.
 */

/** Returns a stable 32-bit unsigned integer derived from the key + salt. */
export function hash32(key: string, salt = ''): number {
  const digest = createHash('sha256').update(`${salt}:${key}`).digest();
  // Read the first 4 bytes as a big-endian unsigned int.
  return digest.readUInt32BE(0);
}

/** Maps a key deterministically to a float in [0, 1). */
export function hashUnitInterval(key: string, salt = ''): number {
  return hash32(key, salt) / 0x1_0000_0000;
}

/** Maps a key deterministically to an integer in [0, buckets). */
export function hashBucket(key: string, buckets: number, salt = ''): number {
  if (!Number.isInteger(buckets) || buckets <= 0) {
    throw new RangeError(`buckets must be a positive integer, got ${buckets}`);
  }
  return hash32(key, salt) % buckets;
}
