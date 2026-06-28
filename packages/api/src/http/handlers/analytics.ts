import { ok, created, notFound, badRequest } from '../context';
import type { HandlerFn } from '../context';
import type { HandlerDeps } from '../handlers';

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const KPIS = [
  { metric: 'monthly_active_users', value: 184320, unit: 'users', trend: 'up' },
  { metric: 'streams', value: 12_400_000, unit: 'plays', trend: 'up' },
  { metric: 'revenue', value: 482000, unit: 'USD', trend: 'up' },
  { metric: 'churn_rate', value: 0.032, unit: 'ratio', trend: 'down' },
  { metric: 'avg_session_minutes', value: 27.4, unit: 'minutes', trend: 'flat' },
];

function series(seed: number, points: number, base: number): Array<{ t: number; value: number }> {
  return Array.from({ length: points }, (_v, i) => ({
    t: i + 1,
    value: Math.round(base * (1 + ((seed + i * 7) % 20) / 100)),
  }));
}

export function makeAnalyticsHandlers(_deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    'analytics.kpis': () => ok(KPIS),
    'analytics.getKpi': (ctx) => {
      const metric = ctx.params['metric'] ?? '';
      const kpi = KPIS.find((k) => k.metric === metric);
      return kpi ? ok(kpi) : notFound('metric not found');
    },
    'analytics.forecasts': (ctx) => {
      const metric = ctx.query['metric'] ?? 'revenue';
      return ok({ metric, series: series(hashNum(metric), 12, 100000) });
    },
    'analytics.generateForecast': (ctx) => {
      const b = asRecord(ctx.body);
      const metric = b['metric'] ? String(b['metric']) : 'revenue';
      const horizon = b['horizon'] != null ? Number(b['horizon']) : 12;
      return created({ metric, horizon, series: series(hashNum(metric), horizon, 100000) });
    },
    'analytics.segments': () =>
      ok([
        { id: 'seg-power', name: 'Power Listeners', size: 24310 },
        { id: 'seg-casual', name: 'Casual Listeners', size: 142880 },
        { id: 'seg-new', name: 'New This Month', size: 18920 },
        { id: 'seg-churn-risk', name: 'Churn Risk', size: 6340 },
      ]),
    'analytics.revenue': () => {
      const months = series(hashNum('revenue'), 12, 40000);
      return ok({ currency: 'USD', months, total: months.reduce((a, m) => a + m.value, 0) });
    },
    'analytics.costs': () => {
      const months = series(hashNum('costs'), 12, 16000);
      return ok({ currency: 'USD', months, total: months.reduce((a, m) => a + m.value, 0) });
    },

    // ---- experiments ----
    'experiments.list': (_ctx, store) => ok(store.experiments.list()),
    'experiments.create': (ctx, store) => {
      const b = asRecord(ctx.body);
      const name = b['name'] ? String(b['name']) : '';
      if (!name) return badRequest('name is required');
      const exp = store.experiments.insert({
        tenantId: ctx.auth?.tenantId ?? 'public',
        name,
        status: 'draft',
        ...b,
      });
      return created(exp);
    },
    'experiments.get': (ctx, store) => {
      const e = store.experiments.get(ctx.params['id'] ?? '');
      return e ? ok(e) : notFound('experiment not found');
    },
    'experiments.start': (ctx, store) => {
      const updated = store.experiments.update(ctx.params['id'] ?? '', { status: 'running' });
      return updated ? ok(updated) : notFound('experiment not found');
    },
    'experiments.stop': (ctx, store) => {
      const updated = store.experiments.update(ctx.params['id'] ?? '', { status: 'stopped' });
      return updated ? ok(updated) : notFound('experiment not found');
    },
    'experiments.results': (ctx, store) => {
      const id = ctx.params['id'] ?? '';
      const e = store.experiments.get(id);
      if (!e) return notFound('experiment not found');
      const seed = hashNum(id);
      const a = (seed % 30) / 100 + 0.1;
      const bConv = ((seed >> 3) % 30) / 100 + 0.1;
      return ok({
        experimentId: id,
        variants: [
          { name: 'A', conversion: Math.round(a * 1000) / 1000 },
          { name: 'B', conversion: Math.round(bConv * 1000) / 1000 },
        ],
        winner: bConv > a ? 'B' : 'A',
      });
    },
  };
}
