import { redirect } from 'next/navigation';

import { LogoutButton } from '@/components/LogoutButton';
import { getAccessState } from '@/lib/auth';
import { initial } from '@/lib/avatar';

export default async function PendingPage() {
  const { state, member } = await getAccessState();
  if (state === 'anonymous') redirect('/login');
  if (state === 'unregistered') redirect('/signup');
  if (state === 'approved') redirect('/');
  // pending
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col items-center px-6 pb-9 pt-28 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-accent-50 text-5xl">
        ⏳
      </div>
      <h1 className="mt-5 text-2xl font-bold text-[#11161F]">승인을 기다리고 있어요</h1>
      <p className="mt-2 text-[15px] font-medium leading-relaxed text-gray-500">
        가입 신청이 운영진에게 전달됐어요.
        <br />
        승인되면 알림으로 바로 알려드릴게요!
      </p>

      <div className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-accent-200 bg-white px-4 py-3.5 shadow-soft">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: member?.color ?? '#3B73EF' }}
        >
          {initial(member?.name)}
        </span>
        <div className="text-left">
          <p className="font-bold text-[#11161F]">{member?.name}</p>
          <p className="text-xs font-medium text-gray-500">{member?.generation}기 · 멤버 신청</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1.5 text-[11px] font-bold text-[#8a6a00]">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
          승인 대기 중
        </span>
      </div>

      <p className="mt-3 text-xs font-medium text-gray-400">보통 하루 안에 승인돼요</p>

      <LogoutButton className="mt-auto pt-8 text-sm font-bold text-gray-500" />
    </main>
  );
}
