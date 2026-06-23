import { ApprovalInputSchema } from '@dollim/contracts';
import { getDb, members } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { fail, handle, ok } from '@/lib/api/respond';
import { requireAdmin } from '@/lib/auth';

// 운영진이 가입 승인 / 거절·내보내기 / 대기 복구.
// 거절·내보내기는 상태만 'rejected' 로 바꿔(계정·기록 보존), 거절 목록에서 복구/승인 가능.
// 화면에는 승인된 멤버만 노출되므로 거절된 멤버는 모든 곳에서 보이지 않는다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const { decision } = ApprovalInputSchema.parse(await req.json());
    if (decision !== 'approve' && id === admin.id) {
      return fail('bad_request', '본인 상태는 변경할 수 없습니다', 400);
    }

    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'pending';
    const db = getDb();
    const updated = await db
      .update(members)
      .set({
        status,
        approvedBy: decision === 'approve' ? admin.id : null,
        approvedAt: decision === 'approve' ? new Date() : null,
      })
      .where(eq(members.id, id))
      .returning();

    if (!updated[0]) return fail('not_found', '멤버를 찾을 수 없습니다', 404);
    return ok(updated[0]);
  });
}
