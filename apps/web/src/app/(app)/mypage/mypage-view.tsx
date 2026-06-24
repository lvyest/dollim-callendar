'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';

import { LogoutButton } from '@/components/LogoutButton';
import { SlidersIcon } from '@/components/icons';
import { usePatchMe } from '@/lib/api/generated/auth/auth';
import { customFetch } from '@/lib/api/http';
import { createClient } from '@/lib/supabase/client';
import { initial } from '@/lib/avatar';

type Profile = {
  id: string;
  name: string;
  generation: number;
  color: string;
  role: 'admin' | 'member';
  isSenior: boolean;
};

export function MyPageView({ member }: { member: Profile }) {
  const router = useRouter();
  const [color, setColor] = useState(member.color);
  const [editingColor, setEditingColor] = useState(false);
  const [isSenior, setIsSenior] = useState(member.isSenior);
  const patch = usePatchMe({ mutation: { onSuccess: () => router.refresh() } });
  const withdraw = useMutation({
    mutationFn: () => customFetch({ url: '/me', method: 'DELETE' }),
    onSuccess: async () => {
      await createClient().auth.signOut();
      router.replace('/login');
      router.refresh();
    },
  });

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[400px] space-y-3.5 bg-appbg px-5 pb-28 pt-6">
        <header className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-surface-blue text-primary-500">
            <SlidersIcon className="h-[19px] w-[19px]" />
          </span>
          <h1 className="text-xl font-bold text-[#11161F]">마이페이지</h1>
        </header>

        <section className="flex flex-col items-center rounded-[20px] bg-white py-7 shadow-soft">
          <span
            className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white"
            style={{ backgroundColor: color, boxShadow: isSenior ? 'inset 0 0 0 3px #E0A400' : undefined }}
          >
            {initial(member.name)}
          </span>
          <p className="mt-3 text-lg font-bold text-[#11161F]">{member.name}</p>
          <span className="mt-1.5 rounded-full bg-surface-blue px-2.5 py-1 text-xs font-bold text-primary-700">
            {member.generation}기 · {member.role === 'admin' ? '운영진' : '멤버'}
            {isSenior ? ' · 선배' : ''}
          </span>
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-soft">
          <div className="flex items-center">
            <p className="text-sm font-bold text-[#11161F]">내 색상</p>
            {!editingColor && (
              <button
                type="button"
                onClick={() => setEditingColor(true)}
                className="ml-auto rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600"
              >
                수정하기
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-gray-500">
            프로필 색뿐만 아니라, 캘린더·참여 현황에서도 이 색으로 표시돼요.
          </p>

          {editingColor ? (
            <>
              <div className="mt-3">
                <HexColorPicker color={color} onChange={setColor} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-9 w-9 shrink-0 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
                <span className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-bold text-[#11161F]">
                  {color.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setColor(member.color);
                    setEditingColor(false);
                  }}
                  className="ml-auto rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-500"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    patch.mutate({ data: { color } });
                    setEditingColor(false);
                  }}
                  disabled={patch.isPending || color === member.color}
                  className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  저장
                </button>
              </div>
            </>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <span className="h-9 w-9 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
              <span className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-bold text-[#11161F]">
                {color.toUpperCase()}
              </span>
            </div>
          )}
        </section>

        <section className="rounded-[20px] bg-white shadow-soft">
          <label className="flex items-center gap-3 px-4 py-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-50 text-sm">🏅</span>
            <div className="flex-1">
              <p className="text-[14.5px] font-medium text-[#11161F]">선배 멤버</p>
              <p className="text-[11px] text-gray-500">켜면 아바타에 선배 테두리가 생겨요</p>
            </div>
            <input
              type="checkbox"
              checked={isSenior}
              onChange={(e) => {
                setIsSenior(e.target.checked);
                patch.mutate({ data: { isSenior: e.target.checked } });
              }}
              className="h-5 w-5 accent-primary-500"
            />
          </label>
          <Link
            href="/onboarding?preview=1"
            className="flex items-center gap-3 border-t border-gray-100 px-4 py-4"
          >
            <p className="flex-1 text-[14.5px] font-medium text-[#11161F]">돌림력을 어떻게 쓰냐면요</p>
            <span className="text-gray-300">›</span>
          </Link>
          <div className="border-t border-gray-100 px-4 py-4">
            <LogoutButton className="text-[14.5px] font-bold text-[#11161F]" />
          </div>
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-soft">
          <p className="text-[13px] font-bold text-[#11161F]">계정 관리</p>
          <p className="mt-1 text-[11.5px] leading-snug text-gray-500">
            탈퇴하면 내 참여 기록·배운 것·댓글·방명록이 모두 삭제되고 되돌릴 수 없어요.
          </p>
          <button
            type="button"
            disabled={withdraw.isPending}
            onClick={() => {
              if (confirm('정말 탈퇴할까요? 내 모든 기록이 삭제되며 되돌릴 수 없어요.')) withdraw.mutate();
            }}
            className="mt-3 w-full rounded-xl border border-danger py-2.5 text-sm font-bold text-danger disabled:opacity-50"
          >
            {withdraw.isPending ? '탈퇴 처리 중…' : '탈퇴하기'}
          </button>
        </section>
      </main>
    </>
  );
}
