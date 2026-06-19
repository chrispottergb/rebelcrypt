import { DatabaseManager } from '../db';

export interface WorkflowRecord {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  description: string | null;
  definition: Record<string, unknown>;
  status: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowRunRecord {
  id: string;
  workflowId: string;
  tenantId: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  nodeResults: Record<string, unknown>;
}

export class WorkflowRepository {
  constructor(private readonly db: DatabaseManager) {}

  async findById(id: string, tenantId: string): Promise<WorkflowRecord | null> {
    return this.db.queryOne<WorkflowRecord>(
      'SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2',
      [id, tenantId],
    );
  }

  async create(tenantId: string, data: Partial<WorkflowRecord>): Promise<WorkflowRecord | null> {
    return this.db.queryOne<WorkflowRecord>(
      `INSERT INTO workflows (tenant_id, name, version, description, definition, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenantId, data.name, data.version ?? '1.0.0', data.description,
       JSON.stringify(data.definition ?? {}), data.status ?? 'active', data.createdBy],
    );
  }

  async list(tenantId: string, limit = 50, offset = 0): Promise<WorkflowRecord[]> {
    const result = await this.db.query<WorkflowRecord>(
      'SELECT * FROM workflows WHERE tenant_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [tenantId, limit, offset],
    );
    return result.rows;
  }

  async createRun(data: Partial<WorkflowRunRecord>): Promise<WorkflowRunRecord | null> {
    return this.db.queryOne<WorkflowRunRecord>(
      `INSERT INTO workflow_runs (workflow_id, tenant_id, status, input)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.workflowId, data.tenantId, data.status ?? 'pending', JSON.stringify(data.input ?? {})],
    );
  }

  async updateRun(id: string, data: Partial<WorkflowRunRecord>): Promise<void> {
    await this.db.query(
      `UPDATE workflow_runs SET status = $1, output = $2, error = $3, completed_at = $4, duration_ms = $5, node_results = $6
       WHERE id = $7`,
      [data.status, JSON.stringify(data.output), data.error,
       data.completedAt, data.durationMs, JSON.stringify(data.nodeResults ?? {}), id],
    );
  }

  async getRunHistory(workflowId: string, tenantId: string, limit = 20): Promise<WorkflowRunRecord[]> {
    const result = await this.db.query<WorkflowRunRecord>(
      'SELECT * FROM workflow_runs WHERE workflow_id = $1 AND tenant_id = $2 ORDER BY started_at DESC LIMIT $3',
      [workflowId, tenantId, limit],
    );
    return result.rows;
  }
}
