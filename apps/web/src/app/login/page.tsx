'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithKakao() {
    setLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile_nickname',
      },
    });
    if (error) setLoading(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col items-center justify-center px-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="돌림력 로고" className="h-60 w-60" />
      <h1 className="mt-[-20px] font-display text-[40px] font-bold text-primary-600">돌림력</h1>
      <p className="mt-3 text-[15px] font-medium leading-relaxed text-gray-500">
        상모도 돌리고, 일정도 돌리는
        <br />
        <span className="font-bold text-gray-600">청천벽력 채상인들</span>을 위한 캘린더
      </p>

      <button
        type="button"
        onClick={signInWithKakao}
        disabled={loading}
        className="mt-9 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-300 py-4 text-base font-bold text-[#3A1D1D] shadow-soft transition active:scale-[0.99] disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="#3A1D1D" aria-hidden>
          <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.7-.7 2.6-.8 3-.1.5.2.5.4.4.3-.2 2.7-1.8 3.7-2.5.6.1 1.3.1 2 .1 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
        </svg>
        {loading ? '카카오로 이동 중…' : '카카오로 시작하기'}
      </button>
      <p className="mt-3 text-xs font-medium text-gray-400">
        청천벽력 부원이면 누구나 바로 참여 체크 가능
      </p>
    </main>
  );
}
