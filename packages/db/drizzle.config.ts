import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// 마이그레이션 실행 시 web 앱의 .env.local 에서 DATABASE_URL 을 읽는다.
config({ path: '../../apps/web/.env.local' });

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
