export interface MoodProfile {
  primary: string;
  secondary?: string;
  energy: number;
  valence: number;
  intensity: number;
  tags: string[];
}

export type MoodCategory =
  | 'happy'
  | 'sad'
  | 'energetic'
  | 'calm'
  | 'angry'
  | 'romantic'
  | 'melancholic'
  | 'uplifting'
  | 'dark'
  | 'ethereal'
  | 'nostalgic'
  | 'triumphant';

const MOOD_SIMILARITY: Record<MoodCategory, MoodCategory[]> = {
  happy: ['uplifting', 'energetic', 'triumphant'],
  sad: ['melancholic', 'nostalgic', 'dark'],
  energetic: ['happy', 'uplifting', 'triumphant'],
  calm: ['ethereal', 'romantic', 'nostalgic'],
  angry: ['dark', 'energetic', 'triumphant'],
  romantic: ['calm', 'nostalgic', 'ethereal'],
  melancholic: ['sad', 'nostalgic', 'dark'],
  uplifting: ['happy', 'energetic', 'triumphant'],
  dark: ['angry', 'melancholic', 'sad'],
  ethereal: ['calm', 'romantic', 'nostalgic'],
  nostalgic: ['melancholic', 'romantic', 'calm'],
  triumphant: ['uplifting', 'energetic', 'happy'],
};

export class MoodAnalyzer {
  private moodKeywords: Map<MoodCategory, string[]>;

  constructor() {
    this.moodKeywords = new Map<MoodCategory, string[]>([
      ['happy', ['joy', 'cheerful', 'bright', 'sunny', 'playful', 'fun', 'lively', 'carefree', 'blissful', 'delightful']],
      ['sad', ['sorrow', 'tearful', 'heartbreak', 'lonely', 'grief', 'pain', 'blue', 'weeping', 'loss', 'despair']],
      ['energetic', ['power', 'fast', 'driving', 'intense', 'pumping', 'adrenaline', 'explosive', 'dynamic', 'fierce', 'vigorous']],
      ['calm', ['peaceful', 'serene', 'gentle', 'quiet', 'soothing', 'tranquil', 'relaxed', 'still', 'mellow', 'soft']],
      ['angry', ['rage', 'fury', 'aggressive', 'hostile', 'violent', 'harsh', 'brutal', 'savage', 'wrathful', 'furious']],
      ['romantic', ['love', 'passion', 'tender', 'intimate', 'desire', 'affection', 'sensual', 'sweet', 'devoted', 'amorous']],
      ['melancholic', ['wistful', 'bittersweet', 'pensive', 'reflective', 'somber', 'mournful', 'gloomy', 'forlorn', 'plaintive', 'longing']],
      ['uplifting', ['hopeful', 'inspiring', 'soaring', 'elevating', 'empowering', 'motivating', 'upbeat', 'optimistic', 'radiant', 'triumphant']],
      ['dark', ['ominous', 'sinister', 'brooding', 'menacing', 'haunting', 'eerie', 'foreboding', 'shadowy', 'grim', 'bleak']],
      ['ethereal', ['dreamy', 'floating', 'atmospheric', 'celestial', 'otherworldly', 'mystical', 'ambient', 'weightless', 'transcendent', 'heavenly']],
      ['nostalgic', ['memories', 'reminiscent', 'retro', 'vintage', 'sentimental', 'throwback', 'bygone', 'yesteryear', 'classic', 'timeless']],
      ['triumphant', ['victorious', 'glorious', 'majestic', 'epic', 'heroic', 'grand', 'powerful', 'conquering', 'mighty', 'exultant']],
    ]);
  }

  analyzeMood(features: {
    bpm: number;
    key: string;
    loudness: number;
    energy: number;
    valence: number;
  }): MoodProfile {
    const { bpm, key, loudness, energy, valence } = features;

    const isMinor = key.toLowerCase().includes('minor');
    const normalizedLoudness = Math.min(1, Math.max(0, (loudness + 60) / 60)); // assuming dB range -60 to 0
    const intensity = (energy + normalizedLoudness) / 2;

    let primary: MoodCategory;

    if (valence > 0.7 && energy > 0.7) {
      primary = 'happy';
    } else if (valence > 0.7 && energy < 0.4) {
      primary = 'calm';
    } else if (valence < 0.3 && energy > 0.7) {
      primary = 'angry';
    } else if (valence < 0.3 && energy < 0.4) {
      primary = 'sad';
    } else if (valence > 0.6 && energy > 0.5) {
      primary = 'uplifting';
    } else if (valence < 0.4 && isMinor) {
      primary = 'melancholic';
    } else if (energy > 0.8 && bpm > 140) {
      primary = 'energetic';
    } else if (energy < 0.3 && valence > 0.4) {
      primary = 'ethereal';
    } else if (energy > 0.7 && valence > 0.6) {
      primary = 'triumphant';
    } else if (valence > 0.4 && valence < 0.6 && energy < 0.5) {
      primary = 'nostalgic';
    } else if (valence < 0.4 && energy > 0.5) {
      primary = 'dark';
    } else {
      primary = 'romantic';
    }

    const similar = MOOD_SIMILARITY[primary];
    const secondary = similar.length > 0 ? similar[0] : undefined;

    const tags: string[] = [primary];
    if (secondary) tags.push(secondary);
    if (bpm > 120) tags.push('fast');
    if (bpm < 80) tags.push('slow');
    if (isMinor) tags.push('minor-key');
    if (energy > 0.7) tags.push('high-energy');
    if (energy < 0.3) tags.push('low-energy');

    return {
      primary,
      secondary,
      energy: Math.round(energy * 1000) / 1000,
      valence: Math.round(valence * 1000) / 1000,
      intensity: Math.round(intensity * 1000) / 1000,
      tags,
    };
  }

  classifyFromText(text: string): MoodCategory {
    const lowerText = text.toLowerCase();
    let bestMood: MoodCategory = 'calm';
    let bestScore = 0;

    for (const [mood, keywords] of this.moodKeywords.entries()) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMood = mood;
      }
    }

    return bestMood;
  }

  getMoodPlaylistCriteria(mood: MoodCategory): {
    bpmRange: [number, number];
    energyRange: [number, number];
    valenceRange: [number, number];
  } {
    const criteria: Record<MoodCategory, {
      bpmRange: [number, number];
      energyRange: [number, number];
      valenceRange: [number, number];
    }> = {
      happy: { bpmRange: [110, 140], energyRange: [0.6, 0.9], valenceRange: [0.7, 1.0] },
      sad: { bpmRange: [60, 90], energyRange: [0.1, 0.4], valenceRange: [0.0, 0.3] },
      energetic: { bpmRange: [130, 180], energyRange: [0.8, 1.0], valenceRange: [0.5, 0.9] },
      calm: { bpmRange: [60, 100], energyRange: [0.0, 0.3], valenceRange: [0.4, 0.7] },
      angry: { bpmRange: [120, 170], energyRange: [0.7, 1.0], valenceRange: [0.0, 0.3] },
      romantic: { bpmRange: [70, 110], energyRange: [0.2, 0.5], valenceRange: [0.5, 0.8] },
      melancholic: { bpmRange: [60, 100], energyRange: [0.1, 0.4], valenceRange: [0.1, 0.4] },
      uplifting: { bpmRange: [110, 150], energyRange: [0.5, 0.8], valenceRange: [0.6, 0.9] },
      dark: { bpmRange: [80, 130], energyRange: [0.4, 0.8], valenceRange: [0.0, 0.3] },
      ethereal: { bpmRange: [70, 110], energyRange: [0.0, 0.3], valenceRange: [0.3, 0.6] },
      nostalgic: { bpmRange: [80, 120], energyRange: [0.2, 0.5], valenceRange: [0.3, 0.6] },
      triumphant: { bpmRange: [120, 160], energyRange: [0.7, 1.0], valenceRange: [0.7, 1.0] },
    };

    return criteria[mood];
  }

  getSimilarMoods(mood: MoodCategory): MoodCategory[] {
    return MOOD_SIMILARITY[mood] ?? [];
  }
}
