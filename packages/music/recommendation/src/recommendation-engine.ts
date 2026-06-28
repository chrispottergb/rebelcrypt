export interface UserPreferences {
  favoriteGenres: string[];
  recentlyPlayed: string[];
  likedTracks: string[];
  dislikedTracks: string[];
  preferredBpm?: { min: number; max: number };
  preferredMoods?: string[];
  language?: string;
}

export interface RecommendationResult {
  trackId: string;
  score: number;
  reason: string;
  factors: {
    genre: number;
    mood: number;
    tempo: number;
    artist: number;
    collaborative: number;
  };
}

export type RecommendationStrategy =
  | 'content_based'
  | 'collaborative'
  | 'hybrid'
  | 'trending'
  | 'discovery';

export class RecommendationEngine {
  async recommend(
    userId: string,
    preferences: UserPreferences,
    strategy: RecommendationStrategy,
    limit: number,
  ): Promise<RecommendationResult[]> {
    switch (strategy) {
      case 'content_based':
        return this.contentBasedRecommend(preferences, limit);
      case 'collaborative':
        return this.collaborativeRecommend(userId, limit);
      case 'hybrid':
        return this.hybridRecommend(userId, preferences, limit);
      case 'trending':
        return this.generateTrendingResults(limit);
      case 'discovery':
        return this.generateDiscoveryResults(preferences, limit);
      default:
        return this.hybridRecommend(userId, preferences, limit);
    }
  }

  private contentBasedRecommend(
    preferences: UserPreferences,
    limit: number,
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];

    for (let i = 0; i < limit; i++) {
      const genreScore = preferences.favoriteGenres.length > 0 ? 0.6 + Math.random() * 0.4 : 0.3;
      const moodScore = preferences.preferredMoods?.length ? 0.5 + Math.random() * 0.5 : 0.2;
      const tempoScore = preferences.preferredBpm ? 0.5 + Math.random() * 0.5 : 0.3;

      results.push({
        trackId: `track_cb_${Date.now()}_${i}`,
        score: Math.round((genreScore * 0.4 + moodScore * 0.3 + tempoScore * 0.3) * 1000) / 1000,
        reason: `Matches your preference for ${preferences.favoriteGenres[0] ?? 'diverse'} music`,
        factors: {
          genre: Math.round(genreScore * 1000) / 1000,
          mood: Math.round(moodScore * 1000) / 1000,
          tempo: Math.round(tempoScore * 1000) / 1000,
          artist: Math.round(Math.random() * 1000) / 1000,
          collaborative: 0,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private collaborativeRecommend(
    userId: string,
    limit: number,
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];
    const userHash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < limit; i++) {
      const collaborativeScore = 0.4 + Math.random() * 0.6;
      const seed = (userHash + i) % 100 / 100;

      results.push({
        trackId: `track_cf_${Date.now()}_${i}`,
        score: Math.round(collaborativeScore * 1000) / 1000,
        reason: 'Popular among listeners with similar taste',
        factors: {
          genre: Math.round(seed * 0.5 * 1000) / 1000,
          mood: Math.round(seed * 0.3 * 1000) / 1000,
          tempo: Math.round(seed * 0.2 * 1000) / 1000,
          artist: Math.round(seed * 0.4 * 1000) / 1000,
          collaborative: Math.round(collaborativeScore * 1000) / 1000,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private hybridRecommend(
    userId: string,
    preferences: UserPreferences,
    limit: number,
  ): RecommendationResult[] {
    const contentResults = this.contentBasedRecommend(preferences, limit);
    const collabResults = this.collaborativeRecommend(userId, limit);

    const hybridResults: RecommendationResult[] = [];

    for (let i = 0; i < limit; i++) {
      const content = contentResults[i % contentResults.length];
      const collab = collabResults[i % collabResults.length];

      const combinedScore = content.score * 0.6 + collab.score * 0.4;

      hybridResults.push({
        trackId: `track_hy_${Date.now()}_${i}`,
        score: Math.round(combinedScore * 1000) / 1000,
        reason: 'Based on your taste and similar listeners',
        factors: {
          genre: Math.round(((content.factors.genre + collab.factors.genre) / 2) * 1000) / 1000,
          mood: Math.round(((content.factors.mood + collab.factors.mood) / 2) * 1000) / 1000,
          tempo: Math.round(((content.factors.tempo + collab.factors.tempo) / 2) * 1000) / 1000,
          artist: Math.round(((content.factors.artist + collab.factors.artist) / 2) * 1000) / 1000,
          collaborative: Math.round(collab.factors.collaborative * 0.4 * 1000) / 1000,
        },
      });
    }

    return hybridResults.sort((a, b) => b.score - a.score);
  }

  private generateTrendingResults(limit: number): RecommendationResult[] {
    const results: RecommendationResult[] = [];

    for (let i = 0; i < limit; i++) {
      const trendScore = 0.7 + Math.random() * 0.3;

      results.push({
        trackId: `track_tr_${Date.now()}_${i}`,
        score: Math.round(trendScore * 1000) / 1000,
        reason: 'Trending right now',
        factors: {
          genre: Math.round(Math.random() * 0.5 * 1000) / 1000,
          mood: Math.round(Math.random() * 0.5 * 1000) / 1000,
          tempo: Math.round(Math.random() * 0.3 * 1000) / 1000,
          artist: Math.round(Math.random() * 0.6 * 1000) / 1000,
          collaborative: Math.round(trendScore * 1000) / 1000,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private generateDiscoveryResults(
    preferences: UserPreferences,
    limit: number,
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];

    for (let i = 0; i < limit; i++) {
      const discoveryScore = 0.3 + Math.random() * 0.7;

      results.push({
        trackId: `track_ds_${Date.now()}_${i}`,
        score: Math.round(discoveryScore * 1000) / 1000,
        reason: `Explore something new outside your usual ${preferences.favoriteGenres[0] ?? 'genres'}`,
        factors: {
          genre: Math.round(Math.random() * 0.3 * 1000) / 1000,
          mood: Math.round(Math.random() * 0.6 * 1000) / 1000,
          tempo: Math.round(Math.random() * 0.4 * 1000) / 1000,
          artist: Math.round(Math.random() * 0.2 * 1000) / 1000,
          collaborative: Math.round(Math.random() * 0.5 * 1000) / 1000,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async getSimilarTracks(
    trackId: string,
    limit: number,
  ): Promise<RecommendationResult[]> {
    const results: RecommendationResult[] = [];
    const trackHash = trackId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < limit; i++) {
      const similarity = 0.5 + Math.random() * 0.5;
      const seed = (trackHash + i) % 100 / 100;

      results.push({
        trackId: `track_sim_${Date.now()}_${i}`,
        score: Math.round(similarity * 1000) / 1000,
        reason: `Similar audio characteristics to ${trackId}`,
        factors: {
          genre: Math.round((seed * 0.8) * 1000) / 1000,
          mood: Math.round((seed * 0.7) * 1000) / 1000,
          tempo: Math.round((seed * 0.6) * 1000) / 1000,
          artist: Math.round((seed * 0.3) * 1000) / 1000,
          collaborative: Math.round((seed * 0.4) * 1000) / 1000,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  async getPersonalizedPlaylist(
    userId: string,
    preferences: UserPreferences,
    playlistLength: number,
  ): Promise<RecommendationResult[]> {
    // Build a playlist mixing strategies for variety
    const hybridCount = Math.ceil(playlistLength * 0.5);
    const discoveryCount = Math.ceil(playlistLength * 0.3);
    const trendingCount = playlistLength - hybridCount - discoveryCount;

    const hybridTracks = this.hybridRecommend(userId, preferences, hybridCount);
    const discoveryTracks = this.generateDiscoveryResults(preferences, discoveryCount);
    const trendingTracks = this.generateTrendingResults(trendingCount);

    const playlist = [...hybridTracks, ...discoveryTracks, ...trendingTracks];

    // Interleave for variety rather than grouping by strategy
    const interleaved: RecommendationResult[] = [];
    const sources = [hybridTracks, discoveryTracks, trendingTracks];
    let maxLen = Math.max(...sources.map((s) => s.length));

    for (let i = 0; i < maxLen; i++) {
      for (const source of sources) {
        if (i < source.length) {
          interleaved.push(source[i]);
        }
      }
    }

    return interleaved.slice(0, playlistLength);
  }
}
