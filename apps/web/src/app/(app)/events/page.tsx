import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

import { EventsView } from './events-view';

export default async function EventsPage() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'pending') redirect('/pending');
  return <EventsView isAdmin={member?.role === 'admin'} meId={member?.id ?? ''} />;
}
