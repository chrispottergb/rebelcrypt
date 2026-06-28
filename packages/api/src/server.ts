import { authRoutes } from './routes/auth.routes';
import { workflowRoutes } from './routes/workflows.routes';
import { musicRoutes } from './routes/music.routes';
import { rightsRoutes } from './routes/rights.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { adminRoutes } from './routes/admin.routes';
import { aiRoutes } from './routes/ai.routes';

export interface AppConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  jwtSecret: string;
  dbUrl: string;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: string;
  auth: boolean;
  permissions?: string[];
}

export function createApp(config?: Partial<AppConfig>) {
  const appConfig: AppConfig = {
    port: config?.port ?? parseInt(process.env['PORT'] ?? '3000', 10),
    host: config?.host ?? '0.0.0.0',
    corsOrigins: config?.corsOrigins ?? ['*'],
    jwtSecret: config?.jwtSecret ?? process.env['JWT_SECRET'] ?? 'change-me',
    dbUrl: config?.dbUrl ?? process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/music_ai',
  };

  const allRoutes: RouteDefinition[] = [
    ...authRoutes,
    ...workflowRoutes,
    ...musicRoutes,
    ...rightsRoutes,
    ...analyticsRoutes,
    ...adminRoutes,
    ...aiRoutes,
  ];

  return {
    config: appConfig,
    routes: allRoutes,
    routeCount: allRoutes.length,
    start: () => {
      console.log(`Music AI API Gateway starting on ${appConfig.host}:${appConfig.port}`);
      console.log(`Registered ${allRoutes.length} routes`);
      return appConfig;
    },
  };
}
