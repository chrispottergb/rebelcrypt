/**
 * Metric primitives: Counter, Gauge and Histogram.
 *
 * Each metric is a collection of "series" keyed by the canonical label set.
 * Metrics know how to enumerate their child series for export but do not know
 * about any particular exposition format; rendering lives in the exporter.
 */

import {
  assertValidLabelName,
  assertValidMetricName,
  HistogramOptions,
  Labels,
  labelKey,
  MetricOptions,
  MetricType,
  RenderedSample,
} from './types';

/** Default latency-oriented bucket bounds (seconds). */
export const DEFAULT_BUCKETS: readonly number[] = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

/** Base class shared by all metrics. Handles name/label validation. */
export abstract class Metric {
  readonly name: string;
  readonly help: string;
  readonly labelNames: readonly string[];
  abstract readonly type: MetricType;

  protected constructor(opts: MetricOptions) {
    assertValidMetricName(opts.name);
    const labelNames = opts.labelNames ?? [];
    for (const ln of labelNames) {
      assertValidLabelName(ln);
    }
    this.name = opts.name;
    this.help = opts.help;
    this.labelNames = labelNames;
  }

  /** Throw if `labels` use keys outside the declared `labelNames`. */
  protected validateLabels(labels: Labels): void {
    for (const k of Object.keys(labels)) {
      if (!this.labelNames.includes(k)) {
        throw new Error(
          `metric "${this.name}" got unexpected label "${k}"; allowed: [${this.labelNames.join(', ')}]`,
        );
      }
    }
  }

  /** Produce the flat list of samples this metric currently holds. */
  abstract collect(): RenderedSample[];
}

/** A monotonically increasing counter. */
export class Counter extends Metric {
  readonly type = 'counter' as const;
  private readonly values = new Map<string, { labels: Labels; value: number }>();

  constructor(opts: MetricOptions) {
    super(opts);
  }

  /** Increment the series identified by `labels` by `amount` (default 1). */
  inc(labels: Labels = {}, amount = 1): void {
    if (amount < 0) {
      throw new Error(`counter "${this.name}" cannot be decremented`);
    }
    this.validateLabels(labels);
    const key = labelKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      this.values.set(key, { labels, value: amount });
    }
  }

  /** Current value of a series (0 if it has never been touched). */
  get(labels: Labels = {}): number {
    return this.values.get(labelKey(labels))?.value ?? 0;
  }

  collect(): RenderedSample[] {
    const out: RenderedSample[] = [];
    for (const { labels, value } of this.values.values()) {
      out.push({ name: this.name, labels, value });
    }
    return out;
  }
}

/** A gauge that can be set, incremented or decremented arbitrarily. */
export class Gauge extends Metric {
  readonly type = 'gauge' as const;
  private readonly values = new Map<string, { labels: Labels; value: number }>();

  constructor(opts: MetricOptions) {
    super(opts);
  }

  /** Set the series to an absolute value. */
  set(value: number, labels: Labels = {}): void {
    this.validateLabels(labels);
    this.values.set(labelKey(labels), { labels, value });
  }

  /** Add to the series (use a negative amount to subtract). */
  inc(labels: Labels = {}, amount = 1): void {
    this.validateLabels(labels);
    const key = labelKey(labels);
    const existing = this.values.get(key);
    if (existing) {
      existing.value += amount;
    } else {
      this.values.set(key, { labels, value: amount });
    }
  }

  /** Subtract from the series. */
  dec(labels: Labels = {}, amount = 1): void {
    this.inc(labels, -amount);
  }

  get(labels: Labels = {}): number {
    return this.values.get(labelKey(labels))?.value ?? 0;
  }

  collect(): RenderedSample[] {
    const out: RenderedSample[] = [];
    for (const { labels, value } of this.values.values()) {
      out.push({ name: this.name, labels, value });
    }
    return out;
  }
}

interface HistogramSeries {
  readonly labels: Labels;
  /** Cumulative counts aligned to `bounds` (last entry is +Inf). */
  readonly counts: number[];
  sum: number;
  count: number;
  /** Raw observations retained for quantile estimation. */
  readonly observations: number[];
}

/** A histogram with configurable buckets and quantile estimation. */
export class Histogram extends Metric {
  readonly type = 'histogram' as const;
  /** Finite upper bounds, ascending (the implicit +Inf bucket is not stored). */
  readonly bounds: readonly number[];
  private readonly series = new Map<string, HistogramSeries>();

  constructor(opts: HistogramOptions) {
    super(opts);
    const raw = opts.buckets ?? DEFAULT_BUCKETS;
    const bounds = [...raw].sort((a, b) => a - b);
    for (let i = 1; i < bounds.length; i += 1) {
      if (bounds[i] === bounds[i - 1]) {
        throw new Error(`histogram "${this.name}" has duplicate bucket bounds`);
      }
    }
    this.bounds = bounds;
  }

  private seriesFor(labels: Labels): HistogramSeries {
    const key = labelKey(labels);
    let s = this.series.get(key);
    if (!s) {
      s = {
        labels,
        counts: new Array<number>(this.bounds.length + 1).fill(0),
        sum: 0,
        count: 0,
        observations: [],
      };
      this.series.set(key, s);
    }
    return s;
  }

  /** Record a single observation. */
  observe(value: number, labels: Labels = {}): void {
    if (!Number.isFinite(value)) {
      throw new Error(`histogram "${this.name}" got non-finite observation`);
    }
    this.validateLabels(labels);
    const s = this.seriesFor(labels);
    s.sum += value;
    s.count += 1;
    s.observations.push(value);
    // Increment every cumulative bucket whose bound is >= value.
    let i = 0;
    for (; i < this.bounds.length; i += 1) {
      const bound = this.bounds[i];
      if (bound !== undefined && value <= bound) {
        break;
      }
    }
    for (let j = i; j < s.counts.length; j += 1) {
      const c = s.counts[j];
      s.counts[j] = (c ?? 0) + 1;
    }
  }

  /**
   * Estimate a quantile (0..1) for a label set using linear interpolation over
   * the retained observations. Returns NaN when there are no samples.
   */
  quantile(q: number, labels: Labels = {}): number {
    if (q < 0 || q > 1) {
      throw new Error(`quantile must be in [0, 1], got ${q}`);
    }
    const s = this.series.get(labelKey(labels));
    if (!s || s.observations.length === 0) {
      return NaN;
    }
    const sorted = [...s.observations].sort((a, b) => a - b);
    if (q <= 0) {
      return sorted[0] as number;
    }
    if (q >= 1) {
      return sorted[sorted.length - 1] as number;
    }
    const pos = q * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    const loV = sorted[lo] as number;
    const hiV = sorted[hi] as number;
    if (lo === hi) {
      return loV;
    }
    return loV + (hiV - loV) * (pos - lo);
  }

  /** Convenience: 50th/90th/99th percentile (alias for {@link quantile}). */
  percentile(p: number, labels: Labels = {}): number {
    return this.quantile(p / 100, labels);
  }

  /** Mean of observations for a series (NaN when empty). */
  mean(labels: Labels = {}): number {
    const s = this.series.get(labelKey(labels));
    if (!s || s.count === 0) {
      return NaN;
    }
    return s.sum / s.count;
  }

  /**
   * Collect emits the canonical histogram sample shape: one `_bucket` sample per
   * bound (with a `le` label) including `+Inf`, plus `_sum` and `_count`.
   */
  collect(): RenderedSample[] {
    const out: RenderedSample[] = [];
    for (const s of this.series.values()) {
      for (let i = 0; i < this.bounds.length; i += 1) {
        const le = String(this.bounds[i]);
        out.push({
          name: `${this.name}_bucket`,
          labels: { ...s.labels, le },
          value: s.counts[i] ?? 0,
        });
      }
      out.push({
        name: `${this.name}_bucket`,
        labels: { ...s.labels, le: '+Inf' },
        value: s.count,
      });
      out.push({ name: `${this.name}_sum`, labels: s.labels, value: s.sum });
      out.push({ name: `${this.name}_count`, labels: s.labels, value: s.count });
    }
    return out;
  }
}
