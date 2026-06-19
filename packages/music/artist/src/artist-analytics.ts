export interface ArtistProfile {
  id: string;
  name: string;
  genres: string[];
  territories: string[];
  totalStreams: number;
  monthlyListeners: number;
  trackCount: number;
  albumCount: number;
}

export interface ArtistMetrics {
  streamGrowthRate: number;
  engagementScore: number;
  territoryReach: number;
  genreDiversity: number;
  collaborationScore: number;
  trendScore: number;
}

export class ArtistAnalytics {
  async getProfile(artistId: string): Promise<ArtistProfile> {
    const hash = artistId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = hash % 1000;

    const allGenres = ['pop', 'rock', 'hip-hop', 'electronic', 'r&b', 'jazz', 'classical', 'country', 'latin', 'indie'];
    const allTerritories = ['US', 'GB', 'DE', 'FR', 'JP', 'BR', 'AU', 'CA', 'MX', 'KR', 'IN', 'SE', 'NL', 'ES', 'IT'];

    const genreCount = (seed % 3) + 1;
    const territoryCount = (seed % 5) + 3;

    const genres = allGenres.slice(seed % allGenres.length, (seed % allGenres.length) + genreCount);
    if (genres.length === 0) genres.push(allGenres[0]);

    const territories = allTerritories.slice(0, territoryCount);

    return {
      id: artistId,
      name: `Artist ${artistId}`,
      genres,
      territories,
      totalStreams: seed * 100000 + 500000,
      monthlyListeners: seed * 10000 + 50000,
      trackCount: (seed % 50) + 10,
      albumCount: (seed % 10) + 1,
    };
  }

  async calculateMetrics(artistId: string): Promise<ArtistMetrics> {
    const profile = await this.getProfile(artistId);

    const streamGrowthRate = Math.round((Math.random() * 0.4 - 0.1) * 1000) / 1000; // -0.1 to 0.3
    const engagementScore = Math.round((0.3 + Math.random() * 0.7) * 1000) / 1000;
    const territoryReach = Math.round((profile.territories.length / 15) * 1000) / 1000;
    const genreDiversity = Math.round((profile.genres.length / 5) * 1000) / 1000;
    const collaborationScore = Math.round((Math.random() * 0.8) * 1000) / 1000;
    const trendScore = Math.round(
      ((streamGrowthRate + 0.1) * 0.3 + engagementScore * 0.3 + territoryReach * 0.2 + genreDiversity * 0.2) * 1000,
    ) / 1000;

    return {
      streamGrowthRate,
      engagementScore,
      territoryReach,
      genreDiversity,
      collaborationScore,
      trendScore,
    };
  }

  async getTopTerritories(
    artistId: string,
    limit: number,
  ): Promise<{ territory: string; streams: number; percentage: number }[]> {
    const profile = await this.getProfile(artistId);
    const territories = profile.territories.slice(0, limit);

    let remainingPercentage = 100;
    const results: { territory: string; streams: number; percentage: number }[] = [];

    for (let i = 0; i < territories.length; i++) {
      const isLast = i === territories.length - 1;
      const percentage = isLast
        ? remainingPercentage
        : Math.round((remainingPercentage * (0.3 + Math.random() * 0.4)) * 10) / 10;

      remainingPercentage -= percentage;
      if (remainingPercentage < 0) remainingPercentage = 0;

      const streams = Math.round(profile.totalStreams * (percentage / 100));

      results.push({
        territory: territories[i],
        streams,
        percentage: Math.round(percentage * 10) / 10,
      });
    }

    return results.sort((a, b) => b.percentage - a.percentage);
  }

  async getSimilarArtists(
    artistId: string,
    limit: number,
  ): Promise<{ artistId: string; similarity: number }[]> {
    const results: { artistId: string; similarity: number }[] = [];
    const hash = artistId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < limit; i++) {
      const similarityBase = 0.4 + Math.random() * 0.5;
      const decay = i * 0.05;
      const similarity = Math.max(0.1, Math.round((similarityBase - decay) * 1000) / 1000);

      results.push({
        artistId: `artist_${(hash + i + 1) % 10000}`,
        similarity,
      });
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  async getFanDemographics(artistId: string): Promise<{
    ageGroups: Record<string, number>;
    genderSplit: Record<string, number>;
    topCountries: string[];
  }> {
    const profile = await this.getProfile(artistId);

    const ageGroups: Record<string, number> = {
      '13-17': Math.round(Math.random() * 15),
      '18-24': Math.round(20 + Math.random() * 20),
      '25-34': Math.round(20 + Math.random() * 20),
      '35-44': Math.round(10 + Math.random() * 15),
      '45-54': Math.round(5 + Math.random() * 10),
      '55+': Math.round(Math.random() * 8),
    };

    // Normalize age groups to sum to 100
    const ageTotal = Object.values(ageGroups).reduce((sum, v) => sum + v, 0);
    for (const key of Object.keys(ageGroups)) {
      ageGroups[key] = Math.round((ageGroups[key] / ageTotal) * 100);
    }

    const malePercent = 35 + Math.round(Math.random() * 30);
    const femalePercent = 100 - malePercent - 5;
    const otherPercent = 5;

    const genderSplit: Record<string, number> = {
      male: malePercent,
      female: femalePercent,
      other: otherPercent,
    };

    const topCountries = profile.territories.slice(0, 5);

    return {
      ageGroups,
      genderSplit,
      topCountries,
    };
  }
}
