import { isoDateTime, uuid, z } from './common';

/** 방명록 글 — 동아리 응원·피드백 게시판. */
export const GuestbookPostSchema = z.object({
  id: uuid(),
  authorId: uuid(),
  content: z.string().min(1).max(1000),
  likeCount: z.number().int().nonnegative(),
  likedByMe: z.boolean(),
  /** 좋아요 누른 멤버 이름 목록(hover 표시용). */
  likers: z.array(z.string()),
  createdAt: isoDateTime(),
  updatedAt: isoDateTime(),
});
export type GuestbookPost = z.infer<typeof GuestbookPostSchema>;

export const CreateGuestbookPostInputSchema = z.object({
  content: z.string().min(1).max(1000),
});
export type CreateGuestbookPostInput = z.infer<typeof CreateGuestbookPostInputSchema>;

export const UpdateGuestbookPostInputSchema = CreateGuestbookPostInputSchema;
export type UpdateGuestbookPostInput = z.infer<typeof UpdateGuestbookPostInputSchema>;
