import { getDb, guestbookPosts } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { ApiError, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const { content } = await req.json();
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new ApiError('bad_request', '내용을 입력해주세요', 400);
    }
    const db = getDb();
    const rows = await db.select().from(guestbookPosts).where(eq(guestbookPosts.id, id)).limit(1);
    const post = rows[0];
    if (!post) throw new ApiError('not_found', '방명록 글을 찾을 수 없습니다', 404);
    if (post.authorId !== member.id) {
      throw new ApiError('forbidden', '작성자만 수정할 수 있습니다', 403);
    }
    const [updated] = await db
      .update(guestbookPosts)
      .set({ content: content.trim(), updatedAt: new Date() })
      .where(eq(guestbookPosts.id, id))
      .returning();
    return ok(updated);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(guestbookPosts).where(eq(guestbookPosts.id, id)).limit(1);
    const post = rows[0];
    if (!post) throw new ApiError('not_found', '방명록 글을 찾을 수 없습니다', 404);
    if (post.authorId !== member.id) {
      throw new ApiError('forbidden', '작성자만 삭제할 수 있습니다', 403);
    }
    await db.delete(guestbookPosts).where(eq(guestbookPosts.id, id));
    return ok({ id });
  });
}
