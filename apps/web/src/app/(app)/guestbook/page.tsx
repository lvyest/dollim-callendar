import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

import { GuestbookView } from './guestbook-view';

export default async function GuestbookPage() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'pending') redirect('/pending');
  return <GuestbookView meId={member!.id} />;
}
