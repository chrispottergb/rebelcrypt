export type EmbeddingVector = number[];

export type EmbeddingModel =
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'text-embedding-ada-002'
  | 'voyage-music-2'
  | 'cohere-embed-v3'
  | 'local-e5';

export interface EmbeddingRequest {
  text: string;
  model?: EmbeddingModel;
  dimensions?: number;
}

export interface EmbeddingResult {
  vector: EmbeddingVector;
  model: string;
  dimensions: number;
  tokensUsed: number;
  latencyMs: number;
}

export interface SimilarityResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class EmbeddingService {
  private defaultModel: EmbeddingModel;
  private defaultDimensions: number;

  constructor(config?: { model?: EmbeddingModel; dimensions?: number }) {
    this.defaultModel = config?.model ?? 'text-embedding-3-small';
    this.defaultDimensions = config?.dimensions ?? 1536;
  }

  async generate(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const model = request.model ?? this.defaultModel;
    const dimensions = request.dimensions ?? this.defaultDimensions;

    const rawVector: EmbeddingVector = Array.from({ length: dimensions }, () =>
      Math.random() * 2 - 1
    );

    const vector = this.normalizeVector(rawVector);
    const tokensUsed = Math.ceil(request.text.length / 4);
    const latencyMs = Date.now() - startTime;

    return {
      vector,
      model,
      dimensions,
      tokensUsed,
      latencyMs,
    };
  }

  async batchGenerate(requests: EmbeddingRequest[]): Promise<EmbeddingResult[]> {
    return Promise.all(requests.map((request) => this.generate(request)));
  }

  cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimensions must match: ${a.length} !== ${b.length}`
      );
    }

    const dot = this.dotProduct(a, b);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dot / (magnitudeA * magnitudeB);
  }

  euclideanDistance(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimensions must match: ${a.length} !== ${b.length}`
      );
    }

    const sumSquares = a.reduce(
      (sum, val, i) => sum + (val - b[i]) * (val - b[i]),
      0
    );

    return Math.sqrt(sumSquares);
  }

  dotProduct(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) {
      throw new Error(
        `Vector dimensions must match: ${a.length} !== ${b.length}`
      );
    }

    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  async findSimilar(
    query: EmbeddingVector,
    candidates: {
      id: string;
      vector: EmbeddingVector;
      metadata?: Record<string, unknown>;
    }[],
    topK: number,
    metric: 'cosine' | 'euclidean' | 'dot' = 'cosine'
  ): Promise<SimilarityResult[]> {
    const scored: SimilarityResult[] = candidates.map((candidate) => {
      let score: number;

      switch (metric) {
        case 'cosine':
          score = this.cosineSimilarity(query, candidate.vector);
          break;
        case 'euclidean':
          score = -this.euclideanDistance(query, candidate.vector);
          break;
        case 'dot':
          score = this.dotProduct(query, candidate.vector);
          break;
      }

      return {
        id: candidate.id,
        score,
        metadata: candidate.metadata,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  private normalizeVector(v: EmbeddingVector): EmbeddingVector {
    const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));

    if (magnitude === 0) {
      return v;
    }

    return v.map((val) => val / magnitude);
  }
}
