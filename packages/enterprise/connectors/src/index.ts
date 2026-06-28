/**
 * @music-ai/connectors
 *
 * External integration framework for music-industry systems. Exposes a
 * connector base, a registry, concrete connector definitions (DSP, PRO,
 * Distributor, CRM) with normalized request/response mapping, and policy types
 * for retry/backoff, rate-limits, auth and sync jobs. Transport is injected so
 * the framework is fully testable offline.
 */

export type {
  ConnectorKind,
  Capability,
  AuthKind,
  OAuth2Config,
  ApiKeyConfig,
  AuthConfig,
  RateLimitDescriptor,
  RetryPolicy,
  ConnectorConfig,
  NormalizedRequest,
  NormalizedResponse,
  Logger,
  FetchLike,
  TransportResponse,
  SecretResolver,
  SyncJobDescriptor,
  SyncJobResult,
} from './types';

export {
  ConnectorConfigError,
  CapabilityError,
  TransportError,
  ConnectorNotFoundError,
} from './errors';

export type { Connector, ConnectorDeps } from './connector';
export { BaseConnector } from './connector';

export type {
  Track,
  StreamCount,
  RoyaltyLine,
  ReleaseDelivery,
  DeliveryReceipt,
  Contact,
  AnyDomainRequest,
} from './concrete';
export {
  DspConnector,
  ProConnector,
  DistributorConnector,
  CrmConnector,
} from './concrete';

export { ConnectorRegistry } from './registry';

export {
  DEFAULT_RETRY,
  FAST_RETRY,
  DSP_RATE_LIMIT,
  PRO_RATE_LIMIT,
  DISTRIBUTOR_RATE_LIMIT,
  CRM_RATE_LIMIT,
} from './presets';
