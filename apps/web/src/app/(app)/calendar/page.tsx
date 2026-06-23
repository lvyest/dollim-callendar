import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

import { CalendarView } from './calendar-view';

export default async function CalendarPage() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'pending') redirect('/pending');
  return <CalendarView isAdmin={member?.role === 'admin'} meId={member?.id ?? ''} />;
}
