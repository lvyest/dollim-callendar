import { and, gte, inArray, lt, eq } from 'drizzle-orm';

import { getDb } from './client';
import { attendances, fixedSlots, notes, practiceSessions } from './schema';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAY_KR = ['월', '화', '수', '목', '금', '토', '일'];
const fixedTitle = (weekday: number) => `${WEEKDAY_KR[weekday] ?? ''}요일 정기 연습`;
function nextMonthFirst(month: string) {
  const parts = month.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${pad(nm)}-01`;
}
const keyOf = (date: string, room: string, start: string) => `${date}|${room}|${start.slice(0, 5)}`;

/**
 * 그 달의 고정 연습실 슬롯과 캘린더의 자동 연습(type 'fixed')을 동기화한다.
 * - 슬롯에 맞는 요일마다 연습을 생성(이미 있으면 건너뜀).
 * - 슬롯과 더 이상 맞지 않는 기존 'fixed' 연습은 제거하되,
 *   참여/기록(attendance·note)이 있는 연습은 보호하고 남긴다.
 * - 'variable'(추가)·'hapgut'(합굿) 연습은 절대 건드리지 않는다.
 * @returns { created, removed }
 */
export async function syncFixedSessions(month: string, createdBy: string | null) {
  const db = getDb();
  const slots = await db.select().from(fixedSlots).where(eq(fixedSlots.yearMonth, month));

  const existing = await db
    .select()
    .from(practiceSessions)
    .where(and(gte(practiceSessions.date, `${month}-01`), lt(practiceSessions.date, nextMonthFirst(month))));

  // 슬롯 기준 "있어야 하는" 연습 키 집합
  const parts = month.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const daysInMonth = new Date(y, m, 0).getDate();
  const desired = new Map<string, { date: string; room: string; startTime: string; endTime: string; title: string }>();
  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0=월 .. 6=일
    for (const s of slots) {
      if (s.weekday !== weekday) continue;
      const date = `${month}-${pad(d)}`;
      desired.set(keyOf(date, s.room, s.startTime), {
        date,
        room: s.room,
        startTime: s.startTime,
        endTime: s.endTime,
        title: fixedTitle(weekday),
      });
    }
  }

  // 슬롯과 안 맞는 기존 fixed 연습 → 참여/기록 없는 것만 삭제
  const staleFixed = existing.filter((s) => s.type === 'fixed' && !desired.has(keyOf(s.date, s.room, s.startTime)));
  let removed = 0;
  if (staleFixed.length) {
    const ids = staleFixed.map((s) => s.id);
    const withAtt = await db.select({ id: attendances.sessionId }).from(attendances).where(inArray(attendances.sessionId, ids));
    const withNote = await db.select({ id: notes.sessionId }).from(notes).where(inArray(notes.sessionId, ids));
    const keep = new Set([...withAtt, ...withNote].map((r) => r.id));
    const deletable = ids.filter((id) => !keep.has(id));
    if (deletable.length) {
      await db.delete(practiceSessions).where(inArray(practiceSessions.id, deletable));
      removed = deletable.length;
    }
  }

  // 이미 같은 키의 연습이 있으면 건너뛰고, 없는 desired 연습만 생성
  // (삭제된 stale 키는 desired 에 없으므로 영향 없음)
  const existingKeys = new Set(existing.map((s) => keyOf(s.date, s.room, s.startTime)));
  const rows: (typeof practiceSessions.$inferInsert)[] = [];
  for (const [k, v] of desired) {
    if (existingKeys.has(k)) continue;
    rows.push({ date: v.date, room: v.room, startTime: v.startTime, endTime: v.endTime, type: 'fixed', title: v.title, createdBy });
  }
  if (rows.length) await db.insert(practiceSessions).values(rows);

  return { created: rows.length, removed };
}
