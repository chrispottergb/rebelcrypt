import type { Channel } from './channels';
import { DeliveryLog } from './deliveryLog';
import { TemplateRenderer } from './template';
import type {
  ChannelKind,
  DeliveryResult,
  Logger,
  Notification,
  RenderedMessage,
} from './types';
import { noopLogger } from './types';

/** Configuration for {@link NotificationService}. */
export interface NotificationServiceOptions {
  readonly renderer: TemplateRenderer;
  /** Channel adapters keyed by their kind. */
  readonly channels: ReadonlyArray<Channel>;
  readonly log?: DeliveryLog;
  readonly logger?: Logger;
  /** Max attempts per channel before falling through (default 3). */
  readonly maxAttempts?: number;
  /** Whether unknown template variables throw (default true). */
  readonly strictTemplates?: boolean;
}

/** Aggregate outcome of dispatching one notification. */
export interface DispatchOutcome {
  readonly notificationId: string;
  readonly delivered: boolean;
  /** The channel that ultimately succeeded, if any. */
  readonly deliveredVia?: ChannelKind;
  /** The final result per channel attempted, in order. */
  readonly results: ReadonlyArray<DeliveryResult>;
  readonly totalAttempts: number;
}

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Routes notifications through pluggable channels honoring per-recipient
 * preferences, retrying retryable failures, and recording every attempt to a
 * {@link DeliveryLog}. Falls through to the next preferred channel when one is
 * exhausted, so a recipient is notified by the first channel that accepts.
 */
export class NotificationService {
  private readonly renderer: TemplateRenderer;
  private readonly channels: ReadonlyMap<ChannelKind, Channel>;
  private readonly log: DeliveryLog;
  private readonly logger: Logger;
  private readonly maxAttempts: number;
  private readonly strictTemplates: boolean;

  constructor(options: NotificationServiceOptions) {
    this.renderer = options.renderer;
    this.log = options.log ?? new DeliveryLog();
    this.logger = options.logger ?? noopLogger;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.strictTemplates = options.strictTemplates ?? true;

    const map = new Map<ChannelKind, Channel>();
    for (const channel of options.channels) {
      map.set(channel.kind, channel);
    }
    this.channels = map;
  }

  /** The delivery log backing this service. */
  public get deliveryLog(): DeliveryLog {
    return this.log;
  }

  /**
   * Resolves the ordered list of channels to attempt for a notification.
   * Recipient preferences win; otherwise the explicit channel is used.
   */
  private resolveChannelOrder(notification: Notification): ChannelKind[] {
    const { recipient, channel } = notification;
    const prefs = recipient.channelPreferences;
    if (prefs !== undefined && prefs.length > 0) {
      return [...prefs];
    }
    if (channel !== undefined) {
      return [channel];
    }
    throw new Error(
      `Notification "${notification.id}" has no channel and recipient "${recipient.id}" has no preferences`,
    );
  }

  /**
   * Attempts a single channel, retrying while the failure is retryable and the
   * attempt budget remains. Returns the last result and attempts consumed.
   */
  private async attemptChannel(
    notification: Notification,
    channel: Channel,
    message: RenderedMessage,
  ): Promise<{ result: DeliveryResult; attempts: number }> {
    let last: DeliveryResult | undefined;
    let attempt = 0;

    while (attempt < this.maxAttempts) {
      attempt += 1;
      last = await channel.send(notification.recipient, message);

      this.log.append({
        notificationId: notification.id,
        recipientId: notification.recipient.id,
        channel: channel.kind,
        attempt,
        success: last.success,
        providerMessageId: last.providerMessageId,
        error: last.error,
      });

      if (last.success) {
        return { result: last, attempts: attempt };
      }
      if (!last.retryable) {
        this.logger.warn('Non-retryable channel failure', {
          notificationId: notification.id,
          channel: channel.kind,
          error: last.error,
        });
        break;
      }
      this.logger.info('Retrying channel after retryable failure', {
        notificationId: notification.id,
        channel: channel.kind,
        attempt,
      });
    }

    // last is always assigned because maxAttempts >= 1.
    return { result: last as DeliveryResult, attempts: attempt };
  }

  /**
   * Dispatches a notification: renders its template once, then walks the
   * resolved channel order until one succeeds. Each channel is retried per the
   * configured budget before falling through to the next.
   */
  public async dispatch(notification: Notification): Promise<DispatchOutcome> {
    const message = this.renderer.render(notification.templateId, notification.data, {
      strict: this.strictTemplates,
    });

    const order = this.resolveChannelOrder(notification);
    const results: DeliveryResult[] = [];
    let totalAttempts = 0;

    for (const kind of order) {
      const channel = this.channels.get(kind);
      if (channel === undefined) {
        const missing: DeliveryResult = {
          success: false,
          channel: kind,
          error: `No adapter registered for channel "${kind}"`,
          retryable: false,
        };
        results.push(missing);
        this.logger.warn('Skipping unregistered channel', {
          notificationId: notification.id,
          channel: kind,
        });
        continue;
      }

      const { result, attempts } = await this.attemptChannel(notification, channel, message);
      results.push(result);
      totalAttempts += attempts;

      if (result.success) {
        this.logger.info('Notification delivered', {
          notificationId: notification.id,
          channel: kind,
        });
        return {
          notificationId: notification.id,
          delivered: true,
          deliveredVia: kind,
          results,
          totalAttempts,
        };
      }
    }

    this.logger.error('Notification undeliverable on all channels', {
      notificationId: notification.id,
      attempted: order,
    });
    return {
      notificationId: notification.id,
      delivered: false,
      results,
      totalAttempts,
    };
  }

  /** Dispatches many notifications, preserving input order in the results. */
  public async dispatchAll(
    notifications: ReadonlyArray<Notification>,
  ): Promise<ReadonlyArray<DispatchOutcome>> {
    const outcomes: DispatchOutcome[] = [];
    for (const notification of notifications) {
      outcomes.push(await this.dispatch(notification));
    }
    return outcomes;
  }
}
