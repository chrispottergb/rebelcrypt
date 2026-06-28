import { randomUUID } from 'crypto';
import { ok, created, notFound, badRequest } from '../context';
import type { HandlerFn } from '../context';
import type { HandlerDeps } from '../handlers';

interface GenJob { id: string; status: string; prompt: string; createdAt: string }
const genJobs = new Map<string, GenJob>();

const BANNED = ['hate', 'violence', 'explicit-illegal'];

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function embed(text: string, dim = 8): number[] {
  const v: number[] = [];
  for (let i = 0; i < dim; i++) {
    v.push(Math.round((((hashNum(text + i) % 2000) - 1000) / 1000) * 1000) / 1000);
  }
  return v;
}

export function makeAiHandlers(_deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    'ai.generateMusic': (ctx) => {
      const b = asRecord(ctx.body);
      const prompt = b['prompt'] ? String(b['prompt']) : '';
      if (!prompt) return badRequest('prompt is required');
      const job: GenJob = { id: randomUUID(), status: 'processing', prompt, createdAt: new Date().toISOString() };
      genJobs.set(job.id, job);
      return created(job);
    },
    'ai.generationStatus': (ctx) => {
      const job = genJobs.get(ctx.params['id'] ?? '');
      if (!job) return notFound('generation job not found');
      return ok({ ...job, status: 'completed', audioUrl: `/generated/${job.id}.wav` });
    },
    'ai.evaluate': (ctx) => {
      const b = asRecord(ctx.body);
      const text = b['text'] ? String(b['text']) : '';
      const score = Math.min(1, text.length / 200);
      return ok({
        score: Math.round(score * 1000) / 1000,
        dimensions: { coherence: Math.round(score * 900) / 1000, relevance: Math.round(score * 950) / 1000 },
      });
    },
    'ai.guardrailCheck': (ctx) => {
      const b = asRecord(ctx.body);
      const text = (b['text'] ? String(b['text']) : '').toLowerCase();
      const flags = BANNED.filter((w) => text.includes(w));
      return ok({ allowed: flags.length === 0, flags });
    },
    'ai.generateEmbedding': (ctx) => {
      const b = asRecord(ctx.body);
      const text = b['text'] ? String(b['text']) : '';
      return ok({ vector: embed(text), dim: 8 });
    },
    'ai.searchSimilar': (ctx) => {
      const b = asRecord(ctx.body);
      const query = b['query'] ? String(b['query']) : '';
      const seed = hashNum(query);
      return ok({
        results: Array.from({ length: 5 }, (_v, i) => ({
          id: `track-${(seed + i) % 9999}`,
          score: Math.round((1 - i * 0.12) * 1000) / 1000,
        })),
      });
    },
    'ai.llmGenerate': (ctx) => {
      const b = asRecord(ctx.body);
      const prompt = b['prompt'] ? String(b['prompt']) : b['text'] ? String(b['text']) : '';
      return ok({ output: `Generated: ${prompt}`, tokens: prompt.length });
    },
    'ai.llmSummarize': (ctx) => {
      const b = asRecord(ctx.body);
      const text = b['text'] ? String(b['text']) : '';
      const first = text.split(/[.!?]/)[0] ?? '';
      return ok({ summary: first.trim() });
    },
    'ai.llmClassify': (ctx) => {
      const b = asRecord(ctx.body);
      const text = (b['text'] ? String(b['text']) : '').toLowerCase();
      let label = 'neutral';
      if (text.includes('love') || text.includes('great')) label = 'positive';
      else if (text.includes('hate') || text.includes('bad')) label = 'negative';
      return ok({ label });
    },
    'ai.listPrompts': (_ctx, store) => ok(store.prompts.list()),
    'ai.createPrompt': (ctx, store) => {
      const b = asRecord(ctx.body);
      if (!b['name'] || !b['template']) return badRequest('name and template are required');
      const prompt = store.prompts.insert({ tenantId: ctx.auth?.tenantId ?? 'public', ...b });
      return created(prompt);
    },
    'ai.generateNarrative': (ctx) => {
      const b = asRecord(ctx.body);
      const subject = b['subject'] ? String(b['subject']) : 'this artist';
      return ok({ narrative: `An evocative story about ${subject}, blending sound and emotion across cultures.` });
    },
    'ai.generatePlaylist': (ctx) => {
      const b = asRecord(ctx.body);
      const mood = b['mood'] ? String(b['mood']) : 'chill';
      return ok({
        mood,
        tracks: Array.from({ length: 8 }, (_v, i) => ({ id: `track-${i}`, title: `${mood} pick ${i + 1}` })),
      });
    },
    'ai.recommend': (ctx) => {
      const b = asRecord(ctx.body);
      const seed = hashNum(b['userId'] ? String(b['userId']) : 'anon');
      return ok({
        recommendations: Array.from({ length: 5 }, (_v, i) => ({
          id: `track-${(seed + i) % 9999}`,
          reason: 'based on listening history',
        })),
      });
    },
    'ai.usage': () =>
      ok({ period: 'current_month', tokensUsed: 1_284_000, requests: 18420, estimatedCostUsd: 142.6 }),
  };
}
