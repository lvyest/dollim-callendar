'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { BellIcon } from '@/components/icons';
import { customFetch } from '@/lib/api/http';

type Social = { id: string; kind: 'comment' | 'reply'; actor: string; content: string; date: string | null; createdAt: string };
type Todo = { id: string; date: string; room: string; startTime: string; endTime: string; title: string | null };
type Notifications = { social: Social[]; todo: Todo[]; unreadCount: number; count: number };

const hhmm = (t: string) => t.slice(0, 5);
function dlabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()}(${wd})`;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'todo' | 'social'>('todo');
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => customFetch<Notifications>({ url: '/notifications', method: 'GET' }),
    refetchInterval: 60_000,
  });
  const count = data?.count ?? 0;
  const todoCount = data?.todo.length ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: () => customFetch({ url: '/notifications/read', method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // 여러 연습 참여여부 한번에 입력
  const [bulk, setBulk] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const bulkApply = useMutation({
    mutationFn: async ({ status, reason }: { status: 'yes' | 'no' | 'undecided'; reason?: string }) => {
      const ids = [...sel];
      await Promise.all(
        ids.map((id) => customFetch({ url: `/sessions/${id}/attendance`, method: 'PUT', data: { status, reason } })),
      );
      return ids;
    },
    onSuccess: (ids) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      ids.forEach((id) => qc.invalidateQueries({ queryKey: ['attendances', id] }));
      setSel(new Set());
      setBulk(false);
    },
  });
  const allSelected = todoCount > 0 && sel.size === todoCount;
  function toggleAll() {
    setSel(allSelected ? new Set() : new Set((data?.todo ?? []).map((t) => t.id)));
  }
  function applyBulk(status: 'yes' | 'no' | 'undecided') {
    if (sel.size === 0 || bulkApply.isPending) return;
    if (status === 'no') {
      const reason = prompt('불참 사유 (선택한 연습에 함께 적용돼요)');
      if (!reason || !reason.trim()) return;
      bulkApply.mutate({ status, reason: reason.trim() });
    } else {
      bulkApply.mutate({ status });
    }
  }

  function toggle() {
    setOpen((v) => {
      const next = !v;
      // 열면서 미읽음 댓글·답글이 있으면 읽음 처리(배지 제거)
      if (next && unreadCount > 0 && !markRead.isPending) markRead.mutate();
      return next;
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="알림"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-soft"
      >
        <BellIcon className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="닫기" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-[300px] overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-gray-100">
            <div className="flex border-b border-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('todo');
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ${tab === 'todo' ? 'bg-surface-blue text-primary-700' : 'text-gray-400'}`}
              >
                참여여부 미입력
                {todoCount > 0 && (
                  <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{todoCount}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('social');
                  setBulk(false);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ${tab === 'social' ? 'bg-surface-blue text-primary-700' : 'text-gray-400'}`}
              >
                알림
                {unreadCount > 0 && (
                  <span className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{unreadCount}</span>
                )}
              </button>
            </div>

            <div className="max-h-[60dvh] overflow-y-auto p-2">
              {tab === 'todo' &&
                (todoCount === 0 ? (
                  <p className="py-8 text-center text-[13px] text-gray-400">참여여부 입력할 연습이 없어요</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1 pb-1">
                      {bulk ? (
                        <button type="button" onClick={toggleAll} className="text-[11.5px] font-bold text-primary-600">
                          {allSelected ? '전체 해제' : '전체 선택'}
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400">미입력 {todoCount}개</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setBulk((v) => !v);
                          setSel(new Set());
                        }}
                        className="text-[11.5px] font-bold text-primary-600"
                      >
                        {bulk ? '취소' : '한번에 입력하기'}
                      </button>
                    </div>
                    {data!.todo.map((t) =>
                      bulk ? (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleSel(t.id)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-gray-50"
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${sel.has(t.id) ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'}`}
                          >
                            {sel.has(t.id) && <span className="text-[10px]">✓</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-[#11161F]">{t.title ?? t.room}</span>
                            <span className="block text-[11px] text-gray-500">
                              {dlabel(t.date)} · {hhmm(t.startTime)}~{hhmm(t.endTime)}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <Link
                          key={t.id}
                          href={`/day/${t.date}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-[13px]">🙋</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-[#11161F]">{t.title ?? t.room} 참여 입력</span>
                            <span className="block text-[11px] text-gray-500">
                              {dlabel(t.date)} · {hhmm(t.startTime)}~{hhmm(t.endTime)}
                            </span>
                          </span>
                        </Link>
                      ),
                    )}
                    {bulk && (
                      <div className="sticky bottom-0 mt-1 flex items-center gap-1.5 border-t border-gray-100 bg-white px-1 pt-2">
                        <span className="shrink-0 text-[11px] font-bold text-gray-500">{sel.size}개</span>
                        {(
                          [
                            ['yes', '참여'],
                            ['no', '불참'],
                          ] as const
                        ).map(([st, label]) => (
                          <button
                            key={st}
                            type="button"
                            disabled={sel.size === 0 || bulkApply.isPending}
                            onClick={() => applyBulk(st)}
                            className="flex-1 rounded-lg bg-primary-500 py-2 text-[12px] font-bold text-white disabled:opacity-40"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ))}

              {tab === 'social' &&
                ((data?.social.length ?? 0) === 0 ? (
                  <p className="py-8 text-center text-[13px] text-gray-400">새 댓글·답글 알림이 없어요</p>
                ) : (
                  data!.social.map((s) => (
                    <Link
                      key={s.id}
                      href={s.date ? `/day/${s.date}` : '#'}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-blue text-[13px]">💬</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-[#11161F]">
                          <b>{s.actor}</b>님이 {s.kind === 'comment' ? '내 글에 댓글' : '내 댓글에 답글'}을 남겼어요
                        </span>
                        <span className="block truncate text-[11px] text-gray-500">{s.content}</span>
                      </span>
                    </Link>
                  ))
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
