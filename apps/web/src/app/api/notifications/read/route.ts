import { getDb, members } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

// 알림(댓글·답글)을 읽음 처리 — 현재 시각을 읽음 기준으로 저장.
export async function POST() {
  return handle(async () => {
    const me = await requireApproved();
    const db = getDb();
    await db.update(members).set({ notificationsReadAt: new Date() }).where(eq(members.id, me.id));
    return ok({ ok: true });
  });
}
