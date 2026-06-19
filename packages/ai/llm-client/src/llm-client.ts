export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'local';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: LLMProvider;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  latencyMs: number;
  cost: number;
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5': { input: 0.0008, output: 0.004 },
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'command-r-plus': { input: 0.003, output: 0.015 },
};

export class LLMClient {
  private config: LLMConfig;
  private totalCost = 0;
  private totalTokens = 0;
  private requestCount = 0;

  constructor(config: Partial<LLMConfig> & { provider: LLMProvider }) {
    this.config = {
      provider: config.provider,
      model: config.model ?? this.defaultModel(config.provider),
      apiKey: config.apiKey ?? '',
      baseUrl: config.baseUrl,
      maxTokens: config.maxTokens ?? 2048,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 1,
      frequencyPenalty: config.frequencyPenalty ?? 0,
      presencePenalty: config.presencePenalty ?? 0,
      timeout: config.timeout ?? 30000,
    };
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    this.requestCount++;

    const maxTokens = request.maxTokens ?? this.config.maxTokens;
    const promptTokens = this.estimateTokens(request.messages.map((m) => m.content).join(' '));
    const completionTokens = Math.min(maxTokens, 500);

    const latencyMs = Date.now() - startTime;
    const cost = this.estimateCost(promptTokens, completionTokens);
    this.totalCost += cost;
    this.totalTokens += promptTokens + completionTokens;

    return {
      text: `[LLM response from ${this.config.provider}/${this.config.model}]`,
      model: this.config.model,
      provider: this.config.provider,
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      finishReason: 'stop',
      latencyMs,
      cost,
    };
  }

  async summarize(text: string, maxLength: number = 200): Promise<LLMResponse> {
    return this.generate({
      messages: [
        { role: 'system', content: `Summarize the following text in ${maxLength} words or fewer.` },
        { role: 'user', content: text },
      ],
    });
  }

  async classify(text: string, labels: string[]): Promise<LLMResponse> {
    return this.generate({
      messages: [
        { role: 'system', content: `Classify the following text into one of these categories: ${labels.join(', ')}. Respond with only the category name.` },
        { role: 'user', content: text },
      ],
      temperature: 0,
    });
  }

  async score(content: string, criteria: string): Promise<LLMResponse> {
    return this.generate({
      messages: [
        { role: 'system', content: `Score the following content on a scale of 0-100 based on: ${criteria}. Respond with a JSON object: {"score": number, "reasoning": string}` },
        { role: 'user', content: content },
      ],
      temperature: 0,
    });
  }

  getStats(): { totalCost: number; totalTokens: number; requestCount: number } {
    return { totalCost: this.totalCost, totalTokens: this.totalTokens, requestCount: this.requestCount };
  }

  private defaultModel(provider: LLMProvider): string {
    const defaults: Record<LLMProvider, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-6',
      google: 'gemini-2.5-pro',
      cohere: 'command-r-plus',
      local: 'llama-3',
    };
    return defaults[provider];
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateCost(promptTokens: number, completionTokens: number): number {
    const costs = MODEL_COSTS[this.config.model] ?? { input: 0.001, output: 0.002 };
    return (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output;
  }
}
