import { UpdateProfileInputSchema } from '@dollim/contracts';
import { getDb, members } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { fail, handle, ok } from '@/lib/api/respond';
import { getCurrentMember, requireUser } from '@/lib/auth';

export async function GET() {
  return handle(async () => {
    const member = await getCurrentMember();
    if (!member) return fail('not_registered', '아직 가입하지 않았습니다', 404);
    return ok(member);
  });
}

// 탈퇴 — 본인 멤버 삭제(참여·노트·댓글·방명록·일정참여 cascade).
export async function DELETE() {
  return handle(async () => {
    const member = await getCurrentMember();
    if (!member) return fail('not_registered', '가입 정보가 없습니다', 404);
    const db = getDb();
    await db.update(members).set({ approvedBy: null }).where(eq(members.approvedBy, member.id));
    await db.delete(members).where(eq(members.id, member.id));
    return ok({ id: member.id });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = UpdateProfileInputSchema.parse(await req.json());
    const db = getDb();
    const [updated] = await db
      .update(members)
      .set(input)
      .where(eq(members.kakaoId, user.id))
      .returning();
    if (!updated) return fail('not_registered', '가입 정보가 없습니다', 404);
    return ok(updated);
  });
}
