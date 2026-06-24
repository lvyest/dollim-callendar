import { getDb, members } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { fail, handle, ok } from '@/lib/api/respond';
import { getCurrentMember } from '@/lib/auth';

// 온보딩 완료 처리 — 다시 보지 않도록 onboardedAt 기록.
export async function POST() {
  return handle(async () => {
    const member = await getCurrentMember();
    if (!member) return fail('not_registered', '가입 정보가 없습니다', 404);
    await getDb().update(members).set({ onboardedAt: new Date() }).where(eq(members.id, member.id));
    return ok({ ok: true });
  });
}
