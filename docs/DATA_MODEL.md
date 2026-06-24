# 데이터 모델

Supabase Postgres + Drizzle ORM. 스키마 원본은 [`packages/db/src/schema.ts`](../packages/db/src/schema.ts).

## Enum

| Enum | 값 | 의미 |
|---|---|---|
| `member_role` | `admin`, `member` | 운영진 / 일반 멤버 |
| `member_status` | `pending`, `approved`, `rejected` | 승인 대기 / 승인 / 거절 |
| `session_type` | `fixed`, `variable`, `hapgut`, `outside`, `etc` | 정규(자동) / 추가 / 합굿 / 외부공연 / 기타 |
| `attendance_status` | `yes`, `partial`, `no`, `undecided` | 참여 / 부분참여 / 불참 / 미정 |
| `media_kind` | `link`, `upload` | 영상 링크 / 직접 업로드 |
| `event_type` | `performance`, `training`, `hapgut`, `etc` | 외부공연 / 전수 / 청벽일정 / 기타 |

## 테이블

### members — 멤버
`id` · `name` · `generation`(기수) · `role` · `is_senior`(선배) · `color`(아바타·캘린더 색) · `kakao_id`(unique, Supabase auth id) · `status` · `approved_by`(→members) · `notifications_read_at` · `onboarded_at` · `created_at`

### fixed_slots — 월별 고정 연습실
`id` · `year_month`(YYYY-MM) · `weekday`(0=월 … 6=일) · `room` · `start_time` · `end_time`
> 저장 시 그 달의 해당 요일마다 `practice_sessions`(type=fixed)를 자동 생성한다.

### practice_sessions — 연습
`id` · `date` · `room` · `start_time` · `end_time` · `type` · `title` · `created_by`(→members, **set null**) · `created_at`

### attendances — 참여 여부
`id` · `session_id`(→sessions, **cascade**) · `member_id`(→members, **cascade**) · `status` · `reason`
> `unique(session_id, member_id)` — 멤버당 세션 1행, upsert 로 갱신.

### notes — 오늘 배운 것
`id` · `session_id`(→sessions, cascade) · `author_id`(→members, cascade) · `content` · `created_at` · `updated_at`

### note_media — 노트 첨부 영상
`id` · `note_id`(→notes, cascade) · `kind` · `url` · `storage_path` · `thumbnail_url` · `duration_sec` · `size_bytes`

### note_likes / comments — 좋아요 · 댓글
- `note_likes`: `note_id`·`member_id`(둘 다 cascade), unique 쌍 — 좋아요 토글
- `comments`: `id` · `note_id`(cascade) · `author_id`(cascade) · `parent_id`(→comments, cascade, **대댓글**) · `content`

### events — 특이일정
`id` · `type` · `title` · `description` · `date_start` · `date_end` · `location` · `created_by`(→members, set null) · `created_at`
- `event_members`: `event_id`·`member_id`(둘 다 cascade) — 참여 멤버 N:N

### guestbook_posts / guestbook_likes — 방명록
- `guestbook_posts`: `id` · `author_id`(cascade) · `content`
- `guestbook_likes`: `post_id`·`member_id`(둘 다 cascade)

## 삭제 동작(정리)

- **멤버 삭제/탈퇴** → 그 멤버의 참여·노트·댓글·좋아요·방명록·일정참여가 **cascade 삭제**.
  단, 그 멤버가 만든 `practice_sessions`·`events`의 `created_by`는 **null 로만** 바뀌고 일정 자체는 보존.
- 멤버 **거절/내보내기**는 삭제가 아니라 `status='rejected'` (계정·기록 보존, 화면에는 승인 멤버만 노출).
