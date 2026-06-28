/**
 * Shared types and small utilities for the observability package.
 */

/** A set of label key/value pairs attached to a metric sample. */
export type Labels = Readonly<Record<string, string>>;

/** Kinds of metrics supported by the registry. */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/** Options common to every metric. */
export interface MetricOptions {
  /** Metric name following Prometheus naming (snake_case, ascii). */
  readonly name: string;
  /** Human readable HELP string rendered in the exposition format. */
  readonly help: string;
  /** Allowed label keys. Samples must only use these keys. */
  readonly labelNames?: readonly string[];
}

/** Histogram-specific options. */
export interface HistogramOptions extends MetricOptions {
  /**
   * Upper bounds for histogram buckets, ascending. A `+Inf` bucket is always
   * appended automatically. Defaults to a latency-oriented set if omitted.
   */
  readonly buckets?: readonly number[];
}

/** A single rendered sample line value (used internally by exporters). */
export interface RenderedSample {
  readonly name: string;
  readonly labels: Labels;
  readonly value: number;
}

const NAME_RE = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const LABEL_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Validate a metric name, throwing on invalid input. */
export function assertValidMetricName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new Error(`invalid metric name: ${JSON.stringify(name)}`);
  }
}

/** Validate a label name, throwing on invalid input. */
export function assertValidLabelName(name: string): void {
  if (!LABEL_RE.test(name) || name.startsWith('__')) {
    throw new Error(`invalid label name: ${JSON.stringify(name)}`);
  }
}

/**
 * Produce a stable, canonical string key for a label set so that samples with
 * the same labels (regardless of insertion order) map to the same series.
 */
export function labelKey(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) {
    return '';
  }
  return keys.map((k) => `${k}=${labels[k] ?? ''}`).join(',');
}

/** Escape a label value per the Prometheus text exposition format. */
export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

/** Escape a HELP string per the Prometheus text exposition format. */
export function escapeHelp(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

/** Render a label set into the `{a="1",b="2"}` syntax (empty string if none). */
export function renderLabels(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) {
    return '';
  }
  const inner = keys
    .map((k) => `${k}="${escapeLabelValue(labels[k] ?? '')}"`)
    .join(',');
  return `{${inner}}`;
}
