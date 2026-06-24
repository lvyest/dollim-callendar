import { getDb, guestbookPosts } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { ApiError, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

// 방명록 삭제 (작성자 본인만). 수정은 불가. likes 는 cascade.
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
