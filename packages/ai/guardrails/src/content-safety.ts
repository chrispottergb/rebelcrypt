export type SafetyCategory =
  | 'explicit'
  | 'hate_speech'
  | 'violence'
  | 'self_harm'
  | 'sexual'
  | 'harassment'
  | 'dangerous'
  | 'copyright';

export interface SafetyCheckResult {
  safe: boolean;
  categories: {
    category: SafetyCategory;
    detected: boolean;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  overallScore: number;
  flags: string[];
  recommendations: string[];
}

const CATEGORY_KEYWORDS: Record<SafetyCategory, string[]> = {
  explicit: ['explicit', 'profanity', 'obscene', 'vulgar', 'crude', 'graphic'],
  hate_speech: [
    'hate',
    'slur',
    'bigot',
    'racist',
    'discriminat',
    'supremac',
    'xenophob',
  ],
  violence: [
    'kill',
    'murder',
    'assault',
    'weapon',
    'blood',
    'brutal',
    'attack',
    'shoot',
    'stab',
  ],
  self_harm: [
    'suicide',
    'self-harm',
    'cutting',
    'overdose',
    'end my life',
    'hurt myself',
  ],
  sexual: [
    'sexual',
    'pornograph',
    'nude',
    'erotic',
    'indecent',
    'lewd',
  ],
  harassment: [
    'harass',
    'bully',
    'stalk',
    'threaten',
    'intimidat',
    'torment',
  ],
  dangerous: [
    'bomb',
    'explosive',
    'poison',
    'illegal drug',
    'trafficking',
    'smuggl',
  ],
  copyright: [
    'copyright',
    'pirat',
    'stolen',
    'plagiari',
    'infring',
    'unauthorized copy',
  ],
};

const MUSIC_SPECIFIC_KEYWORDS: Record<string, SafetyCategory> = {
  'sample without clearance': 'copyright',
  'unlicensed sample': 'copyright',
  'bootleg': 'copyright',
  'uncredited interpolation': 'copyright',
  'ghost production': 'copyright',
};

const ALL_CATEGORIES: SafetyCategory[] = [
  'explicit',
  'hate_speech',
  'violence',
  'self_harm',
  'sexual',
  'harassment',
  'dangerous',
  'copyright',
];

const DEFAULT_THRESHOLDS: Record<SafetyCategory, number> = {
  explicit: 0.5,
  hate_speech: 0.3,
  violence: 0.4,
  self_harm: 0.2,
  sexual: 0.4,
  harassment: 0.3,
  dangerous: 0.3,
  copyright: 0.4,
};

export class ContentSafetyChecker {
  private thresholds: Map<SafetyCategory, number>;

  constructor(customThresholds?: Partial<Record<SafetyCategory, number>>) {
    this.thresholds = new Map<SafetyCategory, number>();

    for (const category of ALL_CATEGORIES) {
      this.thresholds.set(
        category,
        customThresholds?.[category] ?? DEFAULT_THRESHOLDS[category]
      );
    }
  }

  async checkText(text: string): Promise<SafetyCheckResult> {
    const categories = ALL_CATEGORIES.map((category) => ({
      category,
      ...this.detectCategory(text, category),
    }));

    const detectedCategories = categories.filter((c) => c.detected);
    const overallScore =
      detectedCategories.length > 0
        ? Math.max(...detectedCategories.map((c) => c.confidence))
        : 0;

    const flags: string[] = detectedCategories.map(
      (c) => `${c.category}:${c.severity}`
    );

    const recommendations: string[] = [];
    if (detectedCategories.some((c) => c.severity === 'critical')) {
      recommendations.push('Content should be blocked immediately.');
    }
    if (detectedCategories.some((c) => c.severity === 'high')) {
      recommendations.push('Content requires manual review before publishing.');
    }
    if (detectedCategories.some((c) => c.severity === 'medium')) {
      recommendations.push(
        'Content may need age-gating or content warnings.'
      );
    }
    if (detectedCategories.some((c) => c.severity === 'low')) {
      recommendations.push(
        'Content is borderline; consider context before publishing.'
      );
    }
    if (detectedCategories.length === 0) {
      recommendations.push('Content appears safe for general audiences.');
    }

    const safe = detectedCategories.every((c) => {
      const threshold = this.thresholds.get(c.category) ?? 0.5;
      return c.confidence < threshold;
    });

    return {
      safe,
      categories,
      overallScore,
      flags,
      recommendations,
    };
  }

  async checkLyrics(lyrics: string): Promise<SafetyCheckResult> {
    const baseResult = await this.checkText(lyrics);

    const lowerLyrics = lyrics.toLowerCase();
    const additionalFlags: string[] = [];
    const additionalCategories = [...baseResult.categories];

    for (const [keyword, category] of Object.entries(MUSIC_SPECIFIC_KEYWORDS)) {
      if (lowerLyrics.includes(keyword)) {
        const existingCategory = additionalCategories.find(
          (c) => c.category === category
        );
        if (existingCategory && !existingCategory.detected) {
          existingCategory.detected = true;
          existingCategory.confidence = 0.7;
          existingCategory.severity = 'medium';
          additionalFlags.push(`music_specific:${keyword}`);
        }
      }
    }

    const repeatedLines = this.detectExcessiveRepetition(lyrics);
    if (repeatedLines) {
      additionalFlags.push('excessive_repetition');
    }

    const allFlags = [...baseResult.flags, ...additionalFlags];

    const detectedCategories = additionalCategories.filter((c) => c.detected);
    const safe = detectedCategories.every((c) => {
      const threshold = this.thresholds.get(c.category) ?? 0.5;
      return c.confidence < threshold;
    });

    const overallScore =
      detectedCategories.length > 0
        ? Math.max(...detectedCategories.map((c) => c.confidence))
        : 0;

    return {
      safe,
      categories: additionalCategories,
      overallScore,
      flags: allFlags,
      recommendations: baseResult.recommendations,
    };
  }

  async checkMetadata(metadata: {
    title: string;
    artist: string;
    tags?: string[];
  }): Promise<SafetyCheckResult> {
    const combinedText = [
      metadata.title,
      metadata.artist,
      ...(metadata.tags ?? []),
    ].join(' ');

    return this.checkText(combinedText);
  }

  private detectCategory(
    text: string,
    category: SafetyCategory
  ): {
    detected: boolean;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  } {
    const keywords = CATEGORY_KEYWORDS[category];
    const lowerText = text.toLowerCase();

    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount === 0) {
      return { detected: false, confidence: 0, severity: 'low' };
    }

    const confidence = Math.min(matchCount / keywords.length, 1);

    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (confidence >= 0.8) {
      severity = 'critical';
    } else if (confidence >= 0.5) {
      severity = 'high';
    } else if (confidence >= 0.3) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    return { detected: true, confidence, severity };
  }

  setThreshold(category: SafetyCategory, threshold: number): void {
    this.thresholds.set(category, threshold);
  }

  getCategories(): SafetyCategory[] {
    return [...ALL_CATEGORIES];
  }

  private detectExcessiveRepetition(text: string): boolean {
    const lines = text
      .split('\n')
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length > 0);

    if (lines.length < 4) {
      return false;
    }

    const counts = new Map<string, number>();
    for (const line of lines) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      if (count / lines.length > 0.5) {
        return true;
      }
    }

    return false;
  }
}
