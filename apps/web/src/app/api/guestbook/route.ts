import { CreateGuestbookPostInputSchema } from '@dollim/contracts';
import { getDb, guestbookLikes, guestbookPosts, members } from '@dollim/db';
import { asc, desc, inArray } from 'drizzle-orm';

import { created, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

export async function GET() {
  return handle(async () => {
    const me = await requireApproved();
    const db = getDb();
    const rows = await db
      .select()
      .from(guestbookPosts)
      .orderBy(desc(guestbookPosts.createdAt), asc(guestbookPosts.id));
    const ids = rows.map((r) => r.id);
    const likes = ids.length
      ? await db.select().from(guestbookLikes).where(inArray(guestbookLikes.postId, ids))
      : [];
    const likerIds = [...new Set(likes.map((l) => l.memberId))];
    const likerRows = likerIds.length ? await db.select().from(members).where(inArray(members.id, likerIds)) : [];
    const nameById = new Map(likerRows.map((m) => [m.id, m.name]));

    const likeCount = new Map<string, number>();
    const likedByMe = new Set<string>();
    const likersByPost = new Map<string, string[]>();
    for (const l of likes) {
      likeCount.set(l.postId, (likeCount.get(l.postId) ?? 0) + 1);
      if (l.memberId === me.id) likedByMe.add(l.postId);
      const arr = likersByPost.get(l.postId) ?? [];
      arr.push(nameById.get(l.memberId) ?? '?');
      likersByPost.set(l.postId, arr);
    }
    return ok(
      rows.map((r) => ({
        ...r,
        likeCount: likeCount.get(r.id) ?? 0,
        likedByMe: likedByMe.has(r.id),
        likers: likersByPost.get(r.id) ?? [],
      })),
    );
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const me = await requireApproved();
    const input = CreateGuestbookPostInputSchema.parse(await req.json());
    const db = getDb();
    const ins = await db
      .insert(guestbookPosts)
      .values({ authorId: me.id, content: input.content })
      .returning();
    return created({ ...ins[0]!, likeCount: 0, likedByMe: false, likers: [] });
  });
}
