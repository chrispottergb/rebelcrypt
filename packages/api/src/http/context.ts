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
 * A simple per-collection in-memory store. This is the seam where a real
 * Postgres-backed repository would slot in; the handler layer only depends
 * on these methods, not on the storage mechanism.
 */
export class Collection<T extends { id: string }> {
  private readonly rows = new Map<string, T>();

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
    return full;
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const existing = this.rows.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, id } as T;
    this.rows.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.rows.delete(id);
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
  readonly users = new Collection<StoredUser>();
  readonly tracks = new Collection<StoredTrack>();
  readonly artists = new Collection<StoredArtist>();
  readonly workflows = new Collection<StoredWorkflow>();
  readonly contracts = new Collection<StoredGeneric>();
  readonly experiments = new Collection<StoredGeneric>();
  readonly prompts = new Collection<StoredGeneric>();
  readonly tenants = new Collection<StoredGeneric>();
  readonly apiKeys = new Collection<StoredGeneric>();
}
