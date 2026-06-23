import { MemberStatus } from '@dollim/contracts';
import { getDb, members } from '@dollim/db';
import { asc, desc, eq } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

// 승인된 멤버는 목록 조회 가능. ?status=pending 으로 승인 대기만 필터.
export async function GET(req: Request) {
  return handle(async () => {
    await requireApproved();
    const statusParam = new URL(req.url).searchParams.get('status');
    const status = statusParam ? MemberStatus.parse(statusParam) : null;
    const db = getDb();
    const rows = status
      ? await db
          .select()
          .from(members)
          .where(eq(members.status, status))
          .orderBy(desc(members.createdAt), asc(members.id))
      : await db.select().from(members).orderBy(desc(members.createdAt), asc(members.id));
    return ok(rows);
  });
}
