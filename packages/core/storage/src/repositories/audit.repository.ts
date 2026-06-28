import { DatabaseManager } from '../db';

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class AuditRepository {
  constructor(private readonly db: DatabaseManager) {}

  async log(tenantId: string, entry: Omit<AuditLog, 'id' | 'tenantId' | 'createdAt'>): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, before_state, after_state, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [tenantId, entry.userId, entry.action, entry.resourceType, entry.resourceId,
       JSON.stringify(entry.before), JSON.stringify(entry.after),
       entry.ipAddress, entry.userAgent, JSON.stringify(entry.metadata ?? {})],
    );
  }

  async search(tenantId: string, options: {
    action?: string;
    resourceType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLog[]> {
    const conditions = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (options.action) { conditions.push(`action = $${idx++}`); params.push(options.action); }
    if (options.resourceType) { conditions.push(`resource_type = $${idx++}`); params.push(options.resourceType); }
    if (options.userId) { conditions.push(`user_id = $${idx++}`); params.push(options.userId); }
    if (options.startDate) { conditions.push(`created_at >= $${idx++}`); params.push(options.startDate); }
    if (options.endDate) { conditions.push(`created_at <= $${idx++}`); params.push(options.endDate); }

    const result = await this.db.query<AuditLog>(
      `SELECT * FROM audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ${options.limit ?? 100} OFFSET ${options.offset ?? 0}`,
      params,
    );
    return result.rows;
  }
}
