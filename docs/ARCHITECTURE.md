# 아키텍처

상모(채상) 동아리 월간 연습 캘린더 웹앱. 매달 엑셀로 공유하던 일정표를 대체한다.

- **모바일 퍼스트 웹앱** — PC/모바일 브라우저 모두 대응
- **장기 유지 가능한 구조** — 명확한 레이어/디렉토리, 타입 단일 소스
- **서버·DB 비용 최소화** — 무료 티어(Vercel + Supabase)

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 패키지 매니저 | **pnpm** (workspace) | 모노레포 · 디스크 효율 |
| 언어 | **TypeScript** (strict) | 전 영역 타입 안전성 |
| 프레임워크 | **Next.js 15 (App Router)** · React 19 | 풀스택 한 코드베이스, Vercel 배포 |
| 호스팅 | **Vercel** (무료) | 깃 푸시 → 자동 배포 |
| DB / 인증 / 저장소 | **Supabase** (Postgres · Auth · Storage) | 통합, 무료 티어로 충분 |
| ORM | **Drizzle ORM** | 타입 세이프 · 서버리스 친화 |
| 인증 | **Supabase Auth + 카카오 OAuth** | 동아리원 대부분 카카오 사용 |
| 스키마/검증 | **zod** + **@asteasolutions/zod-to-openapi** | 입력·DTO 단일 소스 → OpenAPI |
| API 클라이언트 | **orval** + **TanStack Query** | OpenAPI → 타입드 훅 자동 생성 |
| 데이터 UX | 낙관적 업데이트 | 좋아요·댓글·참여 즉시 반영 |
| 스타일 | **Tailwind CSS** | 파랑/노랑 포인트, 둥근 카드 + 그림자 |
| 디자인 | **Figma** | 화면·로고·썸네일 |

### 타입 단일 소스 데이터 흐름

```
zod 스키마 (packages/contracts)
   ├─▶ 런타임 검증 (API 핸들러 input)
   ├─▶ zod-to-openapi ─▶ openapi.json
   │                         └─▶ orval ─▶ 타입드 React Query 훅 (apps/web)
   └─▶ Drizzle 스키마와 정합성 유지 (DB ↔ DTO)
```

> zod 한 곳을 고치면 OpenAPI → orval 훅까지 타입이 전파된다. 프론트에서 API를 손으로 타이핑하지 않는다.
> 빌드 전 `prebuild`(`pnpm api:gen`)가 openapi+orval 생성물을 만든다.

---

## 2. 구조 & 레이어 규칙

디렉토리 트리는 [README](../README.md#-구조) 참고.

- `packages/contracts` — **DB·Next 의존 없는 순수 zod**. 프론트/백 공유.
- `packages/db` — Drizzle 스키마·시드. DB 접근은 여기로 한정.
- `apps/web/src/lib/api/generated` — orval 자동 생성물. **직접 수정 금지**(재생성으로 갱신).
- `apps/web/src/app/(app)` — 로그인 후 탭 화면. 공통 레이아웃에서 하단 네비를 들고 있어 전환 시 유지.
- 인증 게이팅은 서버 컴포넌트(`lib/auth`의 `getAccessState`) + 미들웨어 세션 갱신으로 처리.

---

## 3. 데이터 모델 · API

- 테이블·관계·삭제(cascade) 동작 → [DATA_MODEL.md](DATA_MODEL.md)
- 엔드포인트·권한 → [API.md](API.md)

핵심: 엑셀의 *고정/변동 연습 · 멤버별 O·X · 선배 참여 · 특이일정* 구조를 정규화하고,
참여여부를 `참여 / 부분참여(사유) / 불참(사유) / 미정` 4-state 로 표현. 선배 참여는 `members.is_senior` 로 별도 집계.

---

## 4. 비용 관리

- **Vercel(무료) + Supabase(무료)** → 월 $0 목표.
- 영상은 **링크 우선**, 직접 업로드는 Supabase Storage 무료 한도 내. 업로드 용량 제한(버킷 설정).
- Supabase **Transaction pooler(6543)** 사용 — 서버리스 커넥션 폭증 방지.
