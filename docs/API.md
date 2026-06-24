# API 개요

Next.js Route Handlers(`apps/web/src/app/api`). zod로 입력 검증, 응답은 `{ ok, data }` / `{ ok:false, error }` 형태.
zod 스키마(`packages/contracts`) → OpenAPI → **orval** 로 프론트 훅을 자동 생성한다. (`GET /api/openapi` 로 스펙 제공)

**권한**: 대부분 **승인된 멤버**만 호출 가능. 일부는 운영진 전용 또는 작성자 본인 전용.

## 인증 · 멤버

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| POST | `/api/auth/signup` | 가입 신청(이름·기수·색·선배) | 로그인(미가입) |
| GET / PATCH / DELETE | `/api/me` | 내 정보 조회 / 수정 / 탈퇴 | 본인 |
| POST | `/api/me/onboarded` | 온보딩 완료 처리 | 본인 |
| GET | `/api/members` | 멤버 목록 (`?status=` 필터) | 승인 멤버 |
| POST | `/api/members/[id]/approval` | 승인 / 거절 / 대기 복구 | 운영진 |
| PATCH | `/api/members/[id]/role` | 운영진 지정 / 해제 | 운영진 |

## 캘린더 · 연습 · 참여

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET / POST | `/api/sessions` | 월·일 연습 조회 / 연습 추가 | 승인 멤버 |
| PATCH / DELETE | `/api/sessions/[id]` | 연습 수정 / 삭제 | 등록자·운영진 |
| GET | `/api/sessions/[id]/attendances` | 세션 참여 현황 | 승인 멤버 |
| PUT | `/api/sessions/[id]/attendance` | 내 참여여부 입력/수정 | 본인 |
| GET / PUT | `/api/fixed-slots` | 고정 연습실 조회 / 저장(→정기 연습 자동 생성) | 조회: 승인 / 저장: 운영진 |
| GET | `/api/calendar/senior-days` | 선배 참여일(금테 표시용) | 승인 멤버 |

## 오늘 배운 것 · 댓글

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET / POST | `/api/sessions/[id]/notes` | 노트 목록 / 작성(영상 포함) | 승인 멤버 |
| POST | `/api/notes/[id]/like` | 좋아요 토글 | 승인 멤버 |
| GET / POST | `/api/notes/[id]/comments` | 댓글·답글 목록 / 작성 | 승인 멤버 |
| PATCH / DELETE | `/api/comments/[id]` | 댓글 수정 / 삭제 | 작성자·운영진 |

## 특이일정 · 방명록 · 알림

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET / POST | `/api/events` | 특이일정 목록 / 등록 | 승인 멤버 |
| PATCH / DELETE | `/api/events/[id]` | 수정 / 삭제 | 등록자·운영진 |
| GET / POST | `/api/guestbook` | 방명록 목록 / 작성 | 승인 멤버 |
| POST | `/api/guestbook/[id]/like` | 좋아요 토글 | 승인 멤버 |
| DELETE | `/api/guestbook/[id]` | 방명록 삭제 | 작성자 본인 |
| GET | `/api/notifications` | 내 글 댓글·답글 + 참여 미입력 연습 | 본인 |
| POST | `/api/notifications/read` | 알림 읽음 처리 | 본인 |
