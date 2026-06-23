import { redirect } from 'next/navigation';

import { getAccessState } from '@/lib/auth';

import { DayView } from './day-view';

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'pending') redirect('/pending');
  const { date } = await params;
  return (
    <DayView
      date={date}
      meId={member!.id}
      meName={member!.name}
      meColor={member!.color}
      isAdmin={member!.role === 'admin'}
    />
  );
}
