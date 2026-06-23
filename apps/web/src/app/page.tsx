import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

// 로그인/가입/승인 상태에 따라 라우팅하는 게이트.
export default async function Gate() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (member && !member.onboardedAt) redirect('/onboarding');
  if (state === 'pending') redirect('/pending');
  redirect('/calendar');
}
