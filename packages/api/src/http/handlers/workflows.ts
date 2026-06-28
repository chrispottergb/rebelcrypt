import { randomUUID } from 'crypto';
import { ok, created, notFound, badRequest } from '../context';
import type { HandlerFn } from '../context';
import type { HandlerDeps } from '../handlers';

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  steps: Array<{ node: string; status: string }>;
}
const runs = new Map<string, WorkflowRun>();

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

const NODE_REGISTRY = [
  { type: 'http.request', category: 'io', label: 'HTTP Request' },
  { type: 'storage.read', category: 'io', label: 'Read Object' },
  { type: 'storage.write', category: 'io', label: 'Write Object' },
  { type: 'llm.generate', category: 'ai', label: 'LLM Generate' },
  { type: 'llm.classify', category: 'ai', label: 'LLM Classify' },
  { type: 'embedding.create', category: 'ai', label: 'Create Embedding' },
  { type: 'transform.map', category: 'data', label: 'Map' },
  { type: 'transform.filter', category: 'data', label: 'Filter' },
  { type: 'branch.if', category: 'control', label: 'If / Else' },
  { type: 'loop.foreach', category: 'control', label: 'For Each' },
  { type: 'music.generate', category: 'music', label: 'Generate Music' },
  { type: 'notify.email', category: 'notify', label: 'Send Email' },
];

export function makeWorkflowHandlers(_deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    'workflows.list': (ctx, store) => {
      const tenantId = ctx.auth?.tenantId ?? 'public';
      return ok(store.workflows.list().filter((w) => w.tenantId === tenantId || tenantId === 'public'));
    },
    'workflows.create': (ctx, store) => {
      const b = asRecord(ctx.body);
      const name = b['name'] ? String(b['name']) : '';
      if (!name) return badRequest('name is required');
      const wf = store.workflows.insert({
        tenantId: ctx.auth?.tenantId ?? 'public',
        name,
        nodes: Array.isArray(b['nodes']) ? (b['nodes'] as unknown[]) : [],
        edges: Array.isArray(b['edges']) ? (b['edges'] as unknown[]) : [],
        createdAt: new Date().toISOString(),
      });
      return created(wf);
    },
    'workflows.get': (ctx, store) => {
      const wf = store.workflows.get(ctx.params['id'] ?? '');
      return wf ? ok(wf) : notFound('workflow not found');
    },
    'workflows.update': (ctx, store) => {
      const updated = store.workflows.update(ctx.params['id'] ?? '', asRecord(ctx.body));
      return updated ? ok(updated) : notFound('workflow not found');
    },
    'workflows.delete': (ctx, store) => {
      const removed = store.workflows.remove(ctx.params['id'] ?? '');
      return removed ? ok({ deleted: true }) : notFound('workflow not found');
    },
    'workflows.execute': (ctx, store) => {
      const id = ctx.params['id'] ?? '';
      const wf = store.workflows.get(id);
      if (!wf) return notFound('workflow not found');
      const now = new Date().toISOString();
      const run: WorkflowRun = {
        id: randomUUID(),
        workflowId: id,
        status: 'completed',
        startedAt: now,
        finishedAt: now,
        steps: (wf.nodes as Array<{ type?: string }>).map((n, i) => ({
          node: n.type ?? `node-${i}`,
          status: 'completed',
        })),
      };
      runs.set(run.id, run);
      return created(run);
    },
    'workflows.listRuns': (ctx) => {
      const id = ctx.params['id'] ?? '';
      return ok(Array.from(runs.values()).filter((r) => r.workflowId === id));
    },
    'workflows.getRun': (ctx) => {
      const run = runs.get(ctx.params['runId'] ?? '');
      return run ? ok(run) : notFound('run not found');
    },
    'workflows.cancelRun': (ctx) => {
      const run = runs.get(ctx.params['runId'] ?? '');
      if (!run) return notFound('run not found');
      run.status = 'cancelled';
      run.finishedAt = new Date().toISOString();
      return ok(run);
    },
    'workflows.nodeRegistry': () => ok(NODE_REGISTRY),
  };
}
