import {
  applyBasisPoints,
  CurrencyCode,
  Money,
  money,
  sum,
  zero,
} from './money';
import { hash32 } from './hashing';

/**
 * Partner program domain. Partners belong to a tier that determines their
 * commission rate. Referrals attribute revenue to a partner; commission is
 * computed deterministically from attributed revenue.
 */

export interface PartnerTier {
  readonly id: string;
  readonly name: string;
  /** Commission rate in basis points (e.g. 1500 = 15%). */
  readonly commissionBasisPoints: number;
  /** Minimum cumulative attributed revenue (minor units) to qualify. */
  readonly minAttributedRevenueMinor: number;
}

export interface Partner {
  readonly id: string;
  readonly name: string;
  readonly tierId: string;
}

export interface Referral {
  readonly partnerId: string;
  readonly customerId: string;
  /** Revenue attributable to this referral in minor units. */
  readonly revenue: Money;
}

export interface CommissionStatement {
  readonly partnerId: string;
  readonly tierId: string;
  readonly currency: CurrencyCode;
  readonly attributedRevenue: Money;
  readonly commission: Money;
  readonly referralCount: number;
}

export class PartnerProgramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartnerProgramError';
  }
}

export class PartnerProgram {
  private readonly tiers: Map<string, PartnerTier>;
  private readonly partners: Map<string, Partner>;

  constructor(tiers: readonly PartnerTier[], partners: readonly Partner[] = []) {
    this.tiers = new Map(tiers.map((t) => [t.id, t]));
    this.partners = new Map(partners.map((p) => [p.id, p]));
  }

  addPartner(partner: Partner): void {
    if (!this.tiers.has(partner.tierId)) {
      throw new PartnerProgramError(`Unknown tier ${partner.tierId} for partner ${partner.id}`);
    }
    this.partners.set(partner.id, partner);
  }

  getTier(tierId: string): PartnerTier {
    const tier = this.tiers.get(tierId);
    if (!tier) {
      throw new PartnerProgramError(`Unknown tier ${tierId}`);
    }
    return tier;
  }

  /**
   * Deterministically attributes a customer to one of the given partners.
   * Used for round-robin-free, stable attribution when multiple partners
   * could claim a shared lead (e.g. by territory). Returns the partner id.
   */
  attribute(customerId: string, candidatePartnerIds: readonly string[]): string {
    if (candidatePartnerIds.length === 0) {
      throw new PartnerProgramError('No candidate partners for attribution');
    }
    const sorted = [...candidatePartnerIds].sort();
    const idx = hash32(customerId, 'attribution') % sorted.length;
    return sorted[idx] as string;
  }

  /**
   * Recompute the tier a partner qualifies for given cumulative attributed
   * revenue. Returns the highest tier whose minimum is met; falls back to the
   * lowest tier if none qualify.
   */
  qualifyingTier(cumulativeRevenueMinor: number): PartnerTier {
    const ordered = [...this.tiers.values()].sort(
      (a, b) => a.minAttributedRevenueMinor - b.minAttributedRevenueMinor,
    );
    if (ordered.length === 0) {
      throw new PartnerProgramError('No tiers defined');
    }
    let chosen = ordered[0] as PartnerTier;
    for (const tier of ordered) {
      if (cumulativeRevenueMinor >= tier.minAttributedRevenueMinor) {
        chosen = tier;
      }
    }
    return chosen;
  }

  /**
   * Build a commission statement for a partner from their referrals. All
   * referrals must share a currency. Commission uses the partner's current
   * tier rate.
   */
  statement(partnerId: string, referrals: readonly Referral[], currency: CurrencyCode): CommissionStatement {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new PartnerProgramError(`Unknown partner ${partnerId}`);
    }
    const owned = referrals.filter((r) => r.partnerId === partnerId);
    const attributedRevenue = sum(owned.map((r) => r.revenue), currency);
    const tier = this.getTier(partner.tierId);
    const commission =
      attributedRevenue.amount === 0
        ? zero(currency)
        : applyBasisPoints(attributedRevenue, tier.commissionBasisPoints);

    return {
      partnerId,
      tierId: tier.id,
      currency,
      attributedRevenue,
      commission,
      referralCount: owned.length,
    };
  }

  /** Flat commission for a single revenue amount at an explicit tier. */
  commissionFor(revenue: Money, tierId: string): Money {
    const tier = this.getTier(tierId);
    return revenue.amount === 0
      ? zero(revenue.currency)
      : applyBasisPoints(revenue, tier.commissionBasisPoints);
  }

  /** Sum commissions across many statements sharing a currency. */
  totalCommission(statements: readonly CommissionStatement[], currency: CurrencyCode): Money {
    return statements.reduce(
      (acc, s) => ({ amount: acc.amount + s.commission.amount, currency }),
      money(0, currency),
    );
  }
}
