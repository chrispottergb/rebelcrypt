export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  defaultValues?: Record<string, string>;
}

const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: 'music_genre_classify',
    name: 'Music Genre Classification',
    category: 'music',
    systemPrompt: 'You are a music classification expert. Analyze the provided track metadata and classify its genre.',
    userPromptTemplate: 'Classify this track:\nTitle: {{title}}\nArtist: {{artist}}\nBPM: {{bpm}}\nKey: {{key}}\nMood: {{mood}}\n\nRespond with JSON: {"primary_genre": string, "secondary_genres": string[], "confidence": number}',
    variables: ['title', 'artist', 'bpm', 'key', 'mood'],
  },
  {
    id: 'music_quality_score',
    name: 'AI Music Quality Scoring',
    category: 'evaluation',
    systemPrompt: 'You are an expert music evaluator. Score AI-generated music on production quality, musicality, and originality.',
    userPromptTemplate: 'Evaluate this AI-generated track:\nGenre: {{genre}}\nDuration: {{duration}}s\nBPM: {{bpm}}\nGeneration Model: {{model}}\n\nScore 0-100 on: production_quality, musicality, originality, genre_adherence. Respond with JSON.',
    variables: ['genre', 'duration', 'bpm', 'model'],
  },
  {
    id: 'exec_narrative',
    name: 'Executive KPI Narrative',
    category: 'executive',
    systemPrompt: 'You are a music industry analytics expert. Generate concise executive narratives from KPI data.',
    userPromptTemplate: 'Generate an executive summary for {{period}}:\n\nKPIs:\n{{kpi_data}}\n\nTrends:\n{{trends}}\n\nWrite 3-5 bullet points highlighting key insights and recommended actions.',
    variables: ['period', 'kpi_data', 'trends'],
  },
  {
    id: 'royalty_analysis',
    name: 'Royalty Analysis Report',
    category: 'rights',
    systemPrompt: 'You are a music rights and royalties expert. Analyze royalty data and provide insights.',
    userPromptTemplate: 'Analyze royalty data for {{period}}:\n\nTotal Revenue: {{total_revenue}}\nTop Territories: {{territories}}\nTop Artists: {{artists}}\nStreaming vs Sync: {{breakdown}}\n\nProvide analysis and forecasts.',
    variables: ['period', 'total_revenue', 'territories', 'artists', 'breakdown'],
  },
  {
    id: 'playlist_generate',
    name: 'Playlist Generator',
    category: 'music',
    systemPrompt: 'You are a music curation expert. Generate playlist recommendations based on mood, genre, and context.',
    userPromptTemplate: 'Create a {{length}}-track playlist for:\nMood: {{mood}}\nGenre: {{genre}}\nContext: {{context}}\nLanguage preference: {{language}}\n\nReturn JSON array of track suggestions with title, artist, and reason.',
    variables: ['length', 'mood', 'genre', 'context', 'language'],
  },
  {
    id: 'brand_safety',
    name: 'Brand Safety Check',
    category: 'guardrails',
    systemPrompt: 'You are a content safety reviewer for music. Check content for brand safety concerns.',
    userPromptTemplate: 'Evaluate brand safety for:\nTrack: {{title}} by {{artist}}\nLyrics excerpt: {{lyrics}}\nGenre: {{genre}}\n\nCheck for: explicit content, hate speech, violence, drug references, copyright issues. Return JSON: {"safe": boolean, "score": 0-100, "flags": string[]}',
    variables: ['title', 'artist', 'lyrics', 'genre'],
  },
];

export class PromptTemplateEngine {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map(BUILT_IN_TEMPLATES.map((t) => [t.id, t]));
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(category?: string): PromptTemplate[] {
    const all = Array.from(this.templates.values());
    return category ? all.filter((t) => t.category === category) : all;
  }

  render(templateId: string, variables: Record<string, string>): { system: string; user: string } {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const merged = { ...template.defaultValues, ...variables };
    let userPrompt = template.userPromptTemplate;

    for (const [key, value] of Object.entries(merged)) {
      userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return { system: template.systemPrompt, user: userPrompt };
  }

  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  get count(): number {
    return this.templates.size;
  }
}
