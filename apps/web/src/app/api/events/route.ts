import { CreateEventInputSchema } from '@dollim/contracts';
import { eventMembers, events, getDb } from '@dollim/db';
import { and, asc, gte, inArray, lt } from 'drizzle-orm';

import { created, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';
import { nextMonthFirst } from '@/lib/month';

// ?month=YYYY-MM 의 특이일정 (dateStart 기준). memberIds 포함해서 반환.
export async function GET(req: Request) {
  return handle(async () => {
    await requireApproved();
    const month = new URL(req.url).searchParams.get('month');
    const db = getDb();
    const rows = month
      ? await db
          .select()
          .from(events)
          .where(and(gte(events.dateStart, `${month}-01`), lt(events.dateStart, nextMonthFirst(month))))
          .orderBy(asc(events.dateStart), asc(events.id))
      : await db.select().from(events).orderBy(asc(events.dateStart), asc(events.id));

    const ids = rows.map((r) => r.id);
    const links = ids.length
      ? await db.select().from(eventMembers).where(inArray(eventMembers.eventId, ids))
      : [];
    const byEvent = new Map<string, string[]>();
    for (const l of links) {
      const arr = byEvent.get(l.eventId) ?? [];
      arr.push(l.memberId);
      byEvent.set(l.eventId, arr);
    }
    return ok(rows.map((r) => ({ ...r, memberIds: byEvent.get(r.id) ?? [] })));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const member = await requireApproved();
    const input = CreateEventInputSchema.parse(await req.json());
    const db = getDb();
    const inserted = await db
      .insert(events)
      .values({
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        dateStart: input.dateStart,
        dateEnd: input.dateEnd ?? null,
        location: input.location ?? null,
        createdBy: member.id,
      })
      .returning();
    const ev = inserted[0]!;
    if (input.memberIds.length) {
      await db.insert(eventMembers).values(input.memberIds.map((memberId) => ({ eventId: ev.id, memberId })));
    }
    return created({ ...ev, memberIds: input.memberIds });
  });
}
