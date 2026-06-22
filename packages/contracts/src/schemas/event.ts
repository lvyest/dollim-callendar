import { isoDate, isoDateTime, uuid, z } from './common';

/** 특이일정 유형: 외부공연 / 전수 / 합굿 / 기타. */
export const EventType = z.enum(['performance', 'training', 'hapgut', 'etc']);
export type EventType = z.infer<typeof EventType>;

/** 특이일정 — 운영진/멤버가 등록, 해당 날짜에 캘린더 마커로 표시. */
export const EventSchema = z.object({
  id: uuid(),
  type: EventType,
  title: z.string().min(1).max(60),
  description: z.string().max(500).nullable(),
  dateStart: isoDate(),
  /** 종료일(다일 일정). 단일 일정이면 null. */
  dateEnd: isoDate().nullable(),
  location: z.string().max(60).nullable(),
  /** 참여 멤버 id 목록. */
  memberIds: z.array(uuid()),
  createdBy: uuid(),
  createdAt: isoDateTime(),
});
export type Event = z.infer<typeof EventSchema>;

export const CreateEventInputSchema = z.object({
  type: EventType,
  title: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  dateStart: isoDate(),
  dateEnd: isoDate().optional(),
  location: z.string().max(60).optional(),
  memberIds: z.array(uuid()).default([]),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const UpdateEventInputSchema = CreateEventInputSchema.partial();
export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;
