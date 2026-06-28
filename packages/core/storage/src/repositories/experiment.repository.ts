import { DatabaseManager } from '../db';

export interface Experiment {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  hypothesis: string | null;
  experimentType: string;
  status: string;
  variants: Record<string, unknown>[];
  targetMetric: string;
  startDate: Date | null;
  endDate: Date | null;
  trafficPercent: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  variantId: string;
  metric: string;
  value: number;
  sampleSize: number;
  confidence: number;
  computedAt: Date;
}

export class ExperimentRepository {
  constructor(private readonly db: DatabaseManager) {}

  async findById(id: string, tenantId: string): Promise<Experiment | null> {
    return this.db.queryOne<Experiment>(
      'SELECT * FROM experiments WHERE id = $1 AND tenant_id = $2',
      [id, tenantId],
    );
  }

  async create(tenantId: string, data: Partial<Experiment>): Promise<Experiment | null> {
    return this.db.queryOne<Experiment>(
      `INSERT INTO experiments (tenant_id, name, description, hypothesis, experiment_type, status, variants, target_metric, traffic_percent, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [tenantId, data.name, data.description, data.hypothesis,
       data.experimentType ?? 'ab_test', data.status ?? 'draft',
       JSON.stringify(data.variants ?? []), data.targetMetric ?? 'conversion',
       data.trafficPercent ?? 100, data.createdBy],
    );
  }

  async listActive(tenantId: string): Promise<Experiment[]> {
    const result = await this.db.query<Experiment>(
      "SELECT * FROM experiments WHERE tenant_id = $1 AND status = 'running' ORDER BY start_date DESC",
      [tenantId],
    );
    return result.rows;
  }

  async recordResult(data: Partial<ExperimentResult>): Promise<ExperimentResult | null> {
    return this.db.queryOne<ExperimentResult>(
      `INSERT INTO experiment_results (experiment_id, variant_id, metric, value, sample_size, confidence)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.experimentId, data.variantId, data.metric, data.value, data.sampleSize, data.confidence],
    );
  }

  async getResults(experimentId: string): Promise<ExperimentResult[]> {
    const result = await this.db.query<ExperimentResult>(
      'SELECT * FROM experiment_results WHERE experiment_id = $1 ORDER BY computed_at DESC',
      [experimentId],
    );
    return result.rows;
  }
}
