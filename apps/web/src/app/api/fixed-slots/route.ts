import { fixedSlots, getDb, syncFixedSessions } from '@dollim/db';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { handle, ok } from '@/lib/api/respond';
import { requireAdmin, requireApproved } from '@/lib/auth';

const SlotInput = z.object({
  weekday: z.number().int().min(0).max(6),
  room: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
});
const PutBody = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  slots: z.array(SlotInput),
});

// ?month=YYYY-MM 고정 연습실 슬롯 목록.
export async function GET(req: Request) {
  return handle(async () => {
    await requireApproved();
    const month = new URL(req.url).searchParams.get('month');
    if (!month) return ok([]);
    const db = getDb();
    const rows = await db
      .select()
      .from(fixedSlots)
      .where(eq(fixedSlots.yearMonth, month))
      .orderBy(asc(fixedSlots.weekday), asc(fixedSlots.startTime));
    return ok(rows);
  });
}

// 그 달의 고정 연습실 슬롯을 통째로 교체 (운영진).
export async function PUT(req: Request) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { month, slots } = PutBody.parse(await req.json());
    const db = getDb();
    await db.delete(fixedSlots).where(eq(fixedSlots.yearMonth, month));
    if (slots.length) {
      await db.insert(fixedSlots).values(
        slots.map((s) => ({
          yearMonth: month,
          weekday: s.weekday,
          room: s.room,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      );
    }
    // 슬롯에 맞춰 그 달의 매칭 요일마다 연습 자동 생성(중복은 건너뜀)
    await syncFixedSessions(month, admin.id);
    const rows = await db
      .select()
      .from(fixedSlots)
      .where(eq(fixedSlots.yearMonth, month))
      .orderBy(asc(fixedSlots.weekday), asc(fixedSlots.startTime));
    return ok(rows);
  });
}
