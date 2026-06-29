'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { AlertIcon, CheckIcon, KebabIcon, UserIcon } from '@/components/icons';
import {
  getGetMembersQueryKey,
  useGetMembers,
  usePatchMembersIdRole,
  usePostMembersIdApproval,
} from '@/lib/api/generated/members/members';
import type { Member } from '@/lib/api/generated/model';
import { initial } from '@/lib/avatar';

export function MembersView({ isAdmin, meId }: { isAdmin: boolean; meId: string }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetMembersQueryKey() });
  const { data: members, isLoading } = useGetMembers();
  const approval = usePostMembersIdApproval({ mutation: { onSuccess: invalidate } });
  const role = usePatchMembersIdRole({ mutation: { onSuccess: invalidate } });
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const list = members ?? [];
  const pending = list.filter((m) => m.status === 'pending');
  const approved = list
    .filter((m) => m.status === 'approved')
    .sort((a, b) => {
      if (a.id === meId) return -1;
      if (b.id === meId) return 1;
      if (b.generation !== a.generation) return b.generation - a.generation;
      return a.name.localeCompare(b.name, 'ko');
    });
  const rejected = list.filter((m) => m.status === 'rejected');

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[400px] bg-appbg px-5 pb-28 pt-6">
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-surface-blue text-primary-500">
            <UserIcon className="h-[19px] w-[19px]" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#11161F]">멤버</h1>
            <p className="text-xs font-medium text-gray-500">
              총 {approved.length}명 · 승인 대기 {pending.length}
            </p>
          </div>
        </header>

        {isLoading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중…</p>}

        {isAdmin && pending.length > 0 && (
          <section className="mb-3 rounded-[18px] border border-accent-200 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <AlertIcon className="h-[18px] w-[18px] text-senior" />
              <p className="flex-1 text-sm font-bold text-[#11161F]">가입 승인 대기</p>
              <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-bold text-[#8a6a00]">
                {pending.length}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-gray-500">
              승인해야 캘린더·참여를 사용할 수 있어요
            </p>
            <ul className="mt-1.5">
              {pending.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 pt-2.5">
                  <Avatar member={m} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#11161F]">{m.name}</p>
                    <p className="text-[11px] text-gray-500">{m.generation}기 · 신청</p>
                  </div>
                  <button
                    type="button"
                    disabled={approval.isPending}
                    onClick={() => approval.mutate({ id: m.id, data: { decision: 'reject' } })}
                    className="rounded-[10px] border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-50"
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    disabled={approval.isPending}
                    onClick={() => approval.mutate({ id: m.id, data: { decision: 'approve' } })}
                    className="flex items-center gap-1 rounded-[10px] bg-primary-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} /> 승인
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-[18px] bg-white p-4 shadow-soft">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-bold text-[#11161F]">멤버</p>
            {isAdmin && <p className="text-[11px] font-medium text-gray-400">운영진만 관리</p>}
          </div>
          <ul className="divide-y divide-gray-100">
            {approved.map((m) => (
              <li key={m.id} className={`relative flex items-center gap-3 py-2.5 ${m.id === meId ? '-mx-2 rounded-xl bg-surface-blue px-2' : ''}`}>
                <Avatar member={m} isMe={m.id === meId} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#11161F]">{m.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {m.generation}기 · {m.role === 'admin' ? '운영진' : '멤버'}
                  </p>
                </div>
                {m.role === 'admin' && <Tag className="bg-surface-blue text-primary-700">운영진</Tag>}
                {m.isSenior && <Tag className="bg-accent-50 text-[#8a6a00]">선배</Tag>}
                {isAdmin && m.id !== meId && (
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                    className="text-gray-300"
                    aria-label="멤버 관리"
                  >
                    <KebabIcon className="h-4 w-4" />
                  </button>
                )}
                {openMenu === m.id && (
                  <>
                    <button
                      type="button"
                      aria-label="닫기"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setOpenMenu(null)}
                    />
                    <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-float ring-1 ring-gray-100">
                      <button
                        type="button"
                        disabled={role.isPending}
                        onClick={() => {
                          role.mutate({ id: m.id, data: { role: m.role === 'admin' ? 'member' : 'admin' } });
                          setOpenMenu(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium text-[#11161F] hover:bg-gray-50"
                      >
                        🛡️ {m.role === 'admin' ? '운영진 해제' : '운영진으로 지정'}
                      </button>
                      <button
                        type="button"
                        disabled={approval.isPending}
                        onClick={() => {
                          approval.mutate({ id: m.id, data: { decision: 'reject' } });
                          setOpenMenu(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] font-medium text-danger hover:bg-gray-50"
                      >
                        🚪 내보내기
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        {isAdmin && rejected.length > 0 && (
          <section className="mt-3 rounded-[18px] bg-white p-4 shadow-soft">
            <p className="mb-1 text-sm font-bold text-[#11161F]">거절한 멤버</p>
            <p className="mb-2 text-[11px] font-medium text-gray-500">
              가입은 되어 있어요. 승인하거나 다시 대기로 되돌릴 수 있어요.
            </p>
            <ul className="divide-y divide-gray-100">
              {rejected.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="opacity-60">
                    <Avatar member={m} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-500">{m.name}</p>
                    <p className="text-[11px] text-gray-400">{m.generation}기 · 거절됨</p>
                  </div>
                  <button
                    type="button"
                    disabled={approval.isPending}
                    onClick={() => approval.mutate({ id: m.id, data: { decision: 'pending' } })}
                    className="rounded-[10px] border border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 disabled:opacity-50"
                  >
                    대기로
                  </button>
                  <button
                    type="button"
                    disabled={approval.isPending}
                    onClick={() => approval.mutate({ id: m.id, data: { decision: 'approve' } })}
                    className="flex items-center gap-1 rounded-[10px] bg-primary-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} /> 승인
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

function Avatar({ member, isMe = false }: { member: Member; isMe?: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${isMe ? 'ring-2 ring-primary-400 ring-offset-1' : ''}`}
      style={{
        backgroundColor: member.color,
        boxShadow: member.isSenior ? 'inset 0 0 0 2px #E0A400' : undefined,
      }}
    >
      {initial(member.name)}
    </span>
  );
}

function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${className ?? ''}`}>
      {children}
    </span>
  );
}
