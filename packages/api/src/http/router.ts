import type { RouteDefinition } from '../server';

export interface MatchedRoute {
  route: RouteDefinition;
  params: Record<string, string>;
}

interface CompiledRoute {
  route: RouteDefinition;
  method: string;
  segments: string[];
}

function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

/**
 * A tiny method+path router with :param support. No dependencies — pure
 * segment matching, longest-static-wins is unnecessary here because the
 * route table is hand-authored and unambiguous.
 */
export class Router {
  private readonly compiled: CompiledRoute[];

  constructor(routes: RouteDefinition[]) {
    this.compiled = routes.map((route) => ({
      route,
      method: route.method,
      segments: splitPath(route.path),
    }));
  }

  match(method: string, path: string): MatchedRoute | null {
    const reqSegments = splitPath(path);
    for (const c of this.compiled) {
      if (c.method !== method) continue;
      if (c.segments.length !== reqSegments.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < c.segments.length; i++) {
        const seg = c.segments[i] as string;
        const reqSeg = reqSegments[i] as string;
        if (seg.startsWith(':')) {
          params[seg.slice(1)] = decodeURIComponent(reqSeg);
        } else if (seg !== reqSeg) {
          ok = false;
          break;
        }
      }
      if (ok) return { route: c.route, params };
    }
    return null;
  }

  /** Returns true if the path exists under any method (for 405 vs 404). */
  pathExists(path: string): boolean {
    const reqSegments = splitPath(path);
    return this.compiled.some((c) => {
      if (c.segments.length !== reqSegments.length) return false;
      return c.segments.every((seg, i) => seg.startsWith(':') || seg === reqSegments[i]);
    });
  }
}
