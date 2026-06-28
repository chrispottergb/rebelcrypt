export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  ssl: boolean;
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export class DatabaseManager {
  private config: DbConfig;
  private connected = false;

  constructor(config: Partial<DbConfig> = {}) {
    this.config = {
      host: config.host ?? process.env['DB_HOST'] ?? 'localhost',
      port: config.port ?? parseInt(process.env['DB_PORT'] ?? '5432', 10),
      database: config.database ?? process.env['DB_NAME'] ?? 'music_ai',
      user: config.user ?? process.env['DB_USER'] ?? 'postgres',
      password: config.password ?? process.env['DB_PASSWORD'] ?? '',
      maxConnections: config.maxConnections ?? 20,
      ssl: config.ssl ?? false,
    };
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
    tenantId?: string,
  ): Promise<QueryResult<T>> {
    if (!this.connected) throw new Error('Database not connected');
    void sql;
    void params;
    void tenantId;
    return { rows: [], rowCount: 0 };
  }

  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
    tenantId?: string,
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params, tenantId);
    return result.rows[0] ?? null;
  }

  async transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
    const tx = new TransactionClient(this);
    try {
      await tx.begin();
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  async runMigrations(migrationsDir: string): Promise<void> {
    void migrationsDir;
    // In production, reads SQL files from migrationsDir and applies them in order
  }
}

export class TransactionClient {
  private active = false;
  constructor(private readonly db: DatabaseManager) {}

  async begin(): Promise<void> {
    this.active = true;
  }

  async commit(): Promise<void> {
    this.active = false;
  }

  async rollback(): Promise<void> {
    this.active = false;
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    if (!this.active) throw new Error('Transaction not active');
    return this.db.query<T>(sql, params);
  }
}

export class TenantScopedDb {
  constructor(
    private readonly db: DatabaseManager,
    private readonly tenantId: string,
  ) {}

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.db.query<T>(sql, params, this.tenantId);
  }

  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    return this.db.queryOne<T>(sql, params, this.tenantId);
  }
}
