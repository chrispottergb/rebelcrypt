import { createApp } from './server';
import { createHttpServer } from './http/server';
import { createPersistence } from './http/persistence';

async function main(): Promise<void> {
  const app = createApp({
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    host: '0.0.0.0',
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
    dbUrl: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/music_ai',
  });

  const persistence = await createPersistence(process.env['DATABASE_URL']);

  const http = createHttpServer({
    routes: app.routes,
    jwtSecret: app.config.jwtSecret,
    corsOrigins: app.config.corsOrigins,
    persistence,
  });

  await http.hydrate();
  await http.listen(app.config.port, app.config.host);

  // eslint-disable-next-line no-console
  console.log(`\n🚀 Global Music AI Platform`);
  // eslint-disable-next-line no-console
  console.log(`   API:      http://localhost:${app.config.port}`);
  // eslint-disable-next-line no-console
  console.log(`   Health:   http://localhost:${app.config.port}/api/v1/health`);
  // eslint-disable-next-line no-console
  console.log(`   Metrics:  http://localhost:${app.config.port}/api/v1/metrics`);
  // eslint-disable-next-line no-console
  console.log(`   Storage:  ${persistence ? 'Postgres (persistent)' : 'in-memory (ephemeral)'}`);
  // eslint-disable-next-line no-console
  console.log(`   Routes:   ${app.routeCount} endpoints registered\n`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
