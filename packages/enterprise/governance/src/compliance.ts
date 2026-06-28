import type { Clock } from './audit-log';

/** Categories used to classify the sensitivity of a data field. */
export type PiiCategory =
  | 'none'
  | 'directIdentifier'
  | 'contact'
  | 'financial'
  | 'governmentId'
  | 'biometric'
  | 'location'
  | 'behavioral';

/** Sensitivity tiers derived from a {@link PiiCategory}. */
export type SensitivityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

/** Result of classifying a single field. */
export interface FieldClassification {
  readonly field: string;
  readonly category: PiiCategory;
  readonly sensitivity: SensitivityLevel;
  /** Whether the value should be masked/encrypted at rest. */
  readonly requiresProtection: boolean;
}

interface PiiRule {
  readonly category: PiiCategory;
  readonly patterns: readonly RegExp[];
}

const SENSITIVITY_BY_CATEGORY: Readonly<Record<PiiCategory, SensitivityLevel>> = {
  none: 'public',
  behavioral: 'internal',
  location: 'confidential',
  contact: 'confidential',
  directIdentifier: 'confidential',
  financial: 'restricted',
  governmentId: 'restricted',
  biometric: 'restricted',
};

const PII_RULES: readonly PiiRule[] = [
  { category: 'governmentId', patterns: [/ssn/i, /passport/i, /national.?id/i, /tax.?id/i] },
  { category: 'financial', patterns: [/card.?number/i, /iban/i, /account.?number/i, /routing/i, /payout/i] },
  { category: 'biometric', patterns: [/fingerprint/i, /face.?(id|print)/i, /voiceprint/i, /retina/i] },
  { category: 'contact', patterns: [/e-?mail/i, /phone/i, /mobile/i, /address/i, /postal/i, /zip/i] },
  { category: 'location', patterns: [/lat(itude)?$/i, /long(itude)?$/i, /geo/i, /coordinates?/i, /ip.?address/i] },
  { category: 'directIdentifier', patterns: [/full.?name/i, /first.?name/i, /last.?name/i, /username/i, /^name$/i, /dob/i, /birth/i] },
  { category: 'behavioral', patterns: [/listening.?history/i, /play.?count/i, /preferences?/i, /activity/i] },
];

/**
 * Heuristic, name-based PII classifier. Maps a field name to a
 * {@link PiiCategory} and derives its {@link SensitivityLevel}. Intended as a
 * first-pass guard rail, not a substitute for a data catalog.
 */
export function classifyField(field: string): FieldClassification {
  let category: PiiCategory = 'none';
  for (const rule of PII_RULES) {
    if (rule.patterns.some((p) => p.test(field))) {
      category = rule.category;
      break;
    }
  }
  const sensitivity = SENSITIVITY_BY_CATEGORY[category];
  return {
    field,
    category,
    sensitivity,
    requiresProtection: sensitivity === 'confidential' || sensitivity === 'restricted',
  };
}

/** Classifies every key of a record, returning one entry per field. */
export function classifyRecord(record: Readonly<Record<string, unknown>>): readonly FieldClassification[] {
  return Object.keys(record).map(classifyField);
}

/** A declarative data-retention policy for a class of records. */
export interface RetentionPolicy {
  /** Logical data class, e.g. "listening-events". */
  readonly dataClass: string;
  /** Maximum age before a record must be deleted, in days. */
  readonly retentionDays: number;
  /** When true, expired records may be anonymized instead of deleted. */
  readonly allowAnonymization?: boolean;
}

/** Outcome of a retention check for a single record. */
export interface RetentionEvaluation {
  readonly dataClass: string;
  readonly ageDays: number;
  readonly expired: boolean;
  readonly recommendedAction: 'retain' | 'anonymize' | 'delete';
}

/**
 * Evaluates whether a record created at `createdAt` has exceeded the retention
 * window defined by `policy`, relative to `now`.
 */
export function evaluateRetention(
  policy: RetentionPolicy,
  createdAt: number,
  now: number = Date.now(),
): RetentionEvaluation {
  const ageMs = Math.max(0, now - createdAt);
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const expired = ageDays > policy.retentionDays;
  let recommendedAction: RetentionEvaluation['recommendedAction'] = 'retain';
  if (expired) {
    recommendedAction = policy.allowAnonymization ? 'anonymize' : 'delete';
  }
  return { dataClass: policy.dataClass, ageDays, expired, recommendedAction };
}

/** A recorded consent grant for a (subject, purpose) pair. */
export interface ConsentGrant {
  readonly subjectId: string;
  /** Purpose of processing, e.g. "marketing", "model-training". */
  readonly purpose: string;
  readonly grantedAt: number;
  /** Optional expiry; when set and passed, consent is treated as withdrawn. */
  readonly expiresAt?: number;
  readonly revokedAt?: number;
}

/** The active/inactive status of a consent lookup. */
export interface ConsentStatus {
  readonly granted: boolean;
  readonly reason: 'active' | 'absent' | 'revoked' | 'expired';
  readonly grant?: ConsentGrant;
}

/**
 * In-memory registry tracking subject consent per processing purpose. Supports
 * idempotent grant/revoke and expiry-aware lookups.
 */
export class ConsentRegistry {
  private readonly grants = new Map<string, ConsentGrant>();
  private readonly clock: Clock;

  constructor(clock: Clock = Date.now) {
    this.clock = clock;
  }

  /** Records (or refreshes) consent. Re-granting clears any prior revocation. */
  grant(subjectId: string, purpose: string, expiresAt?: number): ConsentGrant {
    const grant: ConsentGrant = {
      subjectId,
      purpose,
      grantedAt: this.clock(),
      expiresAt,
    };
    this.grants.set(ConsentRegistry.key(subjectId, purpose), grant);
    return grant;
  }

  /** Marks consent as revoked; returns false if no grant existed. */
  revoke(subjectId: string, purpose: string): boolean {
    const key = ConsentRegistry.key(subjectId, purpose);
    const existing = this.grants.get(key);
    if (existing === undefined || existing.revokedAt !== undefined) {
      return false;
    }
    this.grants.set(key, { ...existing, revokedAt: this.clock() });
    return true;
  }

  /** Resolves the current consent status for a (subject, purpose) pair. */
  check(subjectId: string, purpose: string): ConsentStatus {
    const grant = this.grants.get(ConsentRegistry.key(subjectId, purpose));
    if (grant === undefined) {
      return { granted: false, reason: 'absent' };
    }
    if (grant.revokedAt !== undefined) {
      return { granted: false, reason: 'revoked', grant };
    }
    if (grant.expiresAt !== undefined && this.clock() > grant.expiresAt) {
      return { granted: false, reason: 'expired', grant };
    }
    return { granted: true, reason: 'active', grant };
  }

  /** Boolean convenience over {@link check}. */
  hasConsent(subjectId: string, purpose: string): boolean {
    return this.check(subjectId, purpose).granted;
  }

  /** All active (non-revoked, non-expired) grants for a subject. */
  activePurposes(subjectId: string): readonly string[] {
    const now = this.clock();
    const out: string[] = [];
    for (const grant of this.grants.values()) {
      if (grant.subjectId !== subjectId || grant.revokedAt !== undefined) {
        continue;
      }
      if (grant.expiresAt !== undefined && now > grant.expiresAt) {
        continue;
      }
      out.push(grant.purpose);
    }
    return out;
  }

  private static key(subjectId: string, purpose: string): string {
    return `${encodeURIComponent(subjectId)}::${encodeURIComponent(purpose)}`;
  }
}
