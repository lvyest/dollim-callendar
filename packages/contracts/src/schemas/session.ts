import { isoDate, isoDateTime, timeHHMM, uuid, weekday, yearMonth, z } from './common';

/** 연습 유형: 정규(고정 연습실 자동) / 추가 / 합굿 / 외부공연 / 기타. */
export const SessionType = z.enum(['fixed', 'variable', 'hapgut', 'outside', 'etc']);
export type SessionType = z.infer<typeof SessionType>;

/**
 * 연습 세션. 하루에 여러 개 존재 가능(예: A연습실 14:00 + 청벽 합굿 19:00).
 * 참여 입력은 세션 단위로 이뤄진다.
 */
export const PracticeSessionSchema = z.object({
  id: uuid(),
  date: isoDate(),
  room: z.string().min(1).openapi({ example: 'A연습실' }),
  startTime: timeHHMM(),
  endTime: timeHHMM(),
  type: SessionType,
  title: z.string().max(40).nullable().openapi({ example: '상뽑 준비 연습' }),
  createdBy: uuid(),
  createdAt: isoDateTime(),
});
export type PracticeSession = z.infer<typeof PracticeSessionSchema>;

export const CreateSessionInputSchema = PracticeSessionSchema.pick({
  date: true,
  room: true,
  startTime: true,
  endTime: true,
  type: true,
}).extend({
  title: z.string().max(40).optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const UpdateSessionInputSchema = CreateSessionInputSchema.partial();
export type UpdateSessionInput = z.infer<typeof UpdateSessionInputSchema>;

/**
 * 고정 연습실 슬롯 — 달마다 다르게 설정. 해당 yearMonth 의 weekday 마다 세션을 펼친다.
 */
export const FixedSlotSchema = z.object({
  id: uuid(),
  yearMonth: yearMonth(),
  weekday: weekday(),
  room: z.string().min(1),
  startTime: timeHHMM(),
  endTime: timeHHMM(),
});
export type FixedSlot = z.infer<typeof FixedSlotSchema>;

export const UpsertFixedSlotInputSchema = FixedSlotSchema.omit({ id: true });
export type UpsertFixedSlotInput = z.infer<typeof UpsertFixedSlotInputSchema>;

/** 월간 조회 쿼리 (?month=2025-06). */
export const MonthQuerySchema = z.object({ month: yearMonth() });
export type MonthQuery = z.infer<typeof MonthQuerySchema>;
