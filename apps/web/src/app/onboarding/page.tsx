import { redirect } from 'next/navigation';

import { getCurrentMember, getSessionUser } from '@/lib/auth';

import { OnboardingView } from './onboarding-view';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const isPreview = preview === '1';

  const user = await getSessionUser();
  if (!user) redirect('/login');
  const member = await getCurrentMember();
  if (!member) redirect('/signup');
  // 미리보기가 아니면, 이미 본 사람은 건너뛰기
  if (!isPreview && member.onboardedAt) redirect('/');

  return <OnboardingView preview={isPreview} />;
}
