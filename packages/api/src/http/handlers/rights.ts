import { randomUUID } from 'crypto';
import { TERRITORIES } from '@music-ai/rights';
import { ok, created, notFound, badRequest } from '../context';
import type { HandlerFn } from '../context';
import type { HandlerDeps } from '../handlers';

interface Bundle { id: string; tenantId: string; name: string; trackIds: string[] }
const bundles = new Map<string, Bundle>();

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function makeRightsHandlers(_deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    'rights.listContracts': (_ctx, store) => ok(store.contracts.list()),
    'rights.createContract': (ctx, store) => {
      const b = asRecord(ctx.body);
      if (!b['title']) return badRequest('title is required');
      const contract = store.contracts.insert({
        tenantId: ctx.auth?.tenantId ?? 'public',
        ...b,
      });
      return created(contract);
    },
    'rights.getContract': (ctx, store) => {
      const c = store.contracts.get(ctx.params['id'] ?? '');
      return c ? ok(c) : notFound('contract not found');
    },
    'rights.updateContract': (ctx, store) => {
      const updated = store.contracts.update(ctx.params['id'] ?? '', asRecord(ctx.body));
      return updated ? ok(updated) : notFound('contract not found');
    },

    'rights.listBundles': () => ok(Array.from(bundles.values())),
    'rights.createBundle': (ctx) => {
      const b = asRecord(ctx.body);
      const name = b['name'] ? String(b['name']) : '';
      if (!name) return badRequest('name is required');
      const bundle: Bundle = {
        id: randomUUID(),
        tenantId: ctx.auth?.tenantId ?? 'public',
        name,
        trackIds: Array.isArray(b['trackIds']) ? (b['trackIds'] as string[]) : [],
      };
      bundles.set(bundle.id, bundle);
      return created(bundle);
    },

    'rights.listTerritories': () => ok(TERRITORIES),
    'rights.checkTerritory': (ctx) => {
      const trackId = ctx.params['trackId'] ?? '';
      const territory = ctx.params['territory'] ?? '';
      const cleared = hashNum(trackId + territory) % 100 > 15;
      return ok({ trackId, territory, cleared, restrictions: cleared ? [] : ['license-required'] });
    },

    'royalties.calculate': (ctx) => {
      const b = asRecord(ctx.body);
      if (b['amount'] == null) return badRequest('amount is required');
      const amount = Number(b['amount']);
      const splits = Array.isArray(b['splits'])
        ? (b['splits'] as Array<{ holder?: string; percent?: number }>)
        : [{ holder: 'owner', percent: 100 }];
      const lines = splits.map((s) => ({
        holder: s.holder ?? 'unknown',
        percent: s.percent ?? 0,
        amount: Math.round(amount * ((s.percent ?? 0) / 100) * 100) / 100,
      }));
      return ok({ total: amount, currency: 'USD', lines });
    },
    'royalties.reports': () =>
      ok(
        ['Q1', 'Q2', 'Q3', 'Q4'].map((period, i) => ({
          period,
          gross: 10000 * (i + 1),
          net: 8500 * (i + 1),
          streams: 1_000_000 * (i + 1),
        })),
      ),
    'royalties.forecasts': () => {
      const base = 12000;
      const series = Array.from({ length: 12 }, (_v, i) => ({
        month: i + 1,
        projected: Math.round(base * (1 + i * 0.04)),
      }));
      return ok({ currency: 'USD', series });
    },
  };
}
