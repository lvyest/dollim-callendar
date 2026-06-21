import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// zod 인스턴스에 .openapi() 확장을 1회만 적용 (전 패키지가 이 z 를 공유).
extendZodWithOpenApi(z);

export { z };

/** YYYY-MM-DD */
export const isoDate = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
    .openapi({ example: '2025-06-14' });

/** ISO 8601 date-time */
export const isoDateTime = () => z.string().datetime().openapi({ example: '2025-06-14T05:00:00.000Z' });

/** YYYY-MM (월 단위 조회/고정 슬롯) */
export const yearMonth = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'YYYY-MM 형식이어야 합니다')
    .openapi({ example: '2025-06' });

/** HH:MM (24시간) */
export const timeHHMM = () =>
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM 형식이어야 합니다')
    .openapi({ example: '14:00' });

/** #RRGGBB 헥스 컬러 (멤버 색상) */
export const hexColor = () =>
  z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '#RRGGBB 형식이어야 합니다')
    .openapi({ example: '#3B73EF' });

export const uuid = () => z.string().uuid();

/** 0=월 ~ 6=일 (고정 연습실 요일) */
export const weekday = () => z.number().int().min(0).max(6).openapi({ description: '0=월 … 6=일' });

/** 커서/오프셋 페이지네이션 응답 래퍼 */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable().openapi({ description: '다음 페이지 커서 (null이면 끝)' }),
  });
