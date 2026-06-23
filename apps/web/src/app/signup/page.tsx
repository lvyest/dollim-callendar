'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';

import { CheckIcon, InfoIcon } from '@/components/icons';
import { usePostAuthSignup } from '@/lib/api/generated/auth/auth';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [generation, setGeneration] = useState('31');
  const [color, setColor] = useState('#3B73EF');
  const [isSenior, setIsSenior] = useState(false);
  const signup = usePostAuthSignup();

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        const meta = data.user?.user_metadata as
          | { name?: string; full_name?: string; preferred_username?: string }
          | undefined;
        const nick = meta?.name ?? meta?.full_name ?? meta?.preferred_username;
        if (nick) setName((prev) => prev || nick);
      });
  }, []);

  const gen = Number(generation);
  const valid = name.trim().length > 0 && Number.isInteger(gen) && gen > 0;

  async function submit() {
    if (!valid || signup.isPending) return;
    await signup.mutateAsync({ data: { name: name.trim(), generation: gen, color, isSenior } });
    router.replace('/onboarding');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col px-6 pb-10 pt-14">
      <h1 className="text-2xl font-bold text-[#11161F]">거의 다 왔어요! 🥁</h1>
      <p className="mt-1 text-sm font-medium text-gray-500">프로필만 설정하면 가입 신청 완료</p>

      <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success">
        <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        카카오 인증 완료
      </span>

      <div className="mt-6 space-y-5">
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-primary-400"
          />
        </Field>

        <Field label="기수 (직접 입력)">
          <div className="flex items-center rounded-xl border border-gray-200 bg-white px-4 py-3.5 focus-within:border-primary-400">
            <input
              value={generation}
              onChange={(e) => setGeneration(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="31"
              className="w-full text-[15px] outline-none"
            />
            <span className="text-sm font-medium text-gray-400">기</span>
          </div>
        </Field>

        <Field label="내 색상">
          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <HexColorPicker color={color} onChange={setColor} />
            <div className="mt-3 flex items-center gap-3">
              <span
                className="h-9 w-9 rounded-full border border-gray-200"
                style={{ backgroundColor: color }}
              />
              <span className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-bold text-[#11161F]">
                {color.toUpperCase()}
              </span>
              <span className="ml-auto text-[11px] text-gray-400">캘린더에서 나를 구분해요</span>
            </div>
          </div>
        </Field>

        <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5">
          <span className="text-[15px] font-medium text-[#11161F]">선배 (2기 등) 멤버</span>
          <input
            type="checkbox"
            checked={isSenior}
            onChange={(e) => setIsSenior(e.target.checked)}
            className="h-5 w-5 accent-primary-500"
          />
        </label>
      </div>

      {signup.isError && (
        <p className="mt-4 text-sm font-medium text-danger">
          가입에 실패했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <div className="mt-8">
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-surface-blue px-3.5 py-3 text-xs font-medium text-primary-700">
          <InfoIcon className="h-4 w-4 shrink-0" />
          운영진 승인 후 캘린더를 사용할 수 있어요
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || signup.isPending}
          className="w-full rounded-2xl bg-primary-500 py-4 text-base font-bold text-white shadow-soft transition active:scale-[0.99] disabled:opacity-50"
        >
          {signup.isPending ? '신청 중…' : '가입 신청하기'}
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold text-gray-600">{label}</p>
      {children}
    </div>
  );
}
