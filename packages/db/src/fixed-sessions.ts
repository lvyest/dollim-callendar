import { and, eq, gte, inArray, lt } from 'drizzle-orm';

import { getDb } from './client';
import { attendances, fixedSlots, notes, practiceSessions } from './schema';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAY_KR = ['월', '화', '수', '목', '금', '토', '일'];
const fixedTitle = (weekday: number) => `${WEEKDAY_KR[weekday] ?? ''}요일 정기 연습`;
const norm = (t: string) => t.slice(0, 5); // "18:00:00" → "18:00"

function nextMonthFirst(month: string) {
  const parts = month.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${pad(nm)}-01`;
}

/**
 * 그 달의 고정 연습실 슬롯과 캘린더의 자동 연습(type 'fixed')을 동기화한다.
 *
 * 동작 방식:
 * - 각 날짜의 기존 fixed 세션과 새 슬롯을 position 순으로 1:1 매칭한다.
 *   · 기존 세션이 있으면 room/시간이 달라도 UPDATE → 참여·기록이 그대로 유지된다.
 *   · 기존 세션이 없으면 새로 생성한다.
 * - 슬롯 수가 줄어서 남은 기존 fixed 세션은, 참여/기록 없는 것만 삭제한다.
 * - 슬롯이 없어진 날짜의 fixed 세션도 참여/기록 없는 것만 삭제한다.
 * - 'variable'·'hapgut'·'outside'·'etc' 세션은 절대 건드리지 않는다.
 */
export async function syncFixedSessions(month: string, createdBy: string | null) {
  const db = getDb();
  const slots = await db.select().from(fixedSlots).where(eq(fixedSlots.yearMonth, month));

  const parts = month.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const daysInMonth = new Date(y, m, 0).getDate();

  const existing = await db
    .select()
    .from(practiceSessions)
    .where(and(gte(practiceSessions.date, `${month}-01`), lt(practiceSessions.date, nextMonthFirst(month))));

  // 날짜별로 "있어야 하는" 슬롯 목록 구성 (startTime 순 정렬)
  const desiredByDate = new Map<string, { room: string; startTime: string; endTime: string; title: string }[]>();
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
    const slotsForDay = slots
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (slotsForDay.length) {
      desiredByDate.set(`${month}-${pad(d)}`, slotsForDay.map((s) => ({
        room: s.room,
        startTime: s.startTime,
        endTime: s.endTime,
        title: fixedTitle(weekday),
      })));
    }
  }

  // 날짜별 기존 fixed 세션 (startTime 순)
  const existingFixedByDate = new Map<string, (typeof existing)>();
  for (const s of existing) {
    if (s.type !== 'fixed') continue;
    const arr = existingFixedByDate.get(s.date) ?? [];
    arr.push(s);
    existingFixedByDate.set(s.date, arr);
  }
  for (const arr of existingFixedByDate.values()) {
    arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  let created = 0;
  let updated = 0;
  let removed = 0;

  // 슬롯이 있는 날짜: UPDATE 또는 CREATE
  for (const [date, desiredList] of desiredByDate) {
    const existingOnDate = existingFixedByDate.get(date) ?? [];

    for (let i = 0; i < desiredList.length; i++) {
      const d = desiredList[i]!;
      const existingMatch = existingOnDate[i];

      if (existingMatch) {
        const needsUpdate =
          existingMatch.room !== d.room ||
          norm(existingMatch.startTime) !== norm(d.startTime) ||
          norm(existingMatch.endTime) !== norm(d.endTime) ||
          existingMatch.title !== d.title;

        if (needsUpdate) {
          await db
            .update(practiceSessions)
            .set({ room: d.room, startTime: d.startTime, endTime: d.endTime, title: d.title })
            .where(eq(practiceSessions.id, existingMatch.id));
          updated++;
        }
      } else {
        await db.insert(practiceSessions).values({
          date,
          room: d.room,
          startTime: d.startTime,
          endTime: d.endTime,
          type: 'fixed',
          title: d.title,
          createdBy,
        });
        created++;
      }
    }

    // 슬롯보다 기존 세션이 많으면 초과분 삭제 (참여/기록 없는 것만)
    if (existingOnDate.length > desiredList.length) {
      const extraIds = existingOnDate.slice(desiredList.length).map((s) => s.id);
      removed += await deleteSafelyByIds(db, extraIds);
    }
  }

  // 슬롯이 없어진 날짜: fixed 세션 삭제 (참여/기록 없는 것만)
  for (const [date, existingOnDate] of existingFixedByDate) {
    if (desiredByDate.has(date)) continue;
    const extraIds = existingOnDate.map((s) => s.id);
    removed += await deleteSafelyByIds(db, extraIds);
  }

  return { created, updated, removed };
}

async function deleteSafelyByIds(
  db: ReturnType<typeof getDb>,
  ids: string[],
): Promise<number> {
  if (!ids.length) return 0;
  const withAtt = await db
    .select({ id: attendances.sessionId })
    .from(attendances)
    .where(inArray(attendances.sessionId, ids));
  const withNote = await db
    .select({ id: notes.sessionId })
    .from(notes)
    .where(inArray(notes.sessionId, ids));
  const keep = new Set([...withAtt, ...withNote].map((r) => r.id));
  const deletable = ids.filter((id) => !keep.has(id));
  if (deletable.length) {
    await db.delete(practiceSessions).where(inArray(practiceSessions.id, deletable));
  }
  return deletable.length;
}
