import { Connector } from './connector';
import { ConnectorNotFoundError } from './errors';
import {
  Capability,
  ConnectorKind,
  Logger,
  SyncJobDescriptor,
  SyncJobResult,
} from './types';

/**
 * Central registry of live connector instances. Provides lookup by id, by kind
 * and by capability, plus orchestration of sync jobs against registered
 * connectors.
 */
export class ConnectorRegistry {
  private readonly connectors = new Map<string, Connector>();

  constructor(private readonly logger: Logger) {}

  /** Register a connector. Throws if its id is already taken. */
  register(connector: Connector): void {
    const id = connector.config.id;
    if (this.connectors.has(id)) {
      throw new Error(`Connector id "${id}" is already registered`);
    }
    this.connectors.set(id, connector);
    this.logger.info('connector.registered', { id, kind: connector.config.kind });
  }

  /** Remove a connector by id. Returns true if one was removed. */
  unregister(id: string): boolean {
    return this.connectors.delete(id);
  }

  /** Look up a connector by id or throw {@link ConnectorNotFoundError}. */
  get(id: string): Connector {
    const found = this.connectors.get(id);
    if (!found) {
      throw new ConnectorNotFoundError(id);
    }
    return found;
  }

  /** Look up a connector by id, returning undefined when absent. */
  find(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  /** All connectors of a given kind. */
  byKind(kind: ConnectorKind): Connector[] {
    return [...this.connectors.values()].filter((c) => c.config.kind === kind);
  }

  /** All connectors advertising a given capability. */
  byCapability(capability: Capability): Connector[] {
    return [...this.connectors.values()].filter((c) => c.supports(capability));
  }

  /** Number of registered connectors. */
  get size(): number {
    return this.connectors.size;
  }

  /**
   * Run a sync job by delegating its operation to the named connector. The
   * actual record fetching is performed by `pull`, which the caller supplies so
   * the registry stays decoupled from any specific upstream schema.
   */
  async runSync<TRecord>(
    job: SyncJobDescriptor,
    pull: (
      connector: Connector,
      cursor: string | undefined,
    ) => Promise<{ records: readonly TRecord[]; nextCursor?: string }>,
    now: () => number = Date.now,
  ): Promise<SyncJobResult> {
    const startedAt = new Date(now()).toISOString();
    const errors: string[] = [];

    if (!job.enabled) {
      return {
        jobId: job.id,
        startedAt,
        finishedAt: startedAt,
        recordsProcessed: 0,
        errors: ['job disabled'],
      };
    }

    const connector = this.find(job.connectorId);
    if (!connector) {
      return {
        jobId: job.id,
        startedAt,
        finishedAt: new Date(now()).toISOString(),
        recordsProcessed: 0,
        errors: [`connector "${job.connectorId}" not found`],
      };
    }

    let processed = 0;
    let nextCursor = job.cursor;
    try {
      const page = await pull(connector, job.cursor);
      processed = page.records.length;
      nextCursor = page.nextCursor ?? job.cursor;
      this.logger.info('connector.sync_completed', {
        jobId: job.id,
        connector: job.connectorId,
        records: processed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      this.logger.error('connector.sync_failed', { jobId: job.id, error: message });
    }

    const result: SyncJobResult = {
      jobId: job.id,
      startedAt,
      finishedAt: new Date(now()).toISOString(),
      recordsProcessed: processed,
      errors,
    };
    return nextCursor !== undefined ? { ...result, nextCursor } : result;
  }
}
