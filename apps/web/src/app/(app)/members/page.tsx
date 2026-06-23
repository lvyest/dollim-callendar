import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

import { MembersView } from './members-view';

export default async function MembersPage() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'pending') redirect('/pending');
  // approved
  return <MembersView isAdmin={member!.role === 'admin'} meId={member!.id} />;
}
