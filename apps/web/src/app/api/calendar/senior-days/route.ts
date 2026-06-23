import { attendances, getDb, members, practiceSessions } from '@dollim/db';
import { and, eq, gte, lt, or } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';
import { nextMonthFirst } from '@/lib/month';

// ?month=YYYY-MM 선배(승인)가 참여/부분참여한 연습이 있는 날짜 목록.
export async function GET(req: Request) {
  return handle(async () => {
    await requireApproved();
    const month = new URL(req.url).searchParams.get('month');
    if (!month) return ok([]);
    const db = getDb();
    const rows = await db
      .select({ date: practiceSessions.date })
      .from(attendances)
      .innerJoin(practiceSessions, eq(attendances.sessionId, practiceSessions.id))
      .innerJoin(members, eq(attendances.memberId, members.id))
      .where(
        and(
          eq(members.isSenior, true),
          eq(members.status, 'approved'),
          or(eq(attendances.status, 'yes'), eq(attendances.status, 'partial')),
          gte(practiceSessions.date, `${month}-01`),
          lt(practiceSessions.date, nextMonthFirst(month)),
        ),
      );
    return ok([...new Set(rows.map((r) => r.date))]);
  });
}
