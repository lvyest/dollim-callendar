import { CreateCommentInputSchema } from '@dollim/contracts';
import { comments, getDb } from '@dollim/db';
import { asc, eq } from 'drizzle-orm';

import { created, handle, ok } from '@/lib/api/respond';
import { requireApproved } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    await requireApproved();
    const { id } = await params;
    const db = getDb();
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.noteId, id))
      .orderBy(asc(comments.createdAt), asc(comments.id));
    return ok(rows);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireApproved();
    const { id } = await params;
    const input = CreateCommentInputSchema.parse(await req.json());
    const db = getDb();
    const ins = await db
      .insert(comments)
      .values({ noteId: id, authorId: me.id, parentId: input.parentId ?? null, content: input.content })
      .returning();
    return created(ins[0]);
  });
}
