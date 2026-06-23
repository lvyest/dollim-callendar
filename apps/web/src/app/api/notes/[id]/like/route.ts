import { getDb, noteLikes } from '@dollim/db';
import { and, eq, sql } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

// 노트 좋아요 토글.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireApproved();
    const { id } = await params;
    const db = getDb();
    const where = and(eq(noteLikes.noteId, id), eq(noteLikes.memberId, me.id));
    const existing = await db.select().from(noteLikes).where(where).limit(1);
    let liked: boolean;
    if (existing[0]) {
      await db.delete(noteLikes).where(where);
      liked = false;
    } else {
      await db.insert(noteLikes).values({ noteId: id, memberId: me.id });
      liked = true;
    }
    const cnt = await db.select({ c: sql<number>`count(*)::int` }).from(noteLikes).where(eq(noteLikes.noteId, id));
    return ok({ liked, likeCount: cnt[0]?.c ?? 0 });
  });
}
