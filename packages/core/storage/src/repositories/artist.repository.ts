import { DatabaseManager } from '../db';

export interface Artist {
  id: string;
  tenantId: string;
  name: string;
  sortName: string | null;
  artistType: 'person' | 'group' | 'orchestra' | 'choir' | 'character' | 'other';
  bio: string | null;
  country: string | null;
  isni: string | null;
  ipi: string | null;
  spotifyId: string | null;
  appleMusicId: string | null;
  imageUrl: string | null;
  socialLinks: Record<string, string>;
  metadata: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ArtistRepository {
  constructor(private readonly db: DatabaseManager) {}

  async findById(id: string, tenantId: string): Promise<Artist | null> {
    return this.db.queryOne<Artist>(
      'SELECT * FROM artists WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, tenantId],
    );
  }

  async search(tenantId: string, query: string, limit = 50): Promise<Artist[]> {
    const result = await this.db.query<Artist>(
      `SELECT * FROM artists WHERE tenant_id = $1 AND name ILIKE $2 AND deleted_at IS NULL ORDER BY name LIMIT $3`,
      [tenantId, `%${query}%`, limit],
    );
    return result.rows;
  }

  async create(tenantId: string, data: Partial<Artist>): Promise<Artist | null> {
    return this.db.queryOne<Artist>(
      `INSERT INTO artists (tenant_id, name, sort_name, artist_type, bio, country, isni, ipi, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tenantId, data.name, data.sortName, data.artistType ?? 'person',
       data.bio, data.country, data.isni, data.ipi, JSON.stringify(data.metadata ?? {})],
    );
  }

  async findByIsni(isni: string): Promise<Artist | null> {
    return this.db.queryOne<Artist>(
      'SELECT * FROM artists WHERE isni = $1 AND deleted_at IS NULL',
      [isni],
    );
  }

  async listByTenant(tenantId: string, limit = 100, offset = 0): Promise<Artist[]> {
    const result = await this.db.query<Artist>(
      'SELECT * FROM artists WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY name LIMIT $2 OFFSET $3',
      [tenantId, limit, offset],
    );
    return result.rows;
  }
}
