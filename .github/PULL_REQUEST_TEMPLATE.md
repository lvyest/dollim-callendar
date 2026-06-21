<!-- 제목 예: feat(web): 월간 캘린더 화면 구현 -->

## 요약 (Summary)

-

## 배경 (Why)

-

## 변경 사항 (Changes)

-

## 범위 (Scope)

- contracts (zod/openapi):
- db (drizzle):
- web (Next.js / API routes / UI):
- docs · infra:

## 검증 (Validation)

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm --filter @dollim/web build`
- [ ] contracts 변경 시 `pnpm api:gen` (OpenAPI → orval 클라이언트 재생성)
- [ ] db 변경 시 `pnpm db:generate` (마이그레이션 생성)
- [ ] 미실행 (사유):

## 리스크 (Risk)

- 사용자 영향:
- 롤백 방법:
- DB/데이터 영향:
- 보안/PII 영향:

## 체크리스트 (Checklist)

- [ ] 요청한 범위 안에서만 변경했다.
- [ ] 무관한 변경이나 다른 사람의 작업을 덮어쓰지 않았다.
- [ ] `.env`·토큰·키 등 민감정보를 커밋에 포함하지 않았다.
- [ ] contracts(zod) 스키마를 바꿨다면 OpenAPI/orval을 재생성했다.
- [ ] db 스키마를 바꿨다면 마이그레이션을 포함했다.
- [ ] 레이어 경계를 지켰다 (`contracts`는 `web`/`db`에 의존하지 않는다).
- [ ] 커밋 메시지는 Conventional Commits(한글 설명)를 따른다.

## 리뷰어 노트 (Reviewer Notes)

-
