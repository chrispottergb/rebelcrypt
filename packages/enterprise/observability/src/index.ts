/**
 * @music-ai/observability
 *
 * Pure-TypeScript metrics and tracing primitives: a MetricsRegistry with
 * Counter/Gauge/Histogram and a Prometheus text exporter, plus a minimal
 * Tracer with parent/child spans and a pluggable SpanExporter interface.
 */

export {
  assertValidLabelName,
  assertValidMetricName,
  escapeHelp,
  escapeLabelValue,
  labelKey,
  renderLabels,
} from './types';
export type {
  HistogramOptions,
  Labels,
  MetricOptions,
  MetricType,
  RenderedSample,
} from './types';

export { Counter, DEFAULT_BUCKETS, Gauge, Histogram, Metric } from './metrics';

export { MetricsRegistry } from './registry';

export {
  InMemorySpanExporter,
  Span,
  Tracer,
} from './tracer';
export type {
  AttributeValue,
  Clock,
  SpanData,
  SpanEvent,
  SpanExporter,
  SpanStatusCode,
  StartSpanOptions,
} from './tracer';
