import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { registry } from './registry';

/** zod 레지스트리 → OpenAPI 3.0 문서. */
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Dollim Calendar API',
      version: '0.1.0',
      description: '채상(돌림력) 연습 캘린더 API — zod 스키마에서 자동 생성됩니다.',
    },
    servers: [{ url: '/api', description: 'Next.js Route Handlers' }],
    tags: [
      { name: 'auth', description: '인증/내 프로필' },
      { name: 'members', description: '멤버/가입 승인/역할' },
      { name: 'sessions', description: '연습 세션' },
      { name: 'attendance', description: '참여' },
      { name: 'notes', description: '배운 것/영상/댓글' },
      { name: 'events', description: '특이일정' },
      { name: 'guestbook', description: '방명록' },
    ],
  });
}

// `tsx src/openapi/generate.ts` 로 직접 실행하면 openapi.json 을 파일로 출력.
const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv[1] ? resolve(process.argv[1]) === thisFile : false;
if (invokedDirectly) {
  const doc = buildOpenApiDocument();
  const outPath = resolve(dirname(thisFile), '..', '..', 'openapi.json');
  writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`✓ OpenAPI 문서 생성: ${outPath}`);
}
