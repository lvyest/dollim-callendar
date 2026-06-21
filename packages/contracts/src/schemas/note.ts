import { isoDateTime, uuid, z } from './common';

/** 미디어 종류: 직접 업로드(인앱 재생) / 외부 링크(유튜브 등). */
export const MediaKind = z.enum(['upload', 'link']);
export type MediaKind = z.infer<typeof MediaKind>;

export const NoteMediaSchema = z.object({
  id: uuid(),
  noteId: uuid(),
  kind: MediaKind,
  url: z.string().url(),
  /** upload 일 때 Supabase Storage 경로. link 면 null. */
  storagePath: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  durationSec: z.number().int().nonnegative().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
});
export type NoteMedia = z.infer<typeof NoteMediaSchema>;

/** 오늘 배운 것 — 세션마다 멤버 개인별로 작성, 서로 열람 가능. */
export const NoteSchema = z.object({
  id: uuid(),
  sessionId: uuid(),
  authorId: uuid(),
  content: z.string().min(1).max(2000),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  /** 요청자가 좋아요를 눌렀는지. */
  likedByMe: z.boolean(),
  /** 좋아요 누른 멤버 이름 목록(hover 표시용). */
  likers: z.array(z.string()),
  createdAt: isoDateTime(),
  updatedAt: isoDateTime(),
  media: z.array(NoteMediaSchema),
});
export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteInputSchema = z.object({
  sessionId: uuid(),
  content: z.string().min(1).max(2000),
  media: z
    .array(
      z.object({
        kind: MediaKind,
        url: z.string().url(),
        storagePath: z.string().optional(),
        thumbnailUrl: z.string().url().optional(),
        durationSec: z.number().int().nonnegative().optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
      }),
    )
    .default([]),
});
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;

export const UpdateNoteInputSchema = z.object({ content: z.string().min(1).max(2000) });
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>;

/** 노트 댓글 — parentId 로 대댓글(답글) 지원. */
export const CommentSchema = z.object({
  id: uuid(),
  noteId: uuid(),
  authorId: uuid(),
  parentId: uuid().nullable().openapi({ description: '대댓글이면 부모 댓글 id' }),
  content: z.string().min(1).max(500),
  createdAt: isoDateTime(),
  updatedAt: isoDateTime(),
});
export type Comment = z.infer<typeof CommentSchema>;

export const CreateCommentInputSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

export const UpdateCommentInputSchema = z.object({ content: z.string().min(1).max(500) });
export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>;
