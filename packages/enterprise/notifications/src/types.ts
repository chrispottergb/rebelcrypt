/**
 * Core domain types for the multi-channel notification system.
 */

/** Supported delivery channels. */
export type ChannelKind = 'email' | 'slack' | 'webhook' | 'inapp';

/** Arbitrary, JSON-serializable template variables. */
export type TemplateData = Readonly<Record<string, string | number | boolean | null>>;

/**
 * A reusable message template. Bodies use `{{var}}` placeholders that are
 * resolved against {@link TemplateData} at render time.
 */
export interface NotificationTemplate {
  readonly id: string;
  /** Subject / title line (used by email & in-app). */
  readonly subject: string;
  /** Main body with `{{var}}` placeholders. */
  readonly body: string;
}

/** A rendered template, ready to hand to a channel adapter. */
export interface RenderedMessage {
  readonly subject: string;
  readonly body: string;
}

/** A recipient and their per-channel routing preferences. */
export interface Recipient {
  readonly id: string;
  readonly displayName: string;
  /** Channel-specific destination addresses. */
  readonly addresses: Partial<Record<ChannelKind, string>>;
  /**
   * Ordered preference of channels. The service attempts these in order until
   * one succeeds. If omitted, the explicitly requested channel is used.
   */
  readonly channelPreferences?: ReadonlyArray<ChannelKind>;
}

/** A request to notify a single recipient. */
export interface Notification {
  readonly id: string;
  readonly recipient: Recipient;
  readonly templateId: string;
  readonly data: TemplateData;
  /** Explicit channel; ignored when the recipient has preferences. */
  readonly channel?: ChannelKind;
}

/** Outcome of a single channel send attempt. */
export interface DeliveryResult {
  readonly success: boolean;
  readonly channel: ChannelKind;
  /** Provider-side identifier for the accepted message, when available. */
  readonly providerMessageId?: string;
  readonly error?: string;
  /** Whether the failure is worth retrying (transient vs permanent). */
  readonly retryable: boolean;
}

/** A persisted record of one dispatch attempt. */
export interface DeliveryLogEntry {
  readonly notificationId: string;
  readonly recipientId: string;
  readonly channel: ChannelKind;
  readonly attempt: number;
  readonly success: boolean;
  readonly providerMessageId?: string;
  readonly error?: string;
  readonly timestamp: number;
}

/**
 * Transport-agnostic send function injected into channel adapters. Returns the
 * provider's acceptance details. Throwing signals a failed transport call; the
 * adapter decides whether the failure is retryable.
 */
export type TransportFn = (request: TransportRequest) => Promise<TransportResponse>;

/** Normalized payload handed to a {@link TransportFn}. */
export interface TransportRequest {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly metadata: Readonly<Record<string, string>>;
}

/** Normalized response from a {@link TransportFn}. */
export interface TransportResponse {
  readonly id: string;
  readonly statusCode?: number;
}

/** Minimal structured logger contract (no console.* in library code). */
export interface Logger {
  info(message: string, context?: Readonly<Record<string, unknown>>): void;
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

/** A logger that discards everything; the default. */
export const noopLogger: Logger = {
  info: (): void => undefined,
  warn: (): void => undefined,
  error: (): void => undefined,
};
