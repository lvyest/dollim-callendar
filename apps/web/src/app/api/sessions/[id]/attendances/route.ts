import { attendances, getDb } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

// 세션의 전체 멤버 참여 행 (클라이언트에서 멤버 목록과 병합해 현황 표시).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireApproved();
    const { id } = await params;
    const db = getDb();
    const rows = await db.select().from(attendances).where(eq(attendances.sessionId, id));
    return ok(rows);
  });
}
