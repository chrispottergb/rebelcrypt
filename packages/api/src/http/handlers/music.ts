import { randomUUID } from 'crypto';
import { GenreTaxonomy } from '@music-ai/genre-registry';
import { LanguageRegistry } from '@music-ai/language-registry';
import { ok, created, notFound, badRequest } from '../context';
import type { HandlerFn } from '../context';
import type { HandlerDeps } from '../handlers';

const genres = new GenreTaxonomy();
const languages = new LanguageRegistry();

// Collections DataStore does not model natively:
interface Album { id: string; tenantId: string; title: string; artistId: string | null; year: number | null }
interface CatalogJob { id: string; tenantId: string; status: string; source: string; createdAt: string }
const albums = new Map<string, Album>();
const catalogJobs = new Map<string, CatalogJob>();

function asRecord(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function makeMusicHandlers(_deps: HandlerDeps): Record<string, HandlerFn> {
  return {
    // ---- tracks ----
    'tracks.list': (ctx, store) => {
      const tenantId = ctx.auth?.tenantId ?? 'public';
      return ok(store.tracks.list().filter((t) => t.tenantId === tenantId || tenantId === 'public'));
    },
    'tracks.create': (ctx, store) => {
      const b = asRecord(ctx.body);
      const title = b['title'] ? String(b['title']) : '';
      if (!title) return badRequest('title is required');
      const track = store.tracks.insert({
        tenantId: ctx.auth?.tenantId ?? 'public',
        title,
        artistId: b['artistId'] ? String(b['artistId']) : null,
        genre: b['genre'] ? String(b['genre']) : null,
        language: b['language'] ? String(b['language']) : null,
        durationMs: b['durationMs'] != null ? Number(b['durationMs']) : null,
        createdAt: new Date().toISOString(),
      });
      return created(track);
    },
    'tracks.get': (ctx, store) => {
      const t = store.tracks.get(ctx.params['id'] ?? '');
      return t ? ok(t) : notFound('track not found');
    },
    'tracks.update': (ctx, store) => {
      const b = asRecord(ctx.body);
      const updated = store.tracks.update(ctx.params['id'] ?? '', b);
      return updated ? ok(updated) : notFound('track not found');
    },
    'tracks.delete': (ctx, store) => {
      const removed = store.tracks.remove(ctx.params['id'] ?? '');
      return removed ? ok({ deleted: true }) : notFound('track not found');
    },
    'tracks.analytics': (ctx, store) => {
      const id = ctx.params['id'] ?? '';
      const t = store.tracks.get(id);
      if (!t) return notFound('track not found');
      const seed = hashNum(id);
      return ok({
        trackId: id,
        plays: seed % 100000,
        likes: seed % 5000,
        skips: seed % 1200,
        completionRate: (seed % 100) / 100,
      });
    },
    'tracks.search': (ctx, store) => {
      const q = (ctx.query['q'] ?? '').toLowerCase();
      const rows = store.tracks.list().filter((t) => t.title.toLowerCase().includes(q));
      return ok(rows);
    },

    // ---- artists ----
    'artists.list': (_ctx, store) => ok(store.artists.list()),
    'artists.create': (ctx, store) => {
      const b = asRecord(ctx.body);
      const name = b['name'] ? String(b['name']) : '';
      if (!name) return badRequest('name is required');
      const artist = store.artists.insert({
        tenantId: ctx.auth?.tenantId ?? 'public',
        name,
        country: b['country'] ? String(b['country']) : null,
      });
      return created(artist);
    },
    'artists.get': (ctx, store) => {
      const a = store.artists.get(ctx.params['id'] ?? '');
      return a ? ok(a) : notFound('artist not found');
    },

    // ---- albums (module-level) ----
    'albums.list': (_ctx) => ok(Array.from(albums.values())),
    'albums.create': (ctx) => {
      const b = asRecord(ctx.body);
      const title = b['title'] ? String(b['title']) : '';
      if (!title) return badRequest('title is required');
      const album: Album = {
        id: randomUUID(),
        tenantId: ctx.auth?.tenantId ?? 'public',
        title,
        artistId: b['artistId'] ? String(b['artistId']) : null,
        year: b['year'] != null ? Number(b['year']) : null,
      };
      albums.set(album.id, album);
      return created(album);
    },

    // ---- genres (real registry) ----
    'genres.list': () => ok(genres.getAllGenres()),
    'genres.get': (ctx) => {
      const g = genres.getGenre(ctx.params['id'] ?? '');
      return g ? ok(g) : notFound('genre not found');
    },
    'genres.subgenres': (ctx) => ok(genres.getSubgenres(ctx.params['id'] ?? '')),

    // ---- languages (real registry) ----
    'languages.list': (ctx) => {
      const region = ctx.query['region'];
      const q = ctx.query['q'];
      if (region) return ok(languages.getByRegion(region));
      if (q) return ok(languages.searchLanguages(q));
      return ok(languages.getAllLanguages());
    },

    // ---- catalog ingestion (module-level jobs) ----
    'catalog.ingest': (ctx) => {
      const b = asRecord(ctx.body);
      const job: CatalogJob = {
        id: randomUUID(),
        tenantId: ctx.auth?.tenantId ?? 'public',
        status: 'queued',
        source: b['source'] ? String(b['source']) : 'unknown',
        createdAt: new Date().toISOString(),
      };
      catalogJobs.set(job.id, job);
      return created(job);
    },
    'catalog.listJobs': () => ok(Array.from(catalogJobs.values())),
    'catalog.getJob': (ctx) => {
      const job = catalogJobs.get(ctx.params['id'] ?? '');
      return job ? ok(job) : notFound('job not found');
    },
  };
}
