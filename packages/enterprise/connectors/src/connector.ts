import {
  ApiKeyConfig,
  AuthConfig,
  Capability,
  ConnectorConfig,
  FetchLike,
  Logger,
  NormalizedRequest,
  NormalizedResponse,
  OAuth2Config,
  RetryPolicy,
  SecretResolver,
} from './types';
import { CapabilityError, TransportError } from './errors';

/** Dependencies injected into every connector at construction time. */
export interface ConnectorDeps {
  readonly fetch: FetchLike;
  readonly resolveSecret: SecretResolver;
  readonly logger: Logger;
  /** Optional clock override for deterministic tests. Defaults to Date.now. */
  readonly now?: () => number;
  /** Optional sleep override for deterministic tests. Defaults to setTimeout. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Public surface every connector implementation exposes. */
export interface Connector {
  readonly config: ConnectorConfig;
  supports(capability: Capability): boolean;
  execute<TData = unknown, TBody = unknown>(
    request: NormalizedRequest<TBody>,
  ): Promise<NormalizedResponse<TData>>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Base connector providing auth injection, rate-limit-aware request building,
 * retry/backoff, timeout handling and response normalization. Concrete
 * connectors extend this and supply their own request/response mapping.
 */
export abstract class BaseConnector implements Connector {
  protected readonly fetch: FetchLike;
  protected readonly resolveSecret: SecretResolver;
  protected readonly logger: Logger;
  protected readonly now: () => number;
  protected readonly sleep: (ms: number) => Promise<void>;

  constructor(
    public readonly config: ConnectorConfig,
    deps: ConnectorDeps,
  ) {
    this.fetch = deps.fetch;
    this.resolveSecret = deps.resolveSecret;
    this.logger = deps.logger;
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? defaultSleep;
  }

  supports(capability: Capability): boolean {
    return this.config.capabilities.includes(capability);
  }

  /** Capability gate concrete connectors call before mapping a request. */
  protected requireCapability(capability: Capability): void {
    if (!this.supports(capability)) {
      throw new CapabilityError(this.config.id, capability);
    }
  }

  /** Compute the delay (ms) for a given retry attempt with jitter. */
  protected computeBackoff(attempt: number, policy: RetryPolicy): number {
    const raw = policy.baseDelayMs * Math.pow(policy.backoffFactor, attempt - 1);
    const capped = Math.min(raw, policy.maxDelayMs);
    const jitterSpan = capped * policy.jitter;
    // Symmetric jitter centred on the capped delay.
    const offset = (Math.random() * 2 - 1) * jitterSpan;
    return Math.max(0, Math.round(capped + offset));
  }

  private async buildAuthHeaders(
    auth: AuthConfig,
    query: Record<string, string>,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (auth.kind === 'apikey') {
      await this.applyApiKey(auth, headers, query);
    } else {
      await this.applyOAuth2(auth, headers);
    }
    return headers;
  }

  private async applyApiKey(
    auth: ApiKeyConfig,
    headers: Record<string, string>,
    query: Record<string, string>,
  ): Promise<void> {
    const key = await this.resolveSecret(auth.apiKeyRef);
    const value = `${auth.valuePrefix ?? ''}${key}`;
    if (auth.placement === 'header') {
      headers[auth.paramName] = value;
    } else {
      query[auth.paramName] = value;
    }
  }

  private async applyOAuth2(
    auth: OAuth2Config,
    headers: Record<string, string>,
  ): Promise<void> {
    // The secret resolver is expected to return a usable bearer token for the
    // configured client; token acquisition/refresh is delegated to it so this
    // framework performs no live token exchange of its own.
    const token = await this.resolveSecret(auth.clientSecretRef);
    headers['Authorization'] = `Bearer ${token}`;
  }

  private buildUrl(
    path: string,
    query: Record<string, string>,
  ): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    const suffix = path.startsWith('/') ? path : `/${path}`;
    const entries = Object.entries(query);
    if (entries.length === 0) {
      return `${base}${suffix}`;
    }
    const qs = entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${base}${suffix}?${qs}`;
  }

  /**
   * Execute a normalized request with retry/backoff and timeout. Subclasses
   * typically wrap this with operation-specific mapping logic.
   */
  async execute<TData = unknown, TBody = unknown>(
    request: NormalizedRequest<TBody>,
  ): Promise<NormalizedResponse<TData>> {
    const policy = this.config.retry;
    const query: Record<string, string> = {};
    if (request.query) {
      for (const [k, v] of Object.entries(request.query)) {
        query[k] = String(v);
      }
    }

    const authHeaders = await this.buildAuthHeaders(this.config.auth, query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...authHeaders,
      ...(request.headers ?? {}),
    };
    const hasBody = request.body !== undefined;
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    const url = this.buildUrl(request.path, query);
    const body = hasBody ? JSON.stringify(request.body) : undefined;

    let lastStatus = 0;
    let lastError = '';
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await this.fetch(url, {
          method: request.method,
          headers,
          body,
          signal: controller.signal,
        });
        lastStatus = res.status;

        if (res.status >= 200 && res.status < 300) {
          return await this.normalize<TData>(res, attempt);
        }

        if (!policy.retryableStatuses.includes(res.status)) {
          return await this.normalize<TData>(res, attempt);
        }

        lastError = `Upstream returned ${res.status}`;
        this.logger.warn('connector.retryable_status', {
          connector: this.config.id,
          status: res.status,
          attempt,
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        this.logger.warn('connector.transport_error', {
          connector: this.config.id,
          attempt,
          error: lastError,
        });
      } finally {
        clearTimeout(timer);
      }

      if (attempt < policy.maxAttempts) {
        await this.sleep(this.computeBackoff(attempt, policy));
      }
    }

    throw new TransportError(
      `Connector "${this.config.id}" failed after ${policy.maxAttempts} attempts: ${lastError}`,
      lastStatus,
      policy.maxAttempts,
    );
  }

  private async normalize<TData>(
    res: { status: number; headers: { get(name: string): string | null }; text(): Promise<string> },
    attempts: number,
  ): Promise<NormalizedResponse<TData>> {
    const raw = await res.text();
    let data: TData;
    try {
      data = (raw ? JSON.parse(raw) : null) as TData;
    } catch {
      data = raw as unknown as TData;
    }
    const headers: Record<string, string> = {};
    const rl = this.config.rateLimit;
    for (const name of [rl.remainingHeader, rl.resetHeader]) {
      if (name) {
        const value = res.headers.get(name);
        if (value !== null) {
          headers[name] = value;
        }
      }
    }
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      data,
      headers,
      attempts,
    };
  }
}
