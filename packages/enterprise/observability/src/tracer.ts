/**
 * A minimal tracer providing span creation, parent/child relationships,
 * attributes, status and pluggable export — without any OpenTelemetry runtime.
 */

import { randomBytes } from 'node:crypto';

/** Attribute values permitted on a span. */
export type AttributeValue = string | number | boolean;

/** Status codes for a finished span. */
export type SpanStatusCode = 'unset' | 'ok' | 'error';

/** A point-in-time event recorded within a span. */
export interface SpanEvent {
  readonly name: string;
  readonly timeUnixNano: number;
  readonly attributes: Readonly<Record<string, AttributeValue>>;
}

/** Immutable snapshot handed to exporters when a span ends. */
export interface SpanData {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTimeUnixNano: number;
  readonly endTimeUnixNano: number;
  readonly durationNano: number;
  readonly attributes: Readonly<Record<string, AttributeValue>>;
  readonly events: readonly SpanEvent[];
  readonly status: { readonly code: SpanStatusCode; readonly message?: string };
}

/** Receives finished spans. Implementations forward them to a backend. */
export interface SpanExporter {
  export(span: SpanData): void;
  /** Optional flush hook for buffered exporters. */
  flush?(): void;
}

/** Clock abstraction so tests can supply deterministic time. */
export interface Clock {
  /** Current wall-clock time in nanoseconds. */
  nowNano(): number;
}

const defaultClock: Clock = {
  nowNano(): number {
    return Math.round(performance.timeOrigin * 1e6 + performance.now() * 1e6);
  },
};

function genId(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

/** A live span. Mutable until {@link Span.end} is called. */
export class Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTimeUnixNano: number;

  private readonly attributes: Record<string, AttributeValue> = {};
  private readonly events: SpanEvent[] = [];
  private status: { code: SpanStatusCode; message?: string } = { code: 'unset' };
  private ended = false;

  constructor(
    private readonly tracer: Tracer,
    private readonly clock: Clock,
    name: string,
    traceId: string,
    spanId: string,
    parentSpanId?: string,
  ) {
    this.name = name;
    this.traceId = traceId;
    this.spanId = spanId;
    if (parentSpanId !== undefined) {
      this.parentSpanId = parentSpanId;
    }
    this.startTimeUnixNano = clock.nowNano();
  }

  /** Set a single attribute. Ignored once the span has ended. */
  setAttribute(key: string, value: AttributeValue): this {
    if (!this.ended) {
      this.attributes[key] = value;
    }
    return this;
  }

  /** Merge multiple attributes at once. */
  setAttributes(attrs: Readonly<Record<string, AttributeValue>>): this {
    for (const [k, v] of Object.entries(attrs)) {
      this.setAttribute(k, v);
    }
    return this;
  }

  /** Record a timestamped event on the span. */
  addEvent(name: string, attributes: Readonly<Record<string, AttributeValue>> = {}): this {
    if (!this.ended) {
      this.events.push({
        name,
        timeUnixNano: this.clock.nowNano(),
        attributes: { ...attributes },
      });
    }
    return this;
  }

  /** Set the span status; convenient for marking failures. */
  setStatus(code: SpanStatusCode, message?: string): this {
    if (!this.ended) {
      this.status = message !== undefined ? { code, message } : { code };
    }
    return this;
  }

  /** Record an exception as an event and mark the span as errored. */
  recordException(err: Error): this {
    this.addEvent('exception', {
      'exception.type': err.name,
      'exception.message': err.message,
    });
    return this.setStatus('error', err.message);
  }

  /** Start a child span that inherits this span's trace and parent id. */
  startChild(name: string): Span {
    return this.tracer.startSpan(name, { parent: this });
  }

  /** Whether {@link end} has already been called. */
  get isEnded(): boolean {
    return this.ended;
  }

  /** Finalize the span and forward it to the tracer's exporters. Idempotent. */
  end(): SpanData {
    const endTimeUnixNano = this.clock.nowNano();
    const data: SpanData = {
      traceId: this.traceId,
      spanId: this.spanId,
      ...(this.parentSpanId !== undefined ? { parentSpanId: this.parentSpanId } : {}),
      name: this.name,
      startTimeUnixNano: this.startTimeUnixNano,
      endTimeUnixNano,
      durationNano: endTimeUnixNano - this.startTimeUnixNano,
      attributes: { ...this.attributes },
      events: [...this.events],
      status: { ...this.status },
    };
    if (!this.ended) {
      this.ended = true;
      this.tracer.onSpanEnd(data);
    }
    return data;
  }
}

/** Options accepted by {@link Tracer.startSpan}. */
export interface StartSpanOptions {
  /** Explicit parent span; its trace id is inherited. */
  readonly parent?: Span;
  /** Initial attributes. */
  readonly attributes?: Readonly<Record<string, AttributeValue>>;
}

/** Creates spans and fans finished spans out to registered exporters. */
export class Tracer {
  private readonly exporters: SpanExporter[] = [];

  constructor(private readonly clock: Clock = defaultClock) {}

  /** Register an exporter to receive finished spans. */
  addExporter(exporter: SpanExporter): this {
    this.exporters.push(exporter);
    return this;
  }

  /** Begin a new span, optionally as a child of an existing span. */
  startSpan(name: string, opts: StartSpanOptions = {}): Span {
    const parent = opts.parent;
    const traceId = parent ? parent.traceId : genId(16);
    const spanId = genId(8);
    const span = new Span(this, this.clock, name, traceId, spanId, parent?.spanId);
    if (opts.attributes) {
      span.setAttributes(opts.attributes);
    }
    return span;
  }

  /** @internal Called by {@link Span.end}. */
  onSpanEnd(data: SpanData): void {
    for (const exporter of this.exporters) {
      exporter.export(data);
    }
  }

  /** Flush all exporters that support flushing. */
  flush(): void {
    for (const exporter of this.exporters) {
      exporter.flush?.();
    }
  }
}

/** A simple in-memory exporter, useful for tests and aggregation. */
export class InMemorySpanExporter implements SpanExporter {
  private readonly spans: SpanData[] = [];

  export(span: SpanData): void {
    this.spans.push(span);
  }

  /** All collected spans in completion order. */
  getSpans(): readonly SpanData[] {
    return this.spans;
  }

  /** Discard collected spans. */
  reset(): void {
    this.spans.length = 0;
  }
}
