import { UpdateRoleInputSchema } from '@dollim/contracts';
import { getDb, members } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { fail, handle, ok } from '@/lib/api/respond';
import { requireAdmin } from '@/lib/auth';

// 운영진이 역할 변경(운영진 지정/해제).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const { role } = UpdateRoleInputSchema.parse(await req.json());

    const db = getDb();
    const updated = await db.update(members).set({ role }).where(eq(members.id, id)).returning();

    if (!updated[0]) return fail('not_found', '멤버를 찾을 수 없습니다', 404);
    return ok(updated[0]);
  });
}
