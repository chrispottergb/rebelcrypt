export interface VectorEntry {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SimilarityResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorDbConfig {
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dot_product';
  indexType: 'ivfflat' | 'hnsw';
}

export class VectorDbAdapter {
  private config: VectorDbConfig;
  private store = new Map<string, VectorEntry>();

  constructor(config?: Partial<VectorDbConfig>) {
    this.config = {
      dimensions: config?.dimensions ?? 1536,
      metric: config?.metric ?? 'cosine',
      indexType: config?.indexType ?? 'hnsw',
    };
  }

  async upsert(entries: VectorEntry[]): Promise<number> {
    for (const entry of entries) {
      if (entry.embedding.length !== this.config.dimensions) {
        throw new Error(
          `Expected ${this.config.dimensions} dimensions, got ${entry.embedding.length}`,
        );
      }
      this.store.set(entry.id, entry);
    }
    return entries.length;
  }

  async search(
    queryEmbedding: number[],
    topK: number = 10,
    filter?: Record<string, unknown>,
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = [];

    for (const [id, entry] of this.store) {
      if (filter && !this.matchesFilter(entry.metadata, filter)) continue;

      const score = this.computeSimilarity(queryEmbedding, entry.embedding);
      results.push({ id, score, metadata: entry.metadata });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async delete(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.store.delete(id)) deleted++;
    }
    return deleted;
  }

  async get(id: string): Promise<VectorEntry | null> {
    return this.store.get(id) ?? null;
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  private computeSimilarity(a: number[], b: number[]): number {
    if (this.config.metric === 'cosine') {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      const denom = Math.sqrt(normA) * Math.sqrt(normB);
      return denom === 0 ? 0 : dot / denom;
    }

    if (this.config.metric === 'dot_product') {
      let dot = 0;
      for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
      return dot;
    }

    // euclidean — return negative distance so higher = more similar
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return -Math.sqrt(sum);
  }

  private matchesFilter(
    metadata: Record<string, unknown>,
    filter: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) return false;
    }
    return true;
  }
}
