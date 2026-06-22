import { ZodError } from 'zod';

/** 라우트 핸들러에서 던지면 적절한 HTTP 상태로 변환된다. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function created<T>(data: T) {
  return Response.json(data, { status: 201 });
}

export function fail(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

/** 핸들러 본문을 감싸서 ApiError/ZodError 를 일관된 JSON 에러로 변환. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return fail(e.code, e.message, e.status);
    if (e instanceof ZodError) {
      return fail('validation', e.issues[0]?.message ?? '입력값이 올바르지 않습니다', 400);
    }
    console.error('[api] unhandled error', e);
    return fail('internal', '서버 오류가 발생했습니다', 500);
  }
}
