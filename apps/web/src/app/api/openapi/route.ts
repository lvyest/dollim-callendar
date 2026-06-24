import { buildOpenApiDocument } from '@dollim/contracts/openapi';

// zod 스키마에서 생성한 OpenAPI 문서를 노출 (orval 입력 / 문서 확인용).
export const dynamic = 'force-static';

export function GET() {
  return Response.json(buildOpenApiDocument());
}
