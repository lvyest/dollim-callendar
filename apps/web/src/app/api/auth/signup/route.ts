import { SignupInputSchema } from '@dollim/contracts';
import { getDb, members } from '@dollim/db';
import { sql } from 'drizzle-orm';

import { created, fail, handle } from '@/lib/api/respond';
import { getCurrentMember, requireUser } from '@/lib/auth';

// 카카오 인증 후 프로필 입력 = 가입 신청. 첫 가입자는 자동으로 운영진+승인.
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();

    const existing = await getCurrentMember();
    if (existing) return fail('already_registered', '이미 가입 신청을 했습니다', 409);

    const input = SignupInputSchema.parse(await req.json());
    const db = getDb();

    const counted = await db.select({ count: sql<number>`count(*)::int` }).from(members);
    const isFirst = (counted[0]?.count ?? 0) === 0;

    const inserted = await db
      .insert(members)
      .values({
        name: input.name,
        generation: input.generation,
        color: input.color,
        isSenior: input.isSenior,
        kakaoId: user.id,
        role: isFirst ? 'admin' : 'member',
        status: isFirst ? 'approved' : 'pending',
        approvedAt: isFirst ? new Date() : null,
      })
      .returning();

    return created(inserted[0]);
  });
}
