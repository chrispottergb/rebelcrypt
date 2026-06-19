import { DatabaseManager } from '../db';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'deactivated';
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  maxUsers: number;
  storageQuotaBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TenantRepository {
  constructor(private readonly db: DatabaseManager) {}

  async findById(id: string): Promise<Tenant | null> {
    return this.db.queryOne<Tenant>(
      'SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.db.queryOne<Tenant>(
      'SELECT * FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
      [slug],
    );
  }

  async create(data: {
    name: string;
    slug: string;
    plan?: string;
    settings?: Record<string, unknown>;
  }): Promise<Tenant | null> {
    return this.db.queryOne<Tenant>(
      `INSERT INTO tenants (name, slug, plan, settings) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.slug, data.plan ?? 'free', JSON.stringify(data.settings ?? {})],
    );
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.plan !== undefined) { fields.push(`plan = $${idx++}`); values.push(data.plan); }
    if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.settings !== undefined) { fields.push(`settings = $${idx++}`); values.push(JSON.stringify(data.settings)); }
    if (data.maxUsers !== undefined) { fields.push(`max_users = $${idx++}`); values.push(data.maxUsers); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    return this.db.queryOne<Tenant>(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
  }

  async list(options?: { plan?: string; status?: string; limit?: number; offset?: number }): Promise<Tenant[]> {
    const conditions = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (options?.plan) { conditions.push(`plan = $${idx++}`); params.push(options.plan); }
    if (options?.status) { conditions.push(`status = $${idx++}`); params.push(options.status); }

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const result = await this.db.query<Tenant>(
      `SELECT * FROM tenants WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return result.rows;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.query('UPDATE tenants SET deleted_at = now() WHERE id = $1', [id]);
  }
}
