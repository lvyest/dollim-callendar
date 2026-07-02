'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { KebabIcon, StarIcon, TrashIcon } from '@/components/icons';
import { getGetEventsQueryKey, useGetEvents, usePostEvents } from '@/lib/api/generated/events/events';
import { useGetMembers } from '@/lib/api/generated/members/members';
import type { Event, EventType } from '@/lib/api/generated/model';
import { customFetch } from '@/lib/api/http';
import { useSubmitGuard } from '@/lib/submit-guard';
import { initial } from '@/lib/avatar';

const pad = (n: number) => String(n).padStart(2, '0');

const CAT: Record<EventType, { label: string; emoji: string; tile: string; tag: string }> = {
  performance: { label: '외부공연', emoji: '🤹', tile: 'bg-accent-50', tag: 'bg-accent-100 text-[#7a5a00]' },
  training: { label: '전수', emoji: '🏕️', tile: 'bg-surface-blue', tag: 'bg-surface-blue text-primary-700' },
  hapgut: { label: '청벽일정', emoji: '🥁', tile: 'bg-surface-mint', tag: 'bg-surface-mint text-[#1a7a4f]' },
  etc: { label: '기타', emoji: '⭐', tile: 'bg-gray-100', tag: 'bg-gray-100 text-gray-600' },
};

function fmt(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}.${d.getDate()}(${wd})`;
}

export function EventsView({ isAdmin, meId }: { isAdmin: boolean; meId: string }) {
  const qc = useQueryClient();
  const guard = useSubmitGuard();
  const now = new Date();
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthStart = `${month}-01`;
  const monthLast = `${month}-${pad(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`;
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const { data: events } = useGetEvents({ month });
  const { data: members } = useGetMembers();
  const memberById = new Map((members ?? []).filter((m) => m.status === 'approved').map((m) => [m.id, m]));
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetEventsQueryKey({ month }) });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [type, setType] = useState<EventType>('performance');
  const [title, setTitle] = useState('');
  const [dateStart, setDateStart] = useState(`${month}-01`);
  const [dateEnd, setDateEnd] = useState('');
  const [desc, setDesc] = useState('');
  const [monthErrOpen, setMonthErrOpen] = useState(false);

  function resetForm() {
    setOpen(false);
    setEditingId(null);
    setTitle('');
    setDesc('');
    setDateEnd('');
  }

  const post = usePostEvents({ mutation: { onSuccess: () => { invalidate(); resetForm(); } } });
  const patch = useMutation({
    mutationFn: (vars: { id: string; data: Record<string, unknown> }) =>
      customFetch({ url: `/events/${vars.id}`, method: 'PATCH', data: vars.data }),
    onSuccess: () => { invalidate(); resetForm(); },
  });
  const del = useMutation({
    mutationFn: (id: string) => customFetch({ url: `/events/${id}`, method: 'DELETE' }),
    onSuccess: invalidate,
  });

  function openAdd() {
    setEditingId(null);
    setType('performance');
    setTitle('');
    setDateStart(`${month}-01`);
    setDateEnd('');
    setDesc('');
    setOpen(true);
  }
  function openEdit(e: Event) {
    setEditingId(e.id);
    setType(e.type);
    setTitle(e.title);
    setDateStart(e.dateStart);
    setDateEnd(e.dateEnd ?? '');
    setDesc(e.description ?? '');
    setOpen(true);
    setMenuOpen(null);
  }

  function submit() {
    if (!title.trim() || !dateStart) return;
    const outOfMonth = dateStart < monthStart || dateStart > monthLast || (dateEnd && (dateEnd < monthStart || dateEnd > monthLast));
    if (outOfMonth) {
      setMonthErrOpen(true);
      return;
    }
    const base = {
      type,
      title: title.trim(),
      dateStart,
      dateEnd: dateEnd || undefined,
      description: desc.trim() || undefined,
    };
    // 수정 시에는 memberIds 를 보내지 않아 기존 참여자를 보존한다.
    if (editingId) guard(patch.mutate, { id: editingId, data: base });
    else guard(post.mutate, { data: { ...base, memberIds: [] } });
  }

  return (
    <>
      {monthErrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setMonthErrOpen(false)}
        >
          <div
            className="w-full max-w-[320px] rounded-[20px] bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-3xl">📅</p>
            <p className="text-[15px] font-bold text-[#11161F]">이번 달 일정만 등록할 수 있어요</p>
            <p className="mt-1.5 text-[12.5px] font-medium text-gray-500">{monthLabel} 안의 날짜로 선택해주세요</p>
            <button
              type="button"
              onClick={() => setMonthErrOpen(false)}
              className="mt-5 w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white"
            >
              확인
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto min-h-dvh max-w-[400px] space-y-3 bg-appbg px-5 pb-28 pt-6">
        <header className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-accent-50 text-senior">
            <StarIcon className="h-[19px] w-[19px]" />
          </span>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#11161F]">특이일정</h1>
            <p className="text-xs font-medium text-gray-500">
              {now.getFullYear()}년 {now.getMonth() + 1}월 · {(events ?? []).length}건
            </p>
          </div>
        </header>

        {(events ?? []).length === 0 && !open && (
          <p className="rounded-2xl bg-white p-5 text-center text-sm text-gray-400 shadow-soft">
            이번 달에 등록된 특이일정이 없어요
          </p>
        )}

        {(events ?? []).map((e: Event) => {
          const c = CAT[e.type];
          const canManage = isAdmin || e.createdBy === meId;
          return (
            <article key={e.id} className="relative flex gap-3 rounded-[18px] bg-white p-3.5 shadow-soft">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-xl ${c.tile}`}>
                {c.emoji}
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setMenuOpen(menuOpen === e.id ? null : e.id)}
                  aria-label="일정 관리"
                  className="absolute right-3 top-3.5 text-gray-300"
                >
                  <KebabIcon className="h-4 w-4" />
                </button>
              )}
              {menuOpen === e.id && (
                <>
                  <button type="button" aria-label="닫기" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(null)} />
                  <div className="absolute right-3 top-10 z-20 w-28 overflow-hidden rounded-xl bg-white py-1 shadow-float ring-1 ring-gray-100">
                    <button type="button" onClick={() => openEdit(e)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-medium text-[#11161F] hover:bg-gray-50">
                      ✏️ 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(null);
                        if (confirm('이 특이일정을 삭제할까요?')) del.mutate(e.id);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-medium text-danger hover:bg-gray-50"
                    >
                      <TrashIcon className="h-4 w-4" /> 삭제
                    </button>
                  </div>
                </>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${c.tag}`}>{c.label}</span>
                  <span className="text-[11.5px] font-bold text-gray-500">
                    {fmt(e.dateStart)}
                    {e.dateEnd ? ` ~ ${fmt(e.dateEnd)}` : ''}
                  </span>
                </div>
                <p className="mt-1.5 text-[15px] font-bold text-[#11161F]">{e.title}</p>
                {e.description && <p className="mt-0.5 text-[12.5px] leading-snug text-gray-500">{e.description}</p>}
                {e.memberIds.length > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {e.memberIds.slice(0, 4).map((id) => {
                        const m = memberById.get(id);
                        if (!m) return null;
                        return (
                          <span
                            key={id}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
                            style={{ backgroundColor: m.color }}
                          >
                            {initial(m.name)}
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-bold text-primary-600">{e.memberIds.length}명 참여</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {open ? (
          <section className="space-y-2 rounded-[18px] bg-white p-4 shadow-soft">
            <p className="text-[13px] font-bold text-gray-600">{editingId ? '특이일정 수정' : '특이일정 추가'}</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CAT) as EventType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${type === t ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {CAT[t].label}
                </button>
              ))}
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400" />
            <div className="flex gap-2">
              <input type="date" min={monthStart} max={monthLast} value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none" />
              <input type="date" min={monthStart} max={monthLast} value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none" />
            </div>
            <p className="px-1 text-[11px] font-medium text-gray-400">{monthLabel} 일정만 등록할 수 있어요</p>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="설명 (선택)" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400" />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={resetForm} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-500">
                취소
              </button>
              <button type="button" onClick={submit} disabled={!title.trim() || post.isPending || patch.isPending} className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {editingId ? '저장' : '추가'}
              </button>
            </div>
          </section>
        ) : (
          <button type="button" onClick={openAdd} className="w-full rounded-2xl bg-primary-500 py-3.5 text-[15px] font-bold text-white shadow-soft">
            + 특이일정 추가
          </button>
        )}
      </main>
    </>
  );
}
