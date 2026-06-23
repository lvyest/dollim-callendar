import { config } from 'dotenv';

config({ path: '../../apps/web/.env.local' });

import { sql } from 'drizzle-orm';

import { getDb } from './index';

// 노트 영상 업로드용 Storage 버킷 + 정책 (1회 실행).
async function main() {
  const db = getDb();

  await db.execute(
    sql`insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values ('note-media', 'note-media', true, 209715200, array['video/mp4','video/quicktime','video/webm','image/png','image/jpeg'])
        on conflict (id) do update set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types`,
  );

  // 정책은 중복 생성 방지를 위해 먼저 drop
  const policies: { name: string; ddl: ReturnType<typeof sql> }[] = [
    {
      name: 'note-media public read',
      ddl: sql`create policy "note-media public read" on storage.objects for select to public using (bucket_id = 'note-media')`,
    },
    {
      name: 'note-media auth insert',
      ddl: sql`create policy "note-media auth insert" on storage.objects for insert to authenticated with check (bucket_id = 'note-media')`,
    },
    {
      name: 'note-media auth delete',
      ddl: sql`create policy "note-media auth delete" on storage.objects for delete to authenticated using (bucket_id = 'note-media')`,
    },
  ];
  for (const p of policies) {
    await db.execute(sql`drop policy if exists ${sql.raw(`"${p.name}"`)} on storage.objects`);
    await db.execute(p.ddl);
  }

  console.log('✅ Storage 버킷(note-media) + 정책 생성 완료');
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ 실패:', e?.message ?? e);
  process.exit(1);
});
