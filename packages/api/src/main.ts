import { createApp } from './server';

const app = createApp({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  host: '0.0.0.0',
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  dbUrl: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/music_ai',
});

const config = app.start();
console.log(`\n🚀 Global Music AI Platform`);
console.log(`   API:      http://localhost:${config.port}`);
console.log(`   Health:   http://localhost:${config.port}/api/v1/health`);
console.log(`   Routes:   ${app.routeCount} endpoints registered\n`);
