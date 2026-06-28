/**
 * MetricsRegistry: owns a collection of metrics and renders them to the
 * Prometheus text exposition format (version 0.0.4).
 */

import { Counter, Gauge, Histogram, Metric } from './metrics';
import {
  escapeHelp,
  HistogramOptions,
  MetricOptions,
  MetricType,
  renderLabels,
} from './types';

/** Render a numeric value the way Prometheus expects it. */
function renderValue(value: number): string {
  if (Number.isNaN(value)) {
    return 'NaN';
  }
  if (value === Infinity) {
    return '+Inf';
  }
  if (value === -Infinity) {
    return '-Inf';
  }
  return String(value);
}

/** A registry of named metrics with a single shared namespace. */
export class MetricsRegistry {
  private readonly metrics = new Map<string, Metric>();
  private readonly prefix: string;

  /**
   * @param prefix Optional namespace prefix applied to every metric name
   *   (e.g. "musicai" -> "musicai_requests_total").
   */
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  private resolveName(name: string): string {
    return this.prefix ? `${this.prefix}_${name}` : name;
  }

  private register<M extends Metric>(metric: M): M {
    if (this.metrics.has(metric.name)) {
      throw new Error(`metric "${metric.name}" already registered`);
    }
    this.metrics.set(metric.name, metric);
    return metric;
  }

  /** Create and register a Counter. */
  counter(opts: MetricOptions): Counter {
    return this.register(new Counter({ ...opts, name: this.resolveName(opts.name) }));
  }

  /** Create and register a Gauge. */
  gauge(opts: MetricOptions): Gauge {
    return this.register(new Gauge({ ...opts, name: this.resolveName(opts.name) }));
  }

  /** Create and register a Histogram. */
  histogram(opts: HistogramOptions): Histogram {
    return this.register(new Histogram({ ...opts, name: this.resolveName(opts.name) }));
  }

  /** Look up a previously registered metric by its fully-qualified name. */
  get(name: string): Metric | undefined {
    return this.metrics.get(this.resolveName(name));
  }

  /** Remove all metrics from the registry. */
  clear(): void {
    this.metrics.clear();
  }

  /** Number of registered metrics. */
  get size(): number {
    return this.metrics.size;
  }

  /**
   * Render every metric to the Prometheus text exposition format, including
   * `# HELP` and `# TYPE` header lines. Output ends with a trailing newline.
   */
  render(): string {
    const lines: string[] = [];
    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${escapeHelp(metric.help)}`);
      lines.push(`# TYPE ${metric.name} ${this.typeKeyword(metric.type)}`);
      for (const sample of metric.collect()) {
        lines.push(
          `${sample.name}${renderLabels(sample.labels)} ${renderValue(sample.value)}`,
        );
      }
    }
    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }

  private typeKeyword(type: MetricType): string {
    return type;
  }
}
