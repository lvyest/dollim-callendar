import { CreateSessionInputSchema } from '@dollim/contracts';
import { getDb, practiceSessions } from '@dollim/db';
import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { created, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';
import { nextMonthFirst } from '@/lib/month';

// ?month=YYYY-MM (월간) 또는 ?date=YYYY-MM-DD (하루) 세션 목록.
export async function GET(req: Request) {
  return handle(async () => {
    await requireApproved();
    const sp = new URL(req.url).searchParams;
    const date = sp.get('date');
    const month = sp.get('month');
    const db = getDb();

    let where;
    if (date) where = eq(practiceSessions.date, date);
    else if (month) where = and(gte(practiceSessions.date, `${month}-01`), lt(practiceSessions.date, nextMonthFirst(month)));

    const rows = where
      ? await db.select().from(practiceSessions).where(where).orderBy(asc(practiceSessions.date), asc(practiceSessions.startTime))
      : await db.select().from(practiceSessions).orderBy(asc(practiceSessions.date), asc(practiceSessions.startTime));
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const member = await requireApproved();
    const input = CreateSessionInputSchema.parse(await req.json());
    const db = getDb();
    const inserted = await db
      .insert(practiceSessions)
      .values({
        date: input.date,
        room: input.room,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type,
        title: input.title ?? null,
        createdBy: member.id,
      })
      .returning();
    return created(inserted[0]);
  });
}
