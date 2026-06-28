import { DatabaseManager } from '../db';

export interface Track {
  id: string;
  tenantId: string;
  title: string;
  durationMs: number | null;
  isrc: string | null;
  bpm: number | null;
  keySignature: string | null;
  explicit: boolean;
  aiGenerated: boolean;
  primaryGenreId: string | null;
  albumId: string | null;
  trackNumber: number | null;
  audioFileUrl: string | null;
  source: string;
  status: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackSearchParams {
  tenantId: string;
  query?: string;
  genre?: string;
  mood?: string;
  bpmMin?: number;
  bpmMax?: number;
  aiGenerated?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
}

export class TrackRepository {
  constructor(private readonly db: DatabaseManager) {}

  async findById(id: string, tenantId: string): Promise<Track | null> {
    return this.db.queryOne<Track>(
      'SELECT * FROM tracks WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, tenantId],
    );
  }

  async findByIsrc(isrc: string, tenantId: string): Promise<Track | null> {
    return this.db.queryOne<Track>(
      'SELECT * FROM tracks WHERE isrc = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [isrc, tenantId],
    );
  }

  async create(tenantId: string, data: Partial<Track>): Promise<Track | null> {
    return this.db.queryOne<Track>(
      `INSERT INTO tracks (tenant_id, title, duration_ms, isrc, bpm, key_signature, explicit, ai_generated, primary_genre_id, album_id, source, status, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        tenantId, data.title, data.durationMs, data.isrc, data.bpm,
        data.keySignature, data.explicit ?? false, data.aiGenerated ?? false,
        data.primaryGenreId, data.albumId, data.source ?? 'upload',
        data.status ?? 'draft', data.tags ?? [], JSON.stringify(data.metadata ?? {}),
      ],
    );
  }

  async search(params: TrackSearchParams): Promise<Track[]> {
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const values: unknown[] = [params.tenantId];
    let idx = 2;

    if (params.query) {
      conditions.push(`title ILIKE $${idx++}`);
      values.push(`%${params.query}%`);
    }
    if (params.bpmMin !== undefined) {
      conditions.push(`bpm >= $${idx++}`);
      values.push(params.bpmMin);
    }
    if (params.bpmMax !== undefined) {
      conditions.push(`bpm <= $${idx++}`);
      values.push(params.bpmMax);
    }
    if (params.aiGenerated !== undefined) {
      conditions.push(`ai_generated = $${idx++}`);
      values.push(params.aiGenerated);
    }
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }

    const result = await this.db.query<Track>(
      `SELECT * FROM tracks WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ${params.limit ?? 50} OFFSET ${params.offset ?? 0}`,
      values,
    );
    return result.rows;
  }

  async updateStatus(id: string, tenantId: string, status: string): Promise<void> {
    await this.db.query(
      'UPDATE tracks SET status = $1 WHERE id = $2 AND tenant_id = $3',
      [status, id, tenantId],
    );
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.db.query(
      'UPDATE tracks SET deleted_at = now() WHERE id = $1 AND tenant_id = $2',
      [id, tenantId],
    );
  }
}
