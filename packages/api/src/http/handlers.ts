import type { JwtService } from '@music-ai/security';
import type { MetricsRegistry } from '@music-ai/observability';
import type { HandlerFn } from './context';
import { makeAuthHandlers } from './handlers/auth';
import { makeMusicHandlers } from './handlers/music';
import { makeWorkflowHandlers } from './handlers/workflows';
import { makeRightsHandlers } from './handlers/rights';
import { makeAnalyticsHandlers } from './handlers/analytics';
import { makeAiHandlers } from './handlers/ai';
import { makeAdminHandlers } from './handlers/admin';

export interface HandlerDeps {
  jwt: JwtService;
  metrics: MetricsRegistry;
}

/** Builds the full handler-key -> function map from every domain module. */
export function handlerRegistry(jwt: JwtService, metrics: MetricsRegistry): Record<string, HandlerFn> {
  const deps: HandlerDeps = { jwt, metrics };
  return {
    ...makeAuthHandlers(deps),
    ...makeMusicHandlers(deps),
    ...makeWorkflowHandlers(deps),
    ...makeRightsHandlers(deps),
    ...makeAnalyticsHandlers(deps),
    ...makeAiHandlers(deps),
    ...makeAdminHandlers(deps),
  };
}
