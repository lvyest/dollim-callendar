import { UpdateCommentInputSchema } from '@dollim/contracts';
import { comments, getDb } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { ApiError, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

async function loadOwned(id: string, memberId: string, role: string) {
  const db = getDb();
  const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  const comment = rows[0];
  if (!comment) throw new ApiError('not_found', '댓글을 찾을 수 없습니다', 404);
  if (comment.authorId !== memberId && role !== 'admin') {
    throw new ApiError('forbidden', '작성자 또는 운영진만 수정/삭제할 수 있습니다', 403);
  }
  return { db, comment };
}

// 댓글 수정 (작성자 또는 운영진).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const input = UpdateCommentInputSchema.parse(await req.json());
    const { db } = await loadOwned(id, member.id, member.role);
    const updated = await db
      .update(comments)
      .set({ content: input.content })
      .where(eq(comments.id, id))
      .returning();
    return ok(updated[0]);
  });
}

// 댓글 삭제 (작성자 또는 운영진). 대댓글(parentId)도 cascade 로 삭제되고,
// 알림은 comments 에서 실시간 계산되므로 함께 사라진다.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const { db } = await loadOwned(id, member.id, member.role);
    await db.delete(comments).where(eq(comments.id, id));
    return ok({ id });
  });
}
