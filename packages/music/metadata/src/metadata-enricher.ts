export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  iswc?: string;
  bpm?: number;
  key?: string;
  genre?: string;
  subgenre?: string;
  language?: string;
  releaseDate?: string;
  duration?: number;
  tags?: string[];
}

export interface EnrichedMetadata extends TrackMetadata {
  confidence: number;
  sources: string[];
  normalizedTitle: string;
  normalizedArtist: string;
  estimatedPopularity?: number;
}

export class MetadataEnricher {
  async enrich(metadata: TrackMetadata): Promise<EnrichedMetadata> {
    const normalizedTitle = this.normalizeTitle(metadata.title);
    const normalizedArtist = this.normalizeArtist(metadata.artist);

    let confidence = 0.5;
    const sources: string[] = ['internal'];

    // Boost confidence for more complete metadata
    if (metadata.isrc && this.validateIsrc(metadata.isrc)) {
      confidence += 0.15;
      sources.push('isrc-registry');
    }
    if (metadata.album) confidence += 0.05;
    if (metadata.bpm) confidence += 0.05;
    if (metadata.key) confidence += 0.05;
    if (metadata.genre) confidence += 0.05;
    if (metadata.releaseDate) confidence += 0.05;
    if (metadata.duration) confidence += 0.05;
    if (metadata.tags && metadata.tags.length > 0) confidence += 0.05;

    confidence = Math.min(1, confidence);

    // Estimate popularity based on available metadata completeness
    const estimatedPopularity = Math.round(confidence * 70 + Math.random() * 30);

    // Detect language if not provided
    const language = metadata.language ?? this.detectLanguage(metadata.title);

    return {
      ...metadata,
      language,
      confidence: Math.round(confidence * 1000) / 1000,
      sources,
      normalizedTitle,
      normalizedArtist,
      estimatedPopularity,
    };
  }

  normalizeTitle(title: string): string {
    return title
      .trim()
      .split(/\s+/)
      .map((word) => {
        if (['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'of', 'for', 'with'].includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ')
      .replace(/^\w/, (c) => c.toUpperCase()); // Ensure first word is capitalized
  }

  normalizeArtist(artist: string): string {
    return artist
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  validateIsrc(isrc: string): boolean {
    // ISRC format: XX-XXX-XX-XXXXX (country-registrant-year-designation)
    const isrcPattern = /^[A-Z]{2}-[A-Z0-9]{3}-[0-9]{2}-[0-9]{5}$/;
    return isrcPattern.test(isrc);
  }

  async batchEnrich(tracks: TrackMetadata[]): Promise<EnrichedMetadata[]> {
    const results = await Promise.all(
      tracks.map((track) => this.enrich(track)),
    );
    return results;
  }

  detectLanguage(text: string): string {
    // Simple heuristic based on character ranges

    // CJK Unified Ideographs
    if (/[一-鿿]/.test(text)) {
      // Distinguish Chinese from Japanese by checking for Hiragana/Katakana
      if (/[぀-ゟ゠-ヿ]/.test(text)) {
        return 'ja';
      }
      return 'zh';
    }

    // Korean Hangul
    if (/[가-힯ᄀ-ᇿ]/.test(text)) {
      return 'ko';
    }

    // Japanese Hiragana or Katakana (without CJK)
    if (/[぀-ゟ゠-ヿ]/.test(text)) {
      return 'ja';
    }

    // Cyrillic
    if (/[Ѐ-ӿ]/.test(text)) {
      return 'ru';
    }

    // Arabic
    if (/[؀-ۿ]/.test(text)) {
      return 'ar';
    }

    // Devanagari
    if (/[ऀ-ॿ]/.test(text)) {
      return 'hi';
    }

    // Thai
    if (/[฀-๿]/.test(text)) {
      return 'th';
    }

    // Default to English for Latin script
    return 'en';
  }
}
