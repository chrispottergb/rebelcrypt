import { RouteDefinition } from '../server';
export const aiRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/api/v1/ai/generate/music', handler: 'ai.generateMusic', auth: true, permissions: ['ai:execute'] },
  { method: 'GET', path: '/api/v1/ai/generate/music/:id/status', handler: 'ai.generationStatus', auth: true, permissions: ['ai:read'] },
  { method: 'POST', path: '/api/v1/ai/evaluate', handler: 'ai.evaluate', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/guardrails/check', handler: 'ai.guardrailCheck', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/embeddings/generate', handler: 'ai.generateEmbedding', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/embeddings/search', handler: 'ai.searchSimilar', auth: true, permissions: ['ai:read'] },
  { method: 'POST', path: '/api/v1/ai/llm/generate', handler: 'ai.llmGenerate', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/llm/summarize', handler: 'ai.llmSummarize', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/llm/classify', handler: 'ai.llmClassify', auth: true, permissions: ['ai:execute'] },
  { method: 'GET', path: '/api/v1/ai/prompts', handler: 'ai.listPrompts', auth: true, permissions: ['ai:read'] },
  { method: 'POST', path: '/api/v1/ai/prompts', handler: 'ai.createPrompt', auth: true, permissions: ['ai:create'] },
  { method: 'POST', path: '/api/v1/ai/narrative/generate', handler: 'ai.generateNarrative', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/playlist/generate', handler: 'ai.generatePlaylist', auth: true, permissions: ['ai:execute'] },
  { method: 'POST', path: '/api/v1/ai/recommend', handler: 'ai.recommend', auth: true, permissions: ['ai:execute'] },
  { method: 'GET', path: '/api/v1/ai/usage', handler: 'ai.usage', auth: true, permissions: ['ai:read'] },
];
