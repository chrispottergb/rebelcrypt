import { Pool } from 'pg';
import type { PersistenceSink } from './context';

/**
 * Postgres-backed persistence. The whole platform is modelled as documents in
 * a single JSONB table, so any collection persists without a bespoke schema:
 *
 *   kv_documents(collection text, id text, data jsonb, updated_at timestamptz)
 *
 * Writes are fire-and-forget (the in-memory Collection is the synchronous read
 * cache); failures are logged but never block a request. On startup loadAll()
 * rehydrates the cache so data survives restarts.
 */
export interface Persistence extends PersistenceSink {
  loadAll(): Promise<Record<string, Array<{ id: string }>>>;
  close(): Promise<void>;
}

const DDL = `
  CREATE TABLE IF NOT EXISTS kv_documents (
    collection text NOT NULL,
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, id)
  );
`;

class PgPersistence implements Persistence {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query(DDL);
  }

  async loadAll(): Promise<Record<string, Array<{ id: string }>>> {
    const res = await this.pool.query<{ collection: string; data: { id: string } }>(
      'SELECT collection, data FROM kv_documents',
    );
    const out: Record<string, Array<{ id: string }>> = {};
    for (const row of res.rows) {
      (out[row.collection] ??= []).push(row.data);
    }
    return out;
  }

  upsert(collection: string, row: { id: string }): void {
    this.pool
      .query(
        `INSERT INTO kv_documents (collection, id, data, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [collection, row.id, JSON.stringify(row)],
      )
      .catch((err: unknown) => logPersistError('upsert', collection, err));
  }

  remove(collection: string, id: string): void {
    this.pool
      .query('DELETE FROM kv_documents WHERE collection = $1 AND id = $2', [collection, id])
      .catch((err: unknown) => logPersistError('remove', collection, err));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function logPersistError(op: string, collection: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.error(`[persistence] ${op} ${collection} failed: ${message}`);
}

/**
 * Builds a Postgres persistence adapter when DATABASE_URL points at a real
 * postgres server and is reachable. Returns null (→ in-memory only) for any
 * other case, so the API always boots even if the database is unavailable.
 */
export async function createPersistence(databaseUrl: string | undefined): Promise<Persistence | null> {
  if (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl)) return null;
  // Skip the default local placeholder so dev/test stay in-memory unless a real
  // DATABASE_URL is provided.
  if (databaseUrl.includes('@localhost:5432') && process.env['FORCE_DB'] !== '1') return null;

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
    max: 5,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  const persistence = new PgPersistence(pool);
  try {
    await persistence.init();
    return persistence;
  } catch (err) {
    logPersistError('init', '-', err);
    await pool.end().catch(() => undefined);
    return null;
  }
}
