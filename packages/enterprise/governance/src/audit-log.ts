import { randomUUID } from 'node:crypto';
import type { PolicyValue } from './types';

/** Severity levels for audit entries. */
export type AuditSeverity = 'info' | 'warning' | 'critical';

/** A recorded, immutable audit event. */
export interface AuditEntry {
  readonly id: string;
  /** Epoch milliseconds at which the event was recorded. */
  readonly timestamp: number;
  /** Logical event name, e.g. "policy.decision" or "consent.revoked". */
  readonly action: string;
  /** Id of the actor responsible, when known. */
  readonly actorId?: string;
  /** Id of the affected resource, when known. */
  readonly resourceId?: string;
  readonly severity: AuditSeverity;
  /** Outcome marker; true means the action succeeded/was allowed. */
  readonly success: boolean;
  readonly metadata: Readonly<Record<string, PolicyValue>>;
}

/** The caller-supplied portion of an audit entry. */
export type AuditInput = Omit<AuditEntry, 'id' | 'timestamp' | 'severity' | 'metadata'> &
  Partial<Pick<AuditEntry, 'severity' | 'metadata'>>;

/** Filter for {@link AuditLog.query}. All present fields are ANDed together. */
export interface AuditQuery {
  readonly action?: string;
  readonly actorId?: string;
  readonly resourceId?: string;
  readonly severity?: AuditSeverity;
  readonly success?: boolean;
  /** Inclusive lower bound on timestamp (epoch ms). */
  readonly since?: number;
  /** Inclusive upper bound on timestamp (epoch ms). */
  readonly until?: number;
  /** Cap on returned entries; results are newest-first. */
  readonly limit?: number;
}

/** Pluggable clock to keep the log deterministic under test. */
export type Clock = () => number;

/**
 * A fixed-capacity, in-memory audit log backed by a ring buffer. Once capacity
 * is reached the oldest entries are overwritten. Provides an indexed-free but
 * predictable query API that scans newest-to-oldest.
 */
export class AuditLog {
  private readonly buffer: (AuditEntry | undefined)[];
  private readonly capacity: number;
  private readonly clock: Clock;
  /** Index at which the next write will land. */
  private head = 0;
  /** Total number of entries ever appended (monotonic). */
  private total = 0;

  constructor(capacity = 1000, clock: Clock = Date.now) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`AuditLog capacity must be a positive integer, got ${capacity}`);
    }
    this.capacity = capacity;
    this.buffer = new Array<AuditEntry | undefined>(capacity).fill(undefined);
    this.clock = clock;
  }

  /** Appends an entry and returns the materialized record. */
  record(input: AuditInput): AuditEntry {
    const entry: AuditEntry = {
      id: randomUUID(),
      timestamp: this.clock(),
      action: input.action,
      actorId: input.actorId,
      resourceId: input.resourceId,
      success: input.success,
      severity: input.severity ?? (input.success ? 'info' : 'warning'),
      metadata: input.metadata ?? {},
    };
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.capacity;
    this.total += 1;
    return entry;
  }

  /** Number of entries currently retained (never exceeds capacity). */
  get size(): number {
    return Math.min(this.total, this.capacity);
  }

  /** Total number of entries appended over the lifetime of the log. */
  get totalRecorded(): number {
    return this.total;
  }

  /** Returns matching entries, newest-first. */
  query(filter: AuditQuery = {}): readonly AuditEntry[] {
    const out: AuditEntry[] = [];
    const limit = filter.limit ?? Number.POSITIVE_INFINITY;

    for (const entry of this.iterateNewestFirst()) {
      if (!AuditLog.matches(entry, filter)) {
        continue;
      }
      out.push(entry);
      if (out.length >= limit) {
        break;
      }
    }
    return out;
  }

  /** Convenience accessor for the most recent N entries. */
  recent(count: number): readonly AuditEntry[] {
    return this.query({ limit: count });
  }

  /** Removes all entries. */
  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.total = 0;
  }

  private *iterateNewestFirst(): Generator<AuditEntry> {
    const count = this.size;
    for (let i = 1; i <= count; i += 1) {
      const index = (this.head - i + this.capacity) % this.capacity;
      const entry = this.buffer[index];
      if (entry !== undefined) {
        yield entry;
      }
    }
  }

  private static matches(entry: AuditEntry, filter: AuditQuery): boolean {
    if (filter.action !== undefined && entry.action !== filter.action) {
      return false;
    }
    if (filter.actorId !== undefined && entry.actorId !== filter.actorId) {
      return false;
    }
    if (filter.resourceId !== undefined && entry.resourceId !== filter.resourceId) {
      return false;
    }
    if (filter.severity !== undefined && entry.severity !== filter.severity) {
      return false;
    }
    if (filter.success !== undefined && entry.success !== filter.success) {
      return false;
    }
    if (filter.since !== undefined && entry.timestamp < filter.since) {
      return false;
    }
    if (filter.until !== undefined && entry.timestamp > filter.until) {
      return false;
    }
    return true;
  }
}
