import { randomUUID } from 'crypto';

export interface AuthInfo {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface RequestContext {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  auth: AuthInfo | null;
}

export interface HandlerResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export type HandlerFn = (ctx: RequestContext, store: DataStore) => HandlerResult | Promise<HandlerResult>;

export function ok(body: unknown, status = 200): HandlerResult {
  return { status, body };
}

export function created(body: unknown): HandlerResult {
  return { status: 201, body };
}

export function notFound(message = 'Not found'): HandlerResult {
  return { status: 404, body: { error: message } };
}

export function badRequest(message: string): HandlerResult {
  return { status: 400, body: { error: message } };
}

/**
 * Optional persistence sink. The in-memory Collection is a synchronous
 * read/write cache; when a sink is attached, every mutation is also written
 * through to durable storage (fire-and-forget so handlers stay synchronous),
 * and the cache is hydrated from storage on startup.
 */
export interface PersistenceSink {
  upsert(collection: string, row: { id: string }): void;
  remove(collection: string, id: string): void;
}

/**
 * A per-collection in-memory store with optional write-through persistence.
 * The handler layer depends only on these methods, not on the storage
 * mechanism, so swapping the durable backend never touches handlers.
 */
export class Collection<T extends { id: string }> {
  private readonly rows = new Map<string, T>();

  constructor(
    private readonly name: string,
    private readonly sink?: PersistenceSink,
  ) {}

  /** Populate the cache from durable storage without re-persisting. */
  hydrate(rows: T[]): void {
    for (const row of rows) this.rows.set(row.id, row);
  }

  list(): T[] {
    return Array.from(this.rows.values());
  }

  get(id: string): T | undefined {
    return this.rows.get(id);
  }

  insert(row: Omit<T, 'id'> & { id?: string }): T {
    const id = row.id ?? randomUUID();
    const full = { ...row, id } as T;
    this.rows.set(id, full);
    this.sink?.upsert(this.name, full);
    return full;
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const existing = this.rows.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id } as T;
    this.rows.set(id, updated);
    this.sink?.upsert(this.name, updated);
    return updated;
  }

  remove(id: string): boolean {
    const existed = this.rows.delete(id);
    if (existed) this.sink?.remove(this.name, id);
    return existed;
  }

  get size(): number {
    return this.rows.size;
  }
}

export interface StoredUser {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  roles: string[];
  status: string;
}

export interface StoredTrack {
  id: string;
  tenantId: string;
  title: string;
  artistId: string | null;
  genre: string | null;
  language: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface StoredArtist {
  id: string;
  tenantId: string;
  name: string;
  country: string | null;
}

export interface StoredWorkflow {
  id: string;
  tenantId: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: string;
}

export interface StoredGeneric {
  id: string;
  tenantId: string;
  [key: string]: unknown;
}

/** Aggregate of every collection the API serves. */
export class DataStore {
  readonly users: Collection<StoredUser>;
  readonly tracks: Collection<StoredTrack>;
  readonly artists: Collection<StoredArtist>;
  readonly workflows: Collection<StoredWorkflow>;
  readonly contracts: Collection<StoredGeneric>;
  readonly experiments: Collection<StoredGeneric>;
  readonly prompts: Collection<StoredGeneric>;
  readonly tenants: Collection<StoredGeneric>;
  readonly apiKeys: Collection<StoredGeneric>;

  /** All collections keyed by name, for hydration and iteration. */
  readonly byName: Record<string, Collection<{ id: string }>>;

  constructor(sink?: PersistenceSink) {
    this.users = new Collection('users', sink);
    this.tracks = new Collection('tracks', sink);
    this.artists = new Collection('artists', sink);
    this.workflows = new Collection('workflows', sink);
    this.contracts = new Collection('contracts', sink);
    this.experiments = new Collection('experiments', sink);
    this.prompts = new Collection('prompts', sink);
    this.tenants = new Collection('tenants', sink);
    this.apiKeys = new Collection('apiKeys', sink);
    this.byName = {
      users: this.users as Collection<{ id: string }>,
      tracks: this.tracks as Collection<{ id: string }>,
      artists: this.artists as Collection<{ id: string }>,
      workflows: this.workflows as Collection<{ id: string }>,
      contracts: this.contracts,
      experiments: this.experiments,
      prompts: this.prompts,
      tenants: this.tenants,
      apiKeys: this.apiKeys,
    };
  }
}
