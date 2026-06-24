'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { HeartIcon, MessageIcon, TrashIcon } from '@/components/icons';
import {
  getGetGuestbookQueryKey,
  useGetGuestbook,
  usePostGuestbook,
  usePostGuestbookIdLike,
} from '@/lib/api/generated/guestbook/guestbook';
import { useGetMembers } from '@/lib/api/generated/members/members';
import type { GuestbookPost } from '@/lib/api/generated/model';
import { customFetch } from '@/lib/api/http';
import { useSubmitGuard } from '@/lib/submit-guard';
import { initial } from '@/lib/avatar';

function rel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function GuestbookView({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const guard = useSubmitGuard();
  const invalidate = () => qc.invalidateQueries({ queryKey: getGetGuestbookQueryKey() });
  const del = useMutation({
    mutationFn: (id: string) => customFetch({ url: `/guestbook/${id}`, method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const { data: posts } = useGetGuestbook();
  const { data: members } = useGetMembers();
  const memberById = new Map((members ?? []).filter((m) => m.status === 'approved').map((m) => [m.id, m]));

  const [text, setText] = useState('');
  const post = usePostGuestbook({
    mutation: {
      onSuccess: () => {
        invalidate();
        setText('');
      },
    },
  });
  const gbKey = getGetGuestbookQueryKey();
  const like = usePostGuestbookIdLike({
    mutation: {
      // 낙관적 업데이트: 누르는 즉시 반영
      onMutate: async (vars) => {
        await qc.cancelQueries({ queryKey: gbKey });
        const prev = qc.getQueryData<GuestbookPost[]>(gbKey);
        qc.setQueryData<GuestbookPost[]>(gbKey, (old) =>
          old?.map((p) =>
            p.id === vars.id
              ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
              : p,
          ),
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(gbKey, ctx.prev);
      },
      onSettled: invalidate,
    },
  });

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[400px] space-y-3 bg-appbg px-5 pb-28 pt-6">
        <header className="flex items-center gap-3">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-surface-blue text-primary-500">
            <MessageIcon className="h-[19px] w-[19px]" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#11161F]">방명록</h1>
            <p className="text-xs font-medium text-gray-500">동아리 응원·피드백 게시판</p>
          </div>
        </header>

        <div className="flex items-center gap-3 rounded-2xl bg-surface-blue px-4 py-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-500">
            <MessageIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-primary-700">자유롭게 한마디 남겨주세요</p>
            <p className="text-[11.5px] font-medium text-[#4a6aa0]">응원도 좋고, 피드백도 받습니다!</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white py-2 pl-4 pr-2 shadow-soft">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="방명록 남기기…"
            className="flex-1 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => text.trim() && guard(post.mutate, { data: { content: text.trim() } })}
            disabled={!text.trim() || post.isPending}
            className="rounded-full bg-primary-500 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>

        {(posts ?? []).filter((p: GuestbookPost) => memberById.has(p.authorId)).map((p: GuestbookPost) => {
          const a = memberById.get(p.authorId);
          return (
            <article key={p.id} className="rounded-[18px] bg-white p-4 shadow-soft">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: a?.color ?? '#999', boxShadow: a?.isSenior ? 'inset 0 0 0 2px #E0A400' : undefined }}
                >
                  {initial(a?.name)}
                </span>
                <div className="flex flex-1 items-center gap-1.5">
                  <p className="text-sm font-bold text-[#11161F]">{a?.name ?? '알 수 없음'}</p>
                  {a?.isSenior && (
                    <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[9.5px] font-bold text-[#8a6a00]">선배</span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">{rel(p.createdAt)}</span>
                {p.authorId === meId && (
                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => {
                      if (confirm('이 방명록을 삭제할까요?')) del.mutate(p.id);
                    }}
                    className="text-gray-300 hover:text-danger"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#384150]">{p.content}</p>
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => like.mutate({ id: p.id })}
                  className={`flex items-center gap-1.5 text-xs font-bold ${p.likedByMe ? 'text-[#F2555A]' : 'text-gray-400'}`}
                >
                  <HeartIcon className="h-4 w-4" fill={p.likedByMe ? 'currentColor' : 'none'} /> 좋아요 {p.likeCount}
                </button>
                {p.likers.length > 0 && (
                  <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-gray-400">
                    <HeartIcon className="mt-[1px] h-3 w-3 shrink-0 text-[#F2555A]" fill="currentColor" />
                    <span>{p.likers.join(', ')}</span>
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </main>
    </>
  );
}
