import { CreateNoteInputSchema } from '@dollim/contracts';
import { comments as commentsTable, getDb, members, noteLikes, noteMedia, notes } from '@dollim/db';
import { asc, desc, eq, inArray } from 'drizzle-orm';

import { created, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireApproved();
    const { id } = await params;
    const db = getDb();
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.sessionId, id))
      .orderBy(desc(notes.createdAt), asc(notes.id));
    const ids = rows.map((r) => r.id);
    const media = ids.length ? await db.select().from(noteMedia).where(inArray(noteMedia.noteId, ids)) : [];
    const likes = ids.length ? await db.select().from(noteLikes).where(inArray(noteLikes.noteId, ids)) : [];
    const cmts = ids.length
      ? await db.select({ noteId: commentsTable.noteId }).from(commentsTable).where(inArray(commentsTable.noteId, ids))
      : [];

    // 좋아요 누른 사람 이름 (hover 표시)
    const likerIds = [...new Set(likes.map((l) => l.memberId))];
    const likerRows = likerIds.length ? await db.select().from(members).where(inArray(members.id, likerIds)) : [];
    const nameById = new Map(likerRows.map((m) => [m.id, m.name]));

    const likeCount = new Map<string, number>();
    const likedByMe = new Set<string>();
    const likersByNote = new Map<string, string[]>();
    for (const l of likes) {
      likeCount.set(l.noteId, (likeCount.get(l.noteId) ?? 0) + 1);
      if (l.memberId === me.id) likedByMe.add(l.noteId);
      const arr = likersByNote.get(l.noteId) ?? [];
      arr.push(nameById.get(l.memberId) ?? '?');
      likersByNote.set(l.noteId, arr);
    }
    const cmtCount = new Map<string, number>();
    for (const c of cmts) cmtCount.set(c.noteId, (cmtCount.get(c.noteId) ?? 0) + 1);
    const mediaByNote = new Map<string, typeof media>();
    for (const m of media) {
      const arr = mediaByNote.get(m.noteId) ?? [];
      arr.push(m);
      mediaByNote.set(m.noteId, arr);
    }

    return ok(
      rows.map((r) => ({
        ...r,
        likeCount: likeCount.get(r.id) ?? 0,
        commentCount: cmtCount.get(r.id) ?? 0,
        likedByMe: likedByMe.has(r.id),
        likers: likersByNote.get(r.id) ?? [],
        media: mediaByNote.get(r.id) ?? [],
      })),
    );
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireApproved();
    const { id } = await params;
    // sessionId 는 URL 경로에서 받아 본문에 주입(클라이언트는 content/media 만 전송).
    const body = (await req.json()) as Record<string, unknown>;
    const input = CreateNoteInputSchema.parse({ ...body, sessionId: id });
    const db = getDb();
    const ins = await db.insert(notes).values({ sessionId: id, authorId: me.id, content: input.content }).returning();
    const note = ins[0]!;
    if (input.media.length) {
      await db.insert(noteMedia).values(
        input.media.map((m) => ({
          noteId: note.id,
          kind: m.kind,
          url: m.url,
          storagePath: m.storagePath ?? null,
          thumbnailUrl: m.thumbnailUrl ?? null,
          durationSec: m.durationSec ?? null,
          sizeBytes: m.sizeBytes ?? null,
        })),
      );
    }
    return created({ ...note, likeCount: 0, commentCount: 0, likedByMe: false, likers: [], media: [] });
  });
}
