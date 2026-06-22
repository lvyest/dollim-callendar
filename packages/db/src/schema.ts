import {
  type AnyPgColumn,
  bigint,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// === enums (contracts 의 zod enum 과 1:1) ===
export const memberRole = pgEnum('member_role', ['admin', 'member']);
export const memberStatus = pgEnum('member_status', ['pending', 'approved', 'rejected']);
export const sessionType = pgEnum('session_type', ['fixed', 'variable', 'hapgut', 'outside', 'etc']);
export const attendanceStatus = pgEnum('attendance_status', ['yes', 'partial', 'no', 'undecided']);
export const mediaKind = pgEnum('media_kind', ['upload', 'link']);
export const eventType = pgEnum('event_type', ['performance', 'training', 'education', 'hapgut', 'etc']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// === 멤버 ===
export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  generation: integer('generation').notNull(),
  role: memberRole('role').notNull().default('member'),
  isSenior: boolean('is_senior').notNull().default(false),
  color: text('color').notNull(),
  kakaoId: text('kakao_id').notNull().unique(),
  status: memberStatus('status').notNull().default('pending'),
  createdAt: createdAt(),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: uuid('approved_by').references((): AnyPgColumn => members.id),
  notificationsReadAt: timestamp('notifications_read_at', { withTimezone: true }),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
});

// === 고정 연습실 슬롯(월별) ===
export const fixedSlots = pgTable('fixed_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  yearMonth: text('year_month').notNull(),
  weekday: integer('weekday').notNull(),
  room: text('room').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
});

// === 연습 세션 (하루 다건 가능) ===
export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    date: date('date').notNull(),
    room: text('room').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    type: sessionType('type').notNull(),
    title: text('title'),
    createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('practice_sessions_date_idx').on(t.date)],
);

// === 참여 (세션 x 멤버 유니크) ===
export const attendances = pgTable(
  'attendances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => practiceSessions.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    status: attendanceStatus('status').notNull(),
    reason: text('reason'),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('attendances_session_member_uq').on(t.sessionId, t.memberId)],
);

// === 배운 것(노트) + 미디어/좋아요/댓글 ===
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => practiceSessions.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const noteMedia = pgTable('note_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteId: uuid('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  kind: mediaKind('kind').notNull(),
  url: text('url').notNull(),
  storagePath: text('storage_path'),
  thumbnailUrl: text('thumbnail_url'),
  durationSec: integer('duration_sec'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
});

export const noteLikes = pgTable(
  'note_likes',
  {
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.memberId] })],
);

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  noteId: uuid('note_id')
    .notNull()
    .references(() => notes.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// === 특이일정 ===
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: eventType('type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  dateStart: date('date_start').notNull(),
  dateEnd: date('date_end'),
  location: text('location'),
  createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

export const eventMembers = pgTable(
  'event_members',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.memberId] })],
);

// === 방명록 ===
export const guestbookPosts = pgTable('guestbook_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const guestbookLikes = pgTable(
  'guestbook_likes',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => guestbookPosts.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.memberId] })],
);

// === 추론 row 타입 (select/insert) ===
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;
export type Attendance = typeof attendances.$inferSelect;
export type NewAttendance = typeof attendances.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type Event = typeof events.$inferSelect;
export type GuestbookPost = typeof guestbookPosts.$inferSelect;
