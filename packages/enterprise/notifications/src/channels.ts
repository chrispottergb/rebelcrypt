import type {
  ChannelKind,
  DeliveryResult,
  Recipient,
  RenderedMessage,
  TransportFn,
  TransportResponse,
} from './types';

/**
 * A pluggable delivery channel. Implementations translate a rendered message
 * into a transport call and normalize the result into a {@link DeliveryResult}.
 */
export interface Channel {
  readonly kind: ChannelKind;
  send(recipient: Recipient, message: RenderedMessage): Promise<DeliveryResult>;
}

/** Raised when a recipient lacks an address for a channel. */
export class MissingAddressError extends Error {
  constructor(channel: ChannelKind, recipientId: string) {
    super(`Recipient "${recipientId}" has no address for channel "${channel}"`);
    this.name = 'MissingAddressError';
  }
}

/**
 * Shared adapter behavior: resolve the recipient address, invoke the injected
 * transport, and convert thrown errors into a normalized failure result. A
 * thrown {@link RetryableTransportError} marks the failure as retryable.
 */
abstract class BaseChannel implements Channel {
  public abstract readonly kind: ChannelKind;

  protected constructor(protected readonly transport: TransportFn) {}

  protected resolveAddress(recipient: Recipient): string {
    const address = recipient.addresses[this.kind];
    if (address === undefined || address.length === 0) {
      throw new MissingAddressError(this.kind, recipient.id);
    }
    return address;
  }

  /** Subclasses build the channel-specific metadata block. */
  protected abstract metadata(
    recipient: Recipient,
    message: RenderedMessage,
  ): Readonly<Record<string, string>>;

  public async send(
    recipient: Recipient,
    message: RenderedMessage,
  ): Promise<DeliveryResult> {
    let to: string;
    try {
      to = this.resolveAddress(recipient);
    } catch (err) {
      return {
        success: false,
        channel: this.kind,
        error: err instanceof Error ? err.message : String(err),
        retryable: false,
      };
    }

    try {
      const response: TransportResponse = await this.transport({
        to,
        subject: message.subject,
        body: message.body,
        metadata: this.metadata(recipient, message),
      });
      return {
        success: true,
        channel: this.kind,
        providerMessageId: response.id,
        retryable: false,
      };
    } catch (err) {
      const retryable = err instanceof RetryableTransportError;
      return {
        success: false,
        channel: this.kind,
        error: err instanceof Error ? err.message : String(err),
        retryable,
      };
    }
  }
}

/** Transport failures the caller deems transient (timeouts, 5xx, throttling). */
export class RetryableTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableTransportError';
  }
}

/** Delivers email-shaped messages (subject + body). */
export class EmailChannel extends BaseChannel {
  public readonly kind: ChannelKind = 'email';

  constructor(transport: TransportFn) {
    super(transport);
  }

  protected metadata(
    _recipient: Recipient,
    _message: RenderedMessage,
  ): Readonly<Record<string, string>> {
    return { mime: 'text/plain' };
  }
}

/** Posts a message to a Slack channel/DM; subject becomes a bold heading. */
export class SlackChannel extends BaseChannel {
  public readonly kind: ChannelKind = 'slack';

  constructor(transport: TransportFn) {
    super(transport);
  }

  public override async send(
    recipient: Recipient,
    message: RenderedMessage,
  ): Promise<DeliveryResult> {
    // Slack prefers a single text blob; fold subject into the body.
    const folded: RenderedMessage = {
      subject: message.subject,
      body: message.subject.length > 0
        ? `*${message.subject}*\n${message.body}`
        : message.body,
    };
    return super.send(recipient, folded);
  }

  protected metadata(
    recipient: Recipient,
    _message: RenderedMessage,
  ): Readonly<Record<string, string>> {
    return { unfurl: 'false', recipient: recipient.displayName };
  }
}

/** Fires an arbitrary HTTP-style webhook via the injected transport. */
export class WebhookChannel extends BaseChannel {
  public readonly kind: ChannelKind = 'webhook';

  constructor(transport: TransportFn) {
    super(transport);
  }

  protected metadata(
    recipient: Recipient,
    _message: RenderedMessage,
  ): Readonly<Record<string, string>> {
    return { contentType: 'application/json', recipientId: recipient.id };
  }
}

/**
 * Records an in-app notification. Often the transport here writes to a store
 * rather than a network, but the contract is identical.
 */
export class InAppChannel extends BaseChannel {
  public readonly kind: ChannelKind = 'inapp';

  constructor(transport: TransportFn) {
    super(transport);
  }

  protected metadata(
    recipient: Recipient,
    _message: RenderedMessage,
  ): Readonly<Record<string, string>> {
    return { recipientId: recipient.id, persisted: 'true' };
  }
}
