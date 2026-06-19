export interface EvaluationResult {
  trackId: string;
  overallScore: number;
  dimensions: {
    productionQuality: number;
    musicality: number;
    originality: number;
    genreAdherence: number;
    brandSafety: number;
  };
  pass: boolean;
  feedback: string[];
  evaluatedAt: Date;
}

export interface GuardrailResult {
  pass: boolean;
  score: number;
  flags: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}

export interface SafetyScore {
  overall: number;
  explicit: number;
  violence: number;
  hateSpeech: number;
  copyright: number;
  drugReferences: number;
}

export class QualityEvaluator {
  private passThreshold: number;

  constructor(passThreshold: number = 60) {
    this.passThreshold = passThreshold;
  }

  evaluate(track: {
    id: string;
    genre?: string;
    bpm?: number;
    durationMs?: number;
    aiGenerated?: boolean;
    metadata?: Record<string, unknown>;
  }): EvaluationResult {
    const productionQuality = this.scoreProduction(track);
    const musicality = this.scoreMusicality(track);
    const originality = this.scoreOriginality(track);
    const genreAdherence = this.scoreGenreAdherence(track);
    const brandSafety = 85;

    const overallScore = Math.round(
      productionQuality * 0.25 +
      musicality * 0.25 +
      originality * 0.2 +
      genreAdherence * 0.15 +
      brandSafety * 0.15,
    );

    const feedback: string[] = [];
    if (productionQuality < 50) feedback.push('Production quality needs improvement');
    if (musicality < 50) feedback.push('Musicality score is low — consider structural changes');
    if (originality < 40) feedback.push('Track may be too similar to existing content');
    if (genreAdherence < 40) feedback.push('Track does not strongly align with target genre');

    return {
      trackId: track.id,
      overallScore,
      dimensions: { productionQuality, musicality, originality, genreAdherence, brandSafety },
      pass: overallScore >= this.passThreshold,
      feedback,
      evaluatedAt: new Date(),
    };
  }

  private scoreProduction(track: Record<string, unknown>): number {
    let score = 70;
    if (track.bpm && typeof track.bpm === 'number' && track.bpm >= 60 && track.bpm <= 200) score += 10;
    if (track.durationMs && typeof track.durationMs === 'number' && track.durationMs >= 30000) score += 10;
    return Math.min(score, 100);
  }

  private scoreMusicality(track: Record<string, unknown>): number {
    let score = 65;
    if (track.durationMs && typeof track.durationMs === 'number' && track.durationMs >= 120000) score += 15;
    if (track.bpm) score += 10;
    return Math.min(score, 100);
  }

  private scoreOriginality(track: Record<string, unknown>): number {
    return track.aiGenerated ? 60 : 75;
  }

  private scoreGenreAdherence(track: Record<string, unknown>): number {
    return track.genre ? 80 : 50;
  }
}
