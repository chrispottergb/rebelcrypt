import type { DeliveryLogEntry } from './types';

/**
 * Append-only, in-memory log of every dispatch attempt. Useful for auditing,
 * debugging delivery, and computing per-recipient success metrics.
 */
export class DeliveryLog {
  private readonly entries: DeliveryLogEntry[] = [];

  /** Appends an entry, stamping the current time when none is supplied. */
  public append(entry: Omit<DeliveryLogEntry, 'timestamp'> & { timestamp?: number }): DeliveryLogEntry {
    const record: DeliveryLogEntry = {
      notificationId: entry.notificationId,
      recipientId: entry.recipientId,
      channel: entry.channel,
      attempt: entry.attempt,
      success: entry.success,
      providerMessageId: entry.providerMessageId,
      error: entry.error,
      timestamp: entry.timestamp ?? Date.now(),
    };
    this.entries.push(record);
    return record;
  }

  /** Returns a defensive copy of all entries in insertion order. */
  public all(): ReadonlyArray<DeliveryLogEntry> {
    return [...this.entries];
  }

  /** All attempts for a given notification id. */
  public forNotification(notificationId: string): ReadonlyArray<DeliveryLogEntry> {
    return this.entries.filter((e) => e.notificationId === notificationId);
  }

  /** All attempts for a given recipient id. */
  public forRecipient(recipientId: string): ReadonlyArray<DeliveryLogEntry> {
    return this.entries.filter((e) => e.recipientId === recipientId);
  }

  /** Count of successful vs failed attempts across the whole log. */
  public summary(): { readonly attempts: number; readonly succeeded: number; readonly failed: number } {
    let succeeded = 0;
    for (const e of this.entries) {
      if (e.success) {
        succeeded += 1;
      }
    }
    return {
      attempts: this.entries.length,
      succeeded,
      failed: this.entries.length - succeeded,
    };
  }

  /** Clears the log (primarily for tests). */
  public clear(): void {
    this.entries.length = 0;
  }
}
