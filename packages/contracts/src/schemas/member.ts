import { hexColor, isoDateTime, uuid, z } from './common';

/** 역할: 운영진(admin) / 일반 멤버(member). 첫 가입자가 자동으로 운영진. */
export const MemberRole = z.enum(['admin', 'member']);
export type MemberRole = z.infer<typeof MemberRole>;

/** 가입 승인 상태: 신청(pending) / 승인(approved) / 거절(rejected). */
export const MemberStatus = z.enum(['pending', 'approved', 'rejected']);
export type MemberStatus = z.infer<typeof MemberStatus>;

export const MemberSchema = z.object({
  id: uuid(),
  name: z.string().min(1).max(20),
  generation: z.number().int().positive().openapi({ example: 13, description: '기수 (직접 입력)' }),
  role: MemberRole,
  /** 선배(예: 2기 등) 여부 — 본인이 설정에서 토글, 아바타에 테두리 표시. */
  isSenior: z.boolean(),
  /** 멤버 식별 색상 — 캘린더/참여현황/방명록 전역에서 이 색으로 표시. */
  color: hexColor(),
  kakaoId: z.string().openapi({ description: '카카오 OAuth subject' }),
  status: MemberStatus,
  createdAt: isoDateTime(),
  approvedAt: isoDateTime().nullable(),
  approvedBy: uuid().nullable().openapi({ description: '승인한 운영진 id' }),
});
export type Member = z.infer<typeof MemberSchema>;

/** 카카오 로그인 후 프로필 입력(= 가입 신청). 승인 전까지 status=pending. */
export const SignupInputSchema = z.object({
  name: z.string().min(1).max(20),
  generation: z.number().int().positive(),
  color: hexColor(),
  isSenior: z.boolean().default(false),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

/** 마이페이지 프로필 수정 (이름/기수/색상/선배여부 부분 수정). */
export const UpdateProfileInputSchema = SignupInputSchema.partial();
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

/** 운영진이 역할 변경 (운영진 지정/해제). */
export const UpdateRoleInputSchema = z.object({ role: MemberRole });
export type UpdateRoleInput = z.infer<typeof UpdateRoleInputSchema>;

/** 가입 승인/거절/대기복구 결정. */
export const ApprovalInputSchema = z.object({ decision: z.enum(['approve', 'reject', 'pending']) });
export type ApprovalInput = z.infer<typeof ApprovalInputSchema>;
