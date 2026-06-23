import { UpsertAttendanceInputSchema } from '@dollim/contracts';
import { attendances, getDb } from '@dollim/db';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

// 내 참여 입력/수정 (세션 x 멤버 upsert).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const member = await requireApproved();
    const { id } = await params;
    const input = UpsertAttendanceInputSchema.parse(await req.json());
    const db = getDb();
    const row = await db
      .insert(attendances)
      .values({
        sessionId: id,
        memberId: member.id,
        status: input.status,
        reason: input.reason ?? null,
      })
      .onConflictDoUpdate({
        target: [attendances.sessionId, attendances.memberId],
        set: { status: input.status, reason: input.reason ?? null, updatedAt: new Date() },
      })
      .returning();
    return ok(row[0]);
  });
}
