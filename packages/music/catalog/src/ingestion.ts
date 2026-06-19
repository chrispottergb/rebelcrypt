export type IngestionFormat = 'csv' | 'json' | 'xml' | 'ddex';
export type IngestionSource = 'label_feed' | 'distributor' | 'api' | 'upload' | 'sync';

export interface IngestionJob {
  id: string;
  tenantId: string;
  source: IngestionSource;
  format: IngestionFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date | null;
}

export interface RawTrackData {
  title?: string;
  artist?: string;
  album?: string;
  isrc?: string;
  duration?: number | string;
  genre?: string;
  bpm?: number | string;
  year?: number | string;
  [key: string]: unknown;
}

export interface NormalizedTrack {
  title: string;
  artistName: string;
  albumTitle: string | null;
  isrc: string | null;
  durationMs: number | null;
  genre: string | null;
  bpm: number | null;
  year: number | null;
  metadata: Record<string, unknown>;
}

export class CatalogIngestionEngine {
  normalizeMetadata(raw: RawTrackData): NormalizedTrack {
    return {
      title: String(raw.title ?? 'Untitled').trim(),
      artistName: String(raw.artist ?? 'Unknown Artist').trim(),
      albumTitle: raw.album ? String(raw.album).trim() : null,
      isrc: raw.isrc ? String(raw.isrc).replace(/[^A-Z0-9]/gi, '').toUpperCase() : null,
      durationMs: this.parseDuration(raw.duration),
      genre: raw.genre ? String(raw.genre).trim() : null,
      bpm: raw.bpm ? Math.round(Number(raw.bpm)) : null,
      year: raw.year ? Number(raw.year) : null,
      metadata: { ...raw },
    };
  }

  async ingestBatch(records: RawTrackData[], tenantId: string): Promise<{
    processed: NormalizedTrack[];
    failed: Array<{ record: RawTrackData; error: string }>;
  }> {
    const processed: NormalizedTrack[] = [];
    const failed: Array<{ record: RawTrackData; error: string }> = [];

    for (const record of records) {
      try {
        const normalized = this.normalizeMetadata(record);
        if (!normalized.title || normalized.title === 'Untitled') {
          failed.push({ record, error: 'Missing title' });
          continue;
        }
        processed.push(normalized);
      } catch (err) {
        failed.push({ record, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    void tenantId;
    return { processed, failed };
  }

  deduplicateTracks(tracks: NormalizedTrack[]): NormalizedTrack[] {
    const seen = new Map<string, NormalizedTrack>();

    for (const track of tracks) {
      const key = track.isrc ?? `${track.title.toLowerCase()}|${track.artistName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, track);
      }
    }

    return Array.from(seen.values());
  }

  private parseDuration(value: unknown): number | null {
    if (value === undefined || value === null) return null;
    const num = Number(value);
    if (!isNaN(num)) return num > 1000 ? Math.round(num) : Math.round(num * 1000);
    if (typeof value === 'string') {
      const parts = value.split(':');
      if (parts.length === 2) {
        return (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
      }
      if (parts.length === 3) {
        return (parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])) * 1000;
      }
    }
    return null;
  }
}
