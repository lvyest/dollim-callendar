import 'server-only';

import { getDb, members, type Member } from '@dollim/db';
import { eq } from 'drizzle-orm';

import { ApiError } from '@/lib/api/respond';
import { createClient } from '@/lib/supabase/server';

/** 현재 로그인된 Supabase 유저(미가입 포함). */
export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * 현재 유저의 멤버 레코드. 미로그인/미가입이면 null.
 * members.kakaoId 에는 Supabase auth user id 를 저장한다(카카오 로그인 1:1).
 */
export async function getCurrentMember(): Promise<Member | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const db = getDb();
  const rows = await db.select().from(members).where(eq(members.kakaoId, user.id)).limit(1);
  return rows[0] ?? null;
}

/** 승인된 멤버만 통과. 아니면 사유 코드 반환(라우트에서 상태 판단). */
export async function getAccessState() {
  // 유저를 한 번만 조회하고 멤버는 직접 질의 (인증 네트워크 호출 중복 제거 → 페이지 전환 빠름)
  const user = await getSessionUser();
  if (!user) return { state: 'anonymous' as const, member: null };
  const db = getDb();
  const rows = await db.select().from(members).where(eq(members.kakaoId, user.id)).limit(1);
  const member = rows[0] ?? null;
  if (!member) return { state: 'unregistered' as const, member: null };
  if (member.status !== 'approved') return { state: 'pending' as const, member };
  return { state: 'approved' as const, member };
}

// === 라우트 가드 (실패 시 ApiError throw → handle() 이 처리) ===

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError('unauthorized', '로그인이 필요합니다', 401);
  return user;
}

/** 승인된 멤버만 통과. */
export async function requireApproved() {
  const s = await getAccessState();
  if (s.state === 'anonymous') throw new ApiError('unauthorized', '로그인이 필요합니다', 401);
  if (s.state !== 'approved') throw new ApiError('forbidden', '승인된 멤버만 사용할 수 있습니다', 403);
  return s.member;
}

/** 운영진만 통과. */
export async function requireAdmin() {
  const member = await requireApproved();
  if (member.role !== 'admin') throw new ApiError('forbidden', '운영진만 가능합니다', 403);
  return member;
}
