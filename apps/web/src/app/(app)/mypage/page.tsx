import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

import { MyPageView } from './mypage-view';

export default async function MyPage() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'pending') redirect('/pending');
  return <MyPageView member={member!} />;
}
