/**
 * @music-ai/gtm
 *
 * Go-to-market domain logic: pricing & metering, partner program & commissions,
 * and campaign management with deterministic A/B variant assignment.
 */

export {
  add,
  applyBasisPoints,
  clampNonNegative,
  CurrencyMismatchError,
  isNegative,
  money,
  roundHalfUp,
  scale,
  subtract,
  sum,
  zero,
} from './money';
export type { CurrencyCode, Money } from './money';

export { hash32, hashBucket, hashUnitInterval } from './hashing';

export { PricingEngine, PricingError } from './pricing';
export type {
  BillingInterval,
  Coupon,
  DiscountKind,
  MeteredComponent,
  Plan,
  Quote,
  QuoteLine,
  QuoteRequest,
  UsageRecord,
  UsageTier,
} from './pricing';

export { PartnerProgram, PartnerProgramError } from './partners';
export type {
  CommissionStatement,
  Partner,
  PartnerTier,
  Referral,
} from './partners';

export { CampaignManager, CampaignError, evaluatePredicate } from './campaigns';
export type {
  AttributeValue,
  Assignment,
  Campaign,
  Segment,
  SegmentPredicate,
  Subject,
  Variant,
} from './campaigns';
