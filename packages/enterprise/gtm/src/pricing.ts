import {
  add,
  applyBasisPoints,
  clampNonNegative,
  CurrencyCode,
  Money,
  money,
  scale,
  subtract,
  sum,
  zero,
} from './money';

/**
 * Pricing domain. Plans contain a flat recurring base price plus zero or more
 * metered (usage-based) components with optional tiered rates. Discounts and
 * coupons are applied deterministically, and proration is computed from a
 * fraction of the billing period.
 */

export type BillingInterval = 'monthly' | 'annual';

export interface UsageTier {
  /** Inclusive lower bound of units this tier applies to. */
  readonly upTo: number | 'inf';
  /** Price per unit in minor units for units falling in this tier. */
  readonly unitPriceMinor: number;
}

export interface MeteredComponent {
  readonly metric: string;
  /** Units included in the flat base price before metering applies. */
  readonly includedUnits: number;
  /** Ascending tiers describing the per-unit price beyond included units. */
  readonly tiers: readonly UsageTier[];
}

export interface Plan {
  readonly id: string;
  readonly name: string;
  readonly currency: CurrencyCode;
  readonly interval: BillingInterval;
  /** Recurring flat price in minor units. */
  readonly basePriceMinor: number;
  readonly metered: readonly MeteredComponent[];
}

export type DiscountKind =
  | { readonly type: 'percentage'; readonly basisPoints: number }
  | { readonly type: 'fixed'; readonly amountMinor: number };

export interface Coupon {
  readonly code: string;
  readonly discount: DiscountKind;
  /** Whether the discount applies only to the recurring base, not usage. */
  readonly baseOnly?: boolean;
  /** Optional restriction to specific plan ids. */
  readonly appliesToPlanIds?: readonly string[];
}

export interface UsageRecord {
  readonly metric: string;
  readonly units: number;
}

export interface QuoteRequest {
  readonly plan: Plan;
  readonly usage?: readonly UsageRecord[];
  readonly coupon?: Coupon;
  /** Fraction of the billing period to charge, in (0, 1]. Defaults to 1. */
  readonly prorationFactor?: number;
  /** Tax rate in basis points applied after discounts. Defaults to 0. */
  readonly taxBasisPoints?: number;
}

export interface QuoteLine {
  readonly description: string;
  readonly amount: Money;
}

export interface Quote {
  readonly currency: CurrencyCode;
  readonly lines: readonly QuoteLine[];
  readonly subtotal: Money;
  readonly discount: Money;
  readonly tax: Money;
  readonly total: Money;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export class PricingEngine {
  /** Cost for a single metered component given consumed units. */
  meterComponent(component: MeteredComponent, units: number, currency: CurrencyCode): Money {
    if (units < 0) {
      throw new PricingError(`Usage for ${component.metric} cannot be negative`);
    }
    let billable = Math.max(0, units - component.includedUnits);
    let lowerBound = component.includedUnits;
    let total = zero(currency);

    for (const tier of component.tiers) {
      if (billable <= 0) {
        break;
      }
      const tierCapacity =
        tier.upTo === 'inf' ? billable : Math.max(0, tier.upTo - lowerBound);
      const unitsInTier = Math.min(billable, tierCapacity);
      total = add(total, money(unitsInTier * tier.unitPriceMinor, currency));
      billable -= unitsInTier;
      lowerBound = tier.upTo === 'inf' ? lowerBound : tier.upTo;
    }

    if (billable > 0) {
      throw new PricingError(
        `Usage tiers for ${component.metric} do not cover ${billable} unit(s); ` +
          `add a tier with upTo "inf"`,
      );
    }
    return total;
  }

  private usageMap(usage: readonly UsageRecord[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const record of usage) {
      map.set(record.metric, (map.get(record.metric) ?? 0) + record.units);
    }
    return map;
  }

  private couponApplies(coupon: Coupon, plan: Plan): boolean {
    if (!coupon.appliesToPlanIds) {
      return true;
    }
    return coupon.appliesToPlanIds.includes(plan.id);
  }

  private discountFor(base: Money, kind: DiscountKind): Money {
    if (kind.type === 'percentage') {
      return applyBasisPoints(base, kind.basisPoints);
    }
    return money(kind.amountMinor, base.currency);
  }

  quote(request: QuoteRequest): Quote {
    const { plan } = request;
    const currency = plan.currency;
    const usage = request.usage ?? [];
    const usageByMetric = this.usageMap(usage);

    const lines: QuoteLine[] = [];
    const baseLine = money(plan.basePriceMinor, currency);
    lines.push({ description: `${plan.name} base (${plan.interval})`, amount: baseLine });

    let meteredTotal = zero(currency);
    for (const component of plan.metered) {
      const units = usageByMetric.get(component.metric) ?? 0;
      const cost = this.meterComponent(component, units, currency);
      if (cost.amount !== 0) {
        lines.push({ description: `Usage: ${component.metric} (${units} units)`, amount: cost });
      }
      meteredTotal = add(meteredTotal, cost);
    }

    let subtotal = add(baseLine, meteredTotal);

    // Proration is applied to the full subtotal before discounts/tax.
    const proration = request.prorationFactor ?? 1;
    if (proration <= 0 || proration > 1) {
      throw new PricingError(`prorationFactor must be in (0, 1], got ${proration}`);
    }
    if (proration !== 1) {
      subtotal = scale(subtotal, proration);
    }

    // Discount: against base-only or full subtotal depending on the coupon.
    let discount = zero(currency);
    if (request.coupon && this.couponApplies(request.coupon, plan)) {
      const discountBase = request.coupon.baseOnly
        ? scale(baseLine, proration)
        : subtotal;
      const raw = this.discountFor(discountBase, request.coupon.discount);
      // Never discount below zero or beyond the subtotal.
      discount = raw.amount > subtotal.amount ? subtotal : raw;
    }

    const taxable = clampNonNegative(subtract(subtotal, discount));
    const taxBps = request.taxBasisPoints ?? 0;
    const tax = applyBasisPoints(taxable, taxBps);
    const total = add(taxable, tax);

    return { currency, lines, subtotal, discount, tax, total };
  }

  /** Convenience: total across many quotes that share a currency. */
  totalOf(quotes: readonly Quote[], currency: CurrencyCode): Money {
    return sum(quotes.map((q) => q.total), currency);
  }
}
