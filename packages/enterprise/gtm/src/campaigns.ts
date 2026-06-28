import { hashUnitInterval } from './hashing';

/**
 * Campaign management domain. Campaigns target audience segments defined by
 * declarative attribute predicates, assign subjects to A/B variants by
 * deterministic hashing of a stable key, and track conversions per variant.
 */

export type AttributeValue = string | number | boolean;

export type SegmentPredicate =
  | { readonly op: 'eq'; readonly attribute: string; readonly value: AttributeValue }
  | { readonly op: 'neq'; readonly attribute: string; readonly value: AttributeValue }
  | { readonly op: 'gt'; readonly attribute: string; readonly value: number }
  | { readonly op: 'gte'; readonly attribute: string; readonly value: number }
  | { readonly op: 'lt'; readonly attribute: string; readonly value: number }
  | { readonly op: 'lte'; readonly attribute: string; readonly value: number }
  | { readonly op: 'in'; readonly attribute: string; readonly values: readonly AttributeValue[] }
  | { readonly op: 'and'; readonly predicates: readonly SegmentPredicate[] }
  | { readonly op: 'or'; readonly predicates: readonly SegmentPredicate[] }
  | { readonly op: 'not'; readonly predicate: SegmentPredicate };

export interface Segment {
  readonly id: string;
  readonly name: string;
  readonly predicate: SegmentPredicate;
}

export interface Variant {
  readonly id: string;
  /** Relative weight controlling allocation share; must be positive. */
  readonly weight: number;
}

export interface Campaign {
  readonly id: string;
  readonly name: string;
  readonly segmentId: string;
  readonly variants: readonly Variant[];
}

export type Subject = Readonly<Record<string, AttributeValue>>;

export interface Assignment {
  readonly campaignId: string;
  readonly subjectKey: string;
  readonly variantId: string;
}

export class CampaignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignError';
  }
}

function asNumber(value: AttributeValue | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function evaluatePredicate(predicate: SegmentPredicate, subject: Subject): boolean {
  switch (predicate.op) {
    case 'eq':
      return subject[predicate.attribute] === predicate.value;
    case 'neq':
      return subject[predicate.attribute] !== predicate.value;
    case 'gt': {
      const n = asNumber(subject[predicate.attribute]);
      return n !== undefined && n > predicate.value;
    }
    case 'gte': {
      const n = asNumber(subject[predicate.attribute]);
      return n !== undefined && n >= predicate.value;
    }
    case 'lt': {
      const n = asNumber(subject[predicate.attribute]);
      return n !== undefined && n < predicate.value;
    }
    case 'lte': {
      const n = asNumber(subject[predicate.attribute]);
      return n !== undefined && n <= predicate.value;
    }
    case 'in':
      return predicate.values.includes(subject[predicate.attribute] as AttributeValue);
    case 'and':
      return predicate.predicates.every((p) => evaluatePredicate(p, subject));
    case 'or':
      return predicate.predicates.some((p) => evaluatePredicate(p, subject));
    case 'not':
      return !evaluatePredicate(predicate.predicate, subject);
    default: {
      // Exhaustiveness guard.
      const _never: never = predicate;
      throw new CampaignError(`Unknown predicate ${JSON.stringify(_never)}`);
    }
  }
}

export class CampaignManager {
  private readonly campaigns: Map<string, Campaign>;
  private readonly segments: Map<string, Segment>;
  /** campaignId -> variantId -> { exposures, conversions }. */
  private readonly stats: Map<string, Map<string, { exposures: number; conversions: number }>>;

  constructor(segments: readonly Segment[] = [], campaigns: readonly Campaign[] = []) {
    this.segments = new Map(segments.map((s) => [s.id, s]));
    this.campaigns = new Map();
    this.stats = new Map();
    for (const campaign of campaigns) {
      this.addCampaign(campaign);
    }
  }

  addSegment(segment: Segment): void {
    this.segments.set(segment.id, segment);
  }

  addCampaign(campaign: Campaign): void {
    if (!this.segments.has(campaign.segmentId)) {
      throw new CampaignError(`Unknown segment ${campaign.segmentId} for campaign ${campaign.id}`);
    }
    if (campaign.variants.length === 0) {
      throw new CampaignError(`Campaign ${campaign.id} must define at least one variant`);
    }
    if (campaign.variants.some((v) => v.weight <= 0)) {
      throw new CampaignError(`Campaign ${campaign.id} has a non-positive variant weight`);
    }
    this.campaigns.set(campaign.id, campaign);
    this.stats.set(
      campaign.id,
      new Map(campaign.variants.map((v) => [v.id, { exposures: 0, conversions: 0 }])),
    );
  }

  private getCampaign(campaignId: string): Campaign {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new CampaignError(`Unknown campaign ${campaignId}`);
    }
    return campaign;
  }

  /** True if the subject matches the campaign's target segment. */
  isEligible(campaignId: string, subject: Subject): boolean {
    const campaign = this.getCampaign(campaignId);
    const segment = this.segments.get(campaign.segmentId);
    if (!segment) {
      throw new CampaignError(`Unknown segment ${campaign.segmentId}`);
    }
    return evaluatePredicate(segment.predicate, subject);
  }

  /**
   * Deterministically assign a subject key to a weighted variant. The same
   * key always yields the same variant for a given campaign. Returns null if
   * the campaign has no variants (impossible after construction guards).
   */
  assign(campaignId: string, subjectKey: string): Assignment {
    const campaign = this.getCampaign(campaignId);
    const totalWeight = campaign.variants.reduce((acc, v) => acc + v.weight, 0);
    const point = hashUnitInterval(subjectKey, campaign.id) * totalWeight;

    let cumulative = 0;
    let chosen = campaign.variants[0] as Variant;
    for (const variant of campaign.variants) {
      cumulative += variant.weight;
      if (point < cumulative) {
        chosen = variant;
        break;
      }
    }
    return { campaignId, subjectKey, variantId: chosen.id };
  }

  /** Record that a subject was exposed to their assigned variant. */
  recordExposure(assignment: Assignment): void {
    this.bumpStat(assignment.campaignId, assignment.variantId, 'exposures');
  }

  /** Record a conversion for a subject's assigned variant. */
  recordConversion(assignment: Assignment): void {
    this.bumpStat(assignment.campaignId, assignment.variantId, 'conversions');
  }

  private bumpStat(campaignId: string, variantId: string, field: 'exposures' | 'conversions'): void {
    const byVariant = this.stats.get(campaignId);
    if (!byVariant) {
      throw new CampaignError(`Unknown campaign ${campaignId}`);
    }
    const entry = byVariant.get(variantId);
    if (!entry) {
      throw new CampaignError(`Unknown variant ${variantId} for campaign ${campaignId}`);
    }
    entry[field] += 1;
  }

  /** Conversion rate in [0, 1] for a variant; 0 when no exposures. */
  conversionRate(campaignId: string, variantId: string): number {
    const entry = this.stats.get(campaignId)?.get(variantId);
    if (!entry) {
      throw new CampaignError(`Unknown variant ${variantId} for campaign ${campaignId}`);
    }
    return entry.exposures === 0 ? 0 : entry.conversions / entry.exposures;
  }

  /** Variant with the highest conversion rate; ties broken by variant id. */
  leadingVariant(campaignId: string): string {
    const campaign = this.getCampaign(campaignId);
    let best: { id: string; rate: number } | null = null;
    for (const variant of campaign.variants) {
      const rate = this.conversionRate(campaignId, variant.id);
      if (best === null || rate > best.rate || (rate === best.rate && variant.id < best.id)) {
        best = { id: variant.id, rate };
      }
    }
    if (best === null) {
      throw new CampaignError(`Campaign ${campaignId} has no variants`);
    }
    return best.id;
  }
}
