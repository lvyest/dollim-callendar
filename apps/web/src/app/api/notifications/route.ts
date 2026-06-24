import { attendances, comments, getDb, members, notes, practiceSessions } from '@dollim/db';
import { and, asc, desc, eq, gte, inArray, isNull, ne } from 'drizzle-orm';

import { handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

const pad = (n: number) => String(n).padStart(2, '0');

// 메인 알림: (1) 내 글 댓글 / 내 댓글 답글, (2) 참여여부 미입력 연습.
export async function GET() {
  return handle(async () => {
    const me = await requireApproved();
    const db = getDb();

    // 내 노트 / 내 댓글
    const myNotes = await db.select().from(notes).where(eq(notes.authorId, me.id));
    const myNoteIds = myNotes.map((n) => n.id);
    const myComments = await db.select().from(comments).where(eq(comments.authorId, me.id));
    const myCommentIds = myComments.map((c) => c.id);

    // 내 글에 달린 댓글(최상위) / 내 댓글에 달린 답글 — 내가 쓴 건 제외
    const onMyNotes = myNoteIds.length
      ? await db
          .select()
          .from(comments)
          .where(and(inArray(comments.noteId, myNoteIds), isNull(comments.parentId), ne(comments.authorId, me.id)))
      : [];
    const repliesToMe = myCommentIds.length
      ? await db
          .select()
          .from(comments)
          .where(and(inArray(comments.parentId, myCommentIds), ne(comments.authorId, me.id)))
      : [];

    // 알림 표시에 필요한 노트→세션, 작성자 이름 매핑
    const noteIds = Array.from(new Set([...onMyNotes, ...repliesToMe].map((c) => c.noteId)));
    const noteRows = noteIds.length ? await db.select().from(notes).where(inArray(notes.id, noteIds)) : [];
    const sessionByNote = new Map(noteRows.map((n) => [n.id, n.sessionId]));
    const sessIds = Array.from(new Set(noteRows.map((n) => n.sessionId)));
    const sessRows = sessIds.length
      ? await db.select().from(practiceSessions).where(inArray(practiceSessions.id, sessIds))
      : [];
    const sessById = new Map(sessRows.map((s) => [s.id, s]));
    const actorIds = Array.from(new Set([...onMyNotes, ...repliesToMe].map((c) => c.authorId)));
    const actorRows = actorIds.length ? await db.select().from(members).where(inArray(members.id, actorIds)) : [];
    const actorName = new Map(actorRows.map((m) => [m.id, m.name]));

    const social = [
      ...onMyNotes.map((c) => ({ kind: 'comment' as const, comment: c })),
      ...repliesToMe.map((c) => ({ kind: 'reply' as const, comment: c })),
    ]
      .map(({ kind, comment }) => {
        const sid = sessionByNote.get(comment.noteId);
        const sess = sid ? sessById.get(sid) : undefined;
        return {
          id: comment.id,
          kind,
          actor: actorName.get(comment.authorId) ?? '?',
          content: comment.content,
          date: sess?.date ?? null,
          createdAt: comment.createdAt,
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    // 참여여부 미입력 연습 (오늘 이후, 내 참여 행이 없는 것)
    // 서버가 UTC 라도 한국 날짜(KST) 기준으로 '오늘'을 계산해 과거 날짜가 끼지 않게 한다.
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const todayStr = `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
    const upcoming = await db
      .select()
      .from(practiceSessions)
      .where(gte(practiceSessions.date, todayStr))
      .orderBy(asc(practiceSessions.date), asc(practiceSessions.startTime));
    const upIds = upcoming.map((s) => s.id);
    const myAtts = upIds.length
      ? await db
          .select()
          .from(attendances)
          .where(and(eq(attendances.memberId, me.id), inArray(attendances.sessionId, upIds)))
      : [];
    // '미정'은 아직 결정 안 한 것 → 미입력으로 본다. yes/partial/no 만 입력 완료로 간주.
    const answered = new Set(myAtts.filter((a) => a.status !== 'undecided').map((a) => a.sessionId));
    const todo = upcoming
      .filter((s) => !answered.has(s.id))
      .map((s) => ({
        id: s.id,
        date: s.date,
        room: s.room,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
      }));

    const readAt = me.notificationsReadAt ? new Date(me.notificationsReadAt).getTime() : 0;
    const unreadCount = social.filter((s) => new Date(s.createdAt).getTime() > readAt).length;

    // 배지(count)는 미읽음 댓글·답글 + 참여 미입력. 목록은 최근 30건 노출.
    return ok({ social: social.slice(0, 30), todo, unreadCount, count: todo.length + unreadCount });
  });
}

