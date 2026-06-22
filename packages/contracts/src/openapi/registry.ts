import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { z } from '../schemas/common';
import {
  ApprovalInputSchema,
  AttendanceSchema,
  AttendanceSummarySchema,
  CommentSchema,
  CreateCommentInputSchema,
  CreateEventInputSchema,
  CreateGuestbookPostInputSchema,
  CreateNoteInputSchema,
  CreateSessionInputSchema,
  EventSchema,
  GuestbookPostSchema,
  MemberSchema,
  MemberStatus,
  NoteSchema,
  PracticeSessionSchema,
  SignupInputSchema,
  UpdateProfileInputSchema,
  UpdateRoleInputSchema,
  UpsertAttendanceInputSchema,
} from '../schemas';

export const registry = new OpenAPIRegistry();

// --- 인증 ---
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const ErrorResponse = registry.register(
  'ErrorResponse',
  z.object({ error: z.object({ code: z.string(), message: z.string() }) }),
);

// --- 컴포넌트(스키마) 등록 ---
const Member = registry.register('Member', MemberSchema);
const PracticeSession = registry.register('PracticeSession', PracticeSessionSchema);
const Attendance = registry.register('Attendance', AttendanceSchema);
const AttendanceSummary = registry.register('AttendanceSummary', AttendanceSummarySchema);
const Note = registry.register('Note', NoteSchema);
const Comment = registry.register('Comment', CommentSchema);
const Event = registry.register('Event', EventSchema);
const GuestbookPost = registry.register('GuestbookPost', GuestbookPostSchema);
const LikeResult = registry.register('LikeResult', z.object({ liked: z.boolean(), likeCount: z.number().int() }));

const json = (schema: z.ZodTypeAny) => ({ content: { 'application/json': { schema } } });
const security = [{ [bearerAuth.name]: [] }];
const idParam = z.object({ id: z.string().uuid() });
const errors = {
  401: { description: '인증 필요', ...json(ErrorResponse) },
  403: { description: '권한 없음(미승인/비운영진)', ...json(ErrorResponse) },
  404: { description: '없음', ...json(ErrorResponse) },
};

// === 인증/멤버 ===
registry.registerPath({
  method: 'get',
  path: '/me',
  tags: ['auth'],
  summary: '내 프로필 조회',
  security,
  responses: { 200: { description: '내 멤버 정보', ...json(Member) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/auth/signup',
  tags: ['auth'],
  summary: '가입 신청(카카오 인증 후 프로필 입력)',
  security,
  request: { body: json(SignupInputSchema) },
  responses: { 201: { description: '신청 완료(status=pending)', ...json(Member) }, ...errors },
});

registry.registerPath({
  method: 'patch',
  path: '/me',
  tags: ['auth'],
  summary: '내 프로필 수정(이름/기수/색상/선배여부)',
  security,
  request: { body: json(UpdateProfileInputSchema) },
  responses: { 200: { description: '수정됨', ...json(Member) }, ...errors },
});

registry.registerPath({
  method: 'get',
  path: '/members',
  tags: ['members'],
  summary: '멤버 목록(상태별 필터)',
  security,
  request: { query: z.object({ status: MemberStatus.optional() }) },
  responses: { 200: { description: '멤버 목록', ...json(z.array(Member)) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/members/{id}/approval',
  tags: ['members'],
  summary: '가입 승인/거절(운영진)',
  security,
  request: { params: idParam, body: json(ApprovalInputSchema) },
  responses: { 200: { description: '처리됨', ...json(Member) }, ...errors },
});

registry.registerPath({
  method: 'patch',
  path: '/members/{id}/role',
  tags: ['members'],
  summary: '역할 변경(운영진 지정/해제)',
  security,
  request: { params: idParam, body: json(UpdateRoleInputSchema) },
  responses: { 200: { description: '변경됨', ...json(Member) }, ...errors },
});

// === 세션/참여 ===
registry.registerPath({
  method: 'get',
  path: '/sessions',
  tags: ['sessions'],
  summary: '월간 연습 세션 목록',
  security,
  request: { query: z.object({ month: z.string() }) },
  responses: { 200: { description: '세션 목록', ...json(z.array(PracticeSession)) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/sessions',
  tags: ['sessions'],
  summary: '연습 세션 추가',
  security,
  request: { body: json(CreateSessionInputSchema) },
  responses: { 201: { description: '생성됨', ...json(PracticeSession) }, ...errors },
});

registry.registerPath({
  method: 'get',
  path: '/sessions/{id}/summary',
  tags: ['attendance'],
  summary: '세션 참여 집계(선배 분리)',
  security,
  request: { params: idParam },
  responses: { 200: { description: '집계', ...json(AttendanceSummary) }, ...errors },
});

registry.registerPath({
  method: 'put',
  path: '/sessions/{id}/attendance',
  tags: ['attendance'],
  summary: '내 참여 입력/수정',
  security,
  request: { params: idParam, body: json(UpsertAttendanceInputSchema) },
  responses: { 200: { description: '저장됨', ...json(Attendance) }, ...errors },
});

// === 노트(배운 것)/댓글 ===
registry.registerPath({
  method: 'get',
  path: '/sessions/{id}/notes',
  tags: ['notes'],
  summary: '세션의 배운 것 피드',
  security,
  request: { params: idParam },
  responses: { 200: { description: '노트 목록', ...json(z.array(Note)) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/sessions/{id}/notes',
  tags: ['notes'],
  summary: '내 기록 작성(영상 첨부 포함)',
  security,
  request: { params: idParam, body: json(CreateNoteInputSchema) },
  responses: { 201: { description: '작성됨', ...json(Note) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/notes/{id}/like',
  tags: ['notes'],
  summary: '노트 좋아요 토글',
  security,
  request: { params: idParam },
  responses: { 200: { description: '토글 결과', ...json(LikeResult) }, ...errors },
});

registry.registerPath({
  method: 'get',
  path: '/notes/{id}/comments',
  tags: ['notes'],
  summary: '댓글/답글 목록',
  security,
  request: { params: idParam },
  responses: { 200: { description: '댓글 목록', ...json(z.array(Comment)) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/notes/{id}/comments',
  tags: ['notes'],
  summary: '댓글/답글 작성(parentId로 답글)',
  security,
  request: { params: idParam, body: json(CreateCommentInputSchema) },
  responses: { 201: { description: '작성됨', ...json(Comment) }, ...errors },
});

// === 특이일정 ===
registry.registerPath({
  method: 'get',
  path: '/events',
  tags: ['events'],
  summary: '월간 특이일정 목록',
  security,
  request: { query: z.object({ month: z.string() }) },
  responses: { 200: { description: '특이일정 목록', ...json(z.array(Event)) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/events',
  tags: ['events'],
  summary: '특이일정 추가',
  security,
  request: { body: json(CreateEventInputSchema) },
  responses: { 201: { description: '생성됨', ...json(Event) }, ...errors },
});

// === 방명록 ===
registry.registerPath({
  method: 'get',
  path: '/guestbook',
  tags: ['guestbook'],
  summary: '방명록 목록',
  security,
  responses: { 200: { description: '방명록 목록', ...json(z.array(GuestbookPost)) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/guestbook',
  tags: ['guestbook'],
  summary: '방명록 작성',
  security,
  request: { body: json(CreateGuestbookPostInputSchema) },
  responses: { 201: { description: '작성됨', ...json(GuestbookPost) }, ...errors },
});

registry.registerPath({
  method: 'post',
  path: '/guestbook/{id}/like',
  tags: ['guestbook'],
  summary: '방명록 좋아요 토글',
  security,
  request: { params: idParam },
  responses: { 200: { description: '토글 결과', ...json(LikeResult) }, ...errors },
});
