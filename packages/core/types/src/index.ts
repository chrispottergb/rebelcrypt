/**
 * @music-ai/types
 *
 * Shared domain types, enums, and small runtime helpers used platform-wide
 * across the Global Music AI Ecosystem. Pure TypeScript with a minimal runtime
 * footprint (Result constructors, branded-type validators, formatters).
 */

// Utility & nominal-typing helpers
export type {
  Brand,
  Unbrand,
  DeepPartial,
  DeepRequired,
  DeepReadonly,
  RequireAtLeastOne,
  RequireExactlyOne,
  PartialBy,
  RequiredBy,
  Awaitable,
  OneOrMany,
  JsonPrimitive,
  JsonValue,
  JsonObject,
  IsoDateTime,
} from './utility';
export { nowIso, toIso } from './utility';

// Result helper
export type { Ok, Err, Result } from './result';
export {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  mapOk,
  mapErr,
  fromThrowable,
  fromPromise,
} from './result';

// Enums
export {
  Environment,
  JobStatus,
  Visibility,
  Severity,
  SortDirection,
  TERMINAL_JOB_STATUSES,
  isTerminalJobStatus,
} from './enums';

// Money / currency
export type { Money, CurrencyCode, KnownCurrency } from './money';
export {
  CURRENCIES,
  fractionDigits,
  currencyCode,
  money,
  moneyFromMajor,
  addMoney,
  subtractMoney,
  formatMoney,
} from './money';

// Geo / localization
export type { CountryCode, LanguageCode, Locale, Territory } from './geo';
export {
  countryCode,
  languageCode,
  locale,
  WORLD,
  territoryContains,
} from './geo';

// Pagination
export type {
  SortSpec,
  PageRequest,
  PageInfo,
  Pagination,
} from './pagination';
export { normalizePageRequest, buildPage } from './pagination';

// Identity & access
export type {
  TenantId,
  UserId,
  RoleId,
  Permission,
  Role,
  User,
  Tenant,
  Actor,
  AuditEvent,
} from './identity';
export {
  SystemRole,
  permission,
  UserStatus,
  TenantTier,
} from './identity';
