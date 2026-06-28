/**
 * @music-ai/notifications
 *
 * Multi-channel notification dispatch with pluggable, transport-agnostic
 * channel adapters, `{{var}}` template rendering, per-recipient channel
 * preferences, retry-on-failure, and an auditable delivery log.
 */

export type {
  ChannelKind,
  TemplateData,
  NotificationTemplate,
  RenderedMessage,
  Recipient,
  Notification,
  DeliveryResult,
  DeliveryLogEntry,
  TransportFn,
  TransportRequest,
  TransportResponse,
  Logger,
} from './types';
export { noopLogger } from './types';

export {
  TemplateRenderer,
  renderString,
  MissingTemplateVariableError,
} from './template';
export type { RenderOptions } from './template';

export type { Channel } from './channels';
export {
  EmailChannel,
  SlackChannel,
  WebhookChannel,
  InAppChannel,
  MissingAddressError,
  RetryableTransportError,
} from './channels';

export { DeliveryLog } from './deliveryLog';

export { NotificationService } from './service';
export type {
  NotificationServiceOptions,
  DispatchOutcome,
} from './service';
