import { UpdateSessionInputSchema } from '@dollim/contracts';
import { getDb, practiceSessions } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { ApiError, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

async function loadOwned(id: string, memberId: string, role: string) {
  const db = getDb();
  const rows = await db.select().from(practiceSessions).where(eq(practiceSessions.id, id)).limit(1);
  const session = rows[0];
  if (!session) throw new ApiError('not_found', '연습을 찾을 수 없습니다', 404);
  if (session.createdBy !== memberId && role !== 'admin') {
    throw new ApiError('forbidden', '등록한 사람 또는 운영진만 수정/삭제할 수 있습니다', 403);
  }
  return { db, session };
}

// 연습 수정 (등록자 또는 운영진).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const input = UpdateSessionInputSchema.parse(await req.json());
    const { db } = await loadOwned(id, member.id, member.role);
    const updated = await db
      .update(practiceSessions)
      .set({
        ...(input.date !== undefined && { date: input.date }),
        ...(input.room !== undefined && { room: input.room }),
        ...(input.startTime !== undefined && { startTime: input.startTime }),
        ...(input.endTime !== undefined && { endTime: input.endTime }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.title !== undefined && { title: input.title ?? null }),
      })
      .where(eq(practiceSessions.id, id))
      .returning();
    return ok(updated[0]);
  });
}

// 연습 삭제 (참여·노트는 cascade). 등록자 또는 운영진.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const { db } = await loadOwned(id, member.id, member.role);
    await db.delete(practiceSessions).where(eq(practiceSessions.id, id));
    return ok({ id });
  });
}
