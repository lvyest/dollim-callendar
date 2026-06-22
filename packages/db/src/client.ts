import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Drizzle 클라이언트(싱글턴). Supabase pooler 사용 시 prepared statement 를 끈다.
 * DATABASE_URL 은 서버(런타임)에서만 필요하므로 지연 초기화한다.
 */
export function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 환경변수가 필요합니다');
  const client = postgres(url, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

export type Db = ReturnType<typeof getDb>;
