import { UpdateEventInputSchema } from '@dollim/contracts';
import { eventMembers, events, getDb } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { ApiError, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

async function loadOwned(id: string, memberId: string, role: string) {
  const db = getDb();
  const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
  const ev = rows[0];
  if (!ev) throw new ApiError('not_found', '특이일정을 찾을 수 없습니다', 404);
  if (ev.createdBy !== memberId && role !== 'admin') {
    throw new ApiError('forbidden', '등록한 사람 또는 운영진만 수정/삭제할 수 있습니다', 403);
  }
  return { db, ev };
}

// 특이일정 수정 (등록자 또는 운영진).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const input = UpdateEventInputSchema.parse(await req.json());
    const { db } = await loadOwned(id, member.id, member.role);
    await db
      .update(events)
      .set({
        ...(input.type !== undefined && { type: input.type }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description ?? null }),
        ...(input.dateStart !== undefined && { dateStart: input.dateStart }),
        ...(input.dateEnd !== undefined && { dateEnd: input.dateEnd ?? null }),
        ...(input.location !== undefined && { location: input.location ?? null }),
      })
      .where(eq(events.id, id));
    if (input.memberIds !== undefined) {
      await db.delete(eventMembers).where(eq(eventMembers.eventId, id));
      if (input.memberIds.length) {
        await db.insert(eventMembers).values(input.memberIds.map((memberId) => ({ eventId: id, memberId })));
      }
    }
    const rows = await db.select().from(events).where(eq(events.id, id)).limit(1);
    const links = await db.select().from(eventMembers).where(eq(eventMembers.eventId, id));
    return ok({ ...rows[0]!, memberIds: links.map((l) => l.memberId) });
  });
}

// 특이일정 삭제 (등록자 또는 운영진). eventMembers 는 cascade.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const { db } = await loadOwned(id, member.id, member.role);
    await db.delete(events).where(eq(events.id, id));
    return ok({ id });
  });
}
