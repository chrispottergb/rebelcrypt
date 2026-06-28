export interface MatchResult {
  matchType: 'exact_isrc' | 'fuzzy_title_artist' | 'fingerprint' | 'none';
  confidence: number;
  matchedTrackId: string | null;
}

export class TrackMatcher {
  matchByIsrc(isrc: string, catalog: Array<{ id: string; isrc: string | null }>): MatchResult {
    const normalized = isrc.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const match = catalog.find((t) => t.isrc === normalized);
    return match
      ? { matchType: 'exact_isrc', confidence: 1.0, matchedTrackId: match.id }
      : { matchType: 'none', confidence: 0, matchedTrackId: null };
  }

  fuzzyMatch(
    title: string,
    artist: string,
    catalog: Array<{ id: string; title: string; artist: string }>,
    threshold: number = 0.8,
  ): MatchResult {
    let bestMatch: MatchResult = { matchType: 'none', confidence: 0, matchedTrackId: null };

    for (const entry of catalog) {
      const titleSim = this.similarity(title.toLowerCase(), entry.title.toLowerCase());
      const artistSim = this.similarity(artist.toLowerCase(), entry.artist.toLowerCase());
      const combined = titleSim * 0.6 + artistSim * 0.4;

      if (combined > bestMatch.confidence && combined >= threshold) {
        bestMatch = {
          matchType: 'fuzzy_title_artist',
          confidence: combined,
          matchedTrackId: entry.id,
        };
      }
    }

    return bestMatch;
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    const longerLen = longer.length;
    if (longerLen === 0) return 1;

    return (longerLen - this.editDistance(longer, shorter)) / longerLen;
  }

  private editDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
