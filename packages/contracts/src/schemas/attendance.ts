import { isoDateTime, uuid, z } from './common';

/** 참여 상태 4단계: 참여 / 부분참여 / 불참 / 미정. */
export const AttendanceStatus = z.enum(['yes', 'partial', 'no', 'undecided']);
export type AttendanceStatus = z.infer<typeof AttendanceStatus>;

/** 사유가 필요한 상태(부분참여·불참). */
const REASON_REQUIRED: AttendanceStatus[] = ['partial', 'no'];

export const AttendanceSchema = z.object({
  id: uuid(),
  sessionId: uuid(),
  memberId: uuid(),
  status: AttendanceStatus,
  /** 부분참여(예: "16시 이후 합류") / 불참(예: "알바") 사유. */
  reason: z.string().max(100).nullable(),
  updatedAt: isoDateTime(),
});
export type Attendance = z.infer<typeof AttendanceSchema>;

/** 내 참여 입력/수정. 부분참여·불참이면 reason 필수. */
export const UpsertAttendanceInputSchema = z
  .object({
    status: AttendanceStatus,
    reason: z.string().max(100).optional(),
  })
  .refine((v) => !REASON_REQUIRED.includes(v.status) || !!v.reason?.trim(), {
    message: '부분참여·불참은 사유를 입력해야 합니다',
    path: ['reason'],
  });
export type UpsertAttendanceInput = z.infer<typeof UpsertAttendanceInputSchema>;

/** 세션별 참여 집계 — 선배는 멤버 카운트에서 분리. */
export const AttendanceSummarySchema = z.object({
  sessionId: uuid(),
  memberYes: z.number().int().nonnegative(),
  memberPartial: z.number().int().nonnegative(),
  memberNo: z.number().int().nonnegative(),
  memberTotal: z.number().int().nonnegative(),
  seniorYes: z.number().int().nonnegative().openapi({ description: '선배 참여 수 (별도 집계)' }),
});
export type AttendanceSummary = z.infer<typeof AttendanceSummarySchema>;
