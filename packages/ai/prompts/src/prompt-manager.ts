export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptExecution {
  templateId: string;
  variables: Record<string, string>;
  renderedPrompt: string;
  executedAt: Date;
  tokensUsed: number;
  latencyMs: number;
}

export class PromptManager {
  private templates: Map<string, PromptTemplate>;
  private executionHistory: PromptExecution[] = [];

  constructor() {
    this.templates = new Map<string, PromptTemplate>();
    this.registerBuiltInTemplates();
  }

  registerTemplate(
    template: Omit<PromptTemplate, 'createdAt' | 'updatedAt'>
  ): PromptTemplate {
    const now = new Date();
    const fullTemplate: PromptTemplate = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(template.id, fullTemplate);
    return fullTemplate;
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  renderPrompt(
    templateId: string,
    variables: Record<string, string>
  ): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const startTime = Date.now();

    let rendered = template.template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value
      );
    }

    const latencyMs = Date.now() - startTime;
    const tokensUsed = Math.ceil(rendered.length / 4);

    this.executionHistory.push({
      templateId,
      variables,
      renderedPrompt: rendered,
      executedAt: new Date(),
      tokensUsed,
      latencyMs,
    });

    return rendered;
  }

  listTemplates(category?: string): PromptTemplate[] {
    const all = Array.from(this.templates.values());
    if (category) {
      return all.filter((t) => t.category === category);
    }
    return all;
  }

  updateTemplate(
    id: string,
    updates: Partial<PromptTemplate>
  ): PromptTemplate {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`Template not found: ${id}`);
    }

    const updated: PromptTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    if (updates.template) {
      updated.variables = this.extractVariables(updates.template);
    }

    this.templates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  validateVariables(
    templateId: string,
    variables: Record<string, string>
  ): { valid: boolean; missing: string[]; extra: string[] } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const requiredVars = new Set(template.variables);
    const providedVars = new Set(Object.keys(variables));

    const missing = [...requiredVars].filter((v) => !providedVars.has(v));
    const extra = [...providedVars].filter((v) => !requiredVars.has(v));

    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  }

  getExecutionHistory(): PromptExecution[] {
    return [...this.executionHistory];
  }

  private extractVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) {
      return [];
    }

    const variables = matches.map((m) => m.slice(2, -2));
    return [...new Set(variables)];
  }

  private registerBuiltInTemplates(): void {
    this.registerTemplate({
      id: 'music_analysis',
      name: 'Music Analysis',
      template:
        'Analyze the following music track in detail.\n\n' +
        'Track: {{track_name}}\n' +
        'Artist: {{artist_name}}\n' +
        'Genre: {{genre}}\n\n' +
        'Provide a comprehensive analysis covering:\n' +
        '1. Musical structure and composition\n' +
        '2. Instrumentation and production techniques\n' +
        '3. Harmonic and melodic characteristics\n' +
        '4. Rhythmic patterns and tempo\n' +
        '5. Overall artistic merit and cultural significance',
      variables: ['track_name', 'artist_name', 'genre'],
      category: 'analysis',
      version: 1,
    });

    this.registerTemplate({
      id: 'genre_classification',
      name: 'Genre Classification',
      template:
        'Classify the following music description into appropriate genres and subgenres.\n\n' +
        'Description: {{description}}\n' +
        'Audio Features: {{audio_features}}\n\n' +
        'Provide:\n' +
        '1. Primary genre\n' +
        '2. Secondary genres\n' +
        '3. Subgenre classifications\n' +
        '4. Confidence scores for each classification\n' +
        '5. Similar artists in the classified genres',
      variables: ['description', 'audio_features'],
      category: 'classification',
      version: 1,
    });

    this.registerTemplate({
      id: 'mood_detection',
      name: 'Mood Detection',
      template:
        'Detect the mood and emotional characteristics of the following music.\n\n' +
        'Track: {{track_name}}\n' +
        'Lyrics: {{lyrics}}\n' +
        'Audio Characteristics: {{audio_characteristics}}\n\n' +
        'Analyze and provide:\n' +
        '1. Primary mood (e.g., happy, sad, energetic, calm)\n' +
        '2. Emotional valence (positive/negative scale)\n' +
        '3. Energy level\n' +
        '4. Emotional arc throughout the track\n' +
        '5. Suggested use cases (workout, study, relaxation, etc.)',
      variables: ['track_name', 'lyrics', 'audio_characteristics'],
      category: 'analysis',
      version: 1,
    });

    this.registerTemplate({
      id: 'lyric_generation',
      name: 'Lyric Generation',
      template:
        'Generate original song lyrics based on the following parameters.\n\n' +
        'Theme: {{theme}}\n' +
        'Genre: {{genre}}\n' +
        'Mood: {{mood}}\n' +
        'Structure: {{structure}}\n\n' +
        'Requirements:\n' +
        '1. Follow the specified song structure\n' +
        '2. Maintain consistent theme and mood throughout\n' +
        '3. Include rhyme schemes appropriate for the genre\n' +
        '4. Create memorable hooks and choruses\n' +
        '5. Ensure lyrics are original and not derivative of existing works',
      variables: ['theme', 'genre', 'mood', 'structure'],
      category: 'generation',
      version: 1,
    });

    this.registerTemplate({
      id: 'artist_bio',
      name: 'Artist Biography',
      template:
        'Write a compelling artist biography based on the following information.\n\n' +
        'Artist Name: {{artist_name}}\n' +
        'Genre: {{genre}}\n' +
        'Career Highlights: {{career_highlights}}\n' +
        'Style Description: {{style_description}}\n\n' +
        'The biography should:\n' +
        '1. Be engaging and professionally written\n' +
        '2. Highlight the artist\'s unique qualities\n' +
        '3. Include relevant career milestones\n' +
        '4. Appeal to both fans and industry professionals\n' +
        '5. Be suitable for streaming platforms and press kits',
      variables: ['artist_name', 'genre', 'career_highlights', 'style_description'],
      category: 'generation',
      version: 1,
    });

    this.registerTemplate({
      id: 'playlist_description',
      name: 'Playlist Description',
      template:
        'Create an engaging playlist description.\n\n' +
        'Playlist Name: {{playlist_name}}\n' +
        'Theme: {{theme}}\n' +
        'Track Count: {{track_count}}\n' +
        'Target Audience: {{target_audience}}\n\n' +
        'The description should:\n' +
        '1. Capture the essence and mood of the playlist\n' +
        '2. Appeal to the target audience\n' +
        '3. Be concise yet evocative (2-3 sentences)\n' +
        '4. Include relevant keywords for discoverability\n' +
        '5. Encourage listeners to press play',
      variables: ['playlist_name', 'theme', 'track_count', 'target_audience'],
      category: 'generation',
      version: 1,
    });
  }
}
