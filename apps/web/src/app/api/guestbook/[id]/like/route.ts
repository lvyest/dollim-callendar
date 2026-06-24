import { getDb, guestbookLikes } from '@dollim/db';
import { and, eq, sql } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireApproved();
    const { id } = await params;
    const db = getDb();
    const where = and(eq(guestbookLikes.postId, id), eq(guestbookLikes.memberId, me.id));
    const existing = await db.select().from(guestbookLikes).where(where).limit(1);
    let liked: boolean;
    if (existing[0]) {
      await db.delete(guestbookLikes).where(where);
      liked = false;
    } else {
      await db.insert(guestbookLikes).values({ postId: id, memberId: me.id });
      liked = true;
    }
    const cnt = await db.select({ c: sql<number>`count(*)::int` }).from(guestbookLikes).where(eq(guestbookLikes.postId, id));
    return ok({ liked, likeCount: cnt[0]?.c ?? 0 });
  });
}
