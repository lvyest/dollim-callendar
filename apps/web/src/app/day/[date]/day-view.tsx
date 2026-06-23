'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react';

import { HeartIcon, MessageIcon, PencilIcon, TrashIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { useSubmitGuard } from '@/lib/submit-guard';
import { usePutSessionsIdAttendance } from '@/lib/api/generated/attendance/attendance';
import { useGetMembers } from '@/lib/api/generated/members/members';
import {
  getGetNotesIdCommentsQueryKey,
  getGetSessionsIdNotesQueryKey,
  useGetNotesIdComments,
  useGetSessionsIdNotes,
  usePostNotesIdComments,
  usePostNotesIdLike,
  usePostSessionsIdNotes,
} from '@/lib/api/generated/notes/notes';
import type { Attendance, AttendanceStatus, Comment, Member, Note } from '@/lib/api/generated/model';
import { useGetSessions } from '@/lib/api/generated/sessions/sessions';
import { customFetch } from '@/lib/api/http';
import { initial } from '@/lib/avatar';

const STATUS: Record<AttendanceStatus, { label: string; chip: string }> = {
  yes: { label: '참여', chip: 'bg-success-soft text-success' },
  partial: { label: '부분참여', chip: 'bg-partial-soft text-[#8a6a00]' },
  no: { label: '불참', chip: 'bg-danger-soft text-danger' },
  undecided: { label: '미정', chip: 'bg-gray-100 text-gray-500' },
};
const STEPS: AttendanceStatus[] = ['yes', 'partial', 'no', 'undecided'];

function fmtDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})`;
}

function Avatar({ member, size = 32 }: { member: Pick<Member, 'name' | 'color' | 'isSenior'>; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        backgroundColor: member.color,
        boxShadow: member.isSenior ? 'inset 0 0 0 2px #E0A400' : undefined,
      }}
    >
      {initial(member.name)}
    </span>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-[18px] bg-white p-4 shadow-soft">{children}</section>;
}

export function DayView({
  date,
  meId,
  meName,
  meColor,
  isAdmin,
}: {
  date: string;
  meId: string;
  meName: string;
  meColor: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const month = date.slice(0, 7);
  const { data: sessions } = useGetSessions({ month });
  const daySessions = useMemo(() => (sessions ?? []).filter((s) => s.date === date), [sessions, date]);
  const [selId, setSelId] = useState<string | null>(null);
  const selected = daySessions.find((s) => s.id === selId) ?? daySessions[0];

  const { data: members } = useGetMembers();
  // 승인된 멤버만 — 내보낸/미승인 멤버는 표시에서 제외
  const memberById = useMemo(
    () => new Map((members ?? []).filter((m) => m.status === 'approved').map((m) => [m.id, m])),
    [members],
  );

  const { data: attendances } = useQuery({
    queryKey: ['attendances', selected?.id],
    queryFn: () => customFetch<Attendance[]>({ url: `/sessions/${selected!.id}/attendances`, method: 'GET' }),
    enabled: !!selected,
  });

  const putAtt = usePutSessionsIdAttendance({
    mutation: {
      // 낙관적 업데이트: 내 참여 행을 즉시 반영
      onMutate: async (vars) => {
        const key = ['attendances', selected?.id];
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData<Attendance[]>(key);
        qc.setQueryData<Attendance[]>(key, (old) => {
          const list = old ? [...old] : [];
          const idx = list.findIndex((a) => a.memberId === meId);
          const row = {
            ...(idx >= 0 ? list[idx] : {}),
            sessionId: selected!.id,
            memberId: meId,
            status: vars.data.status,
            reason: vars.data.reason ?? null,
          } as Attendance;
          if (idx >= 0) list[idx] = row;
          else list.push(row);
          return list;
        });
        return { prev, key };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: ['attendances', selected?.id] });
        qc.invalidateQueries({ queryKey: ['notifications'] });
      },
    },
  });

  const mine = (attendances ?? []).find((a) => a.memberId === meId);
  const [status, setStatus] = useState<AttendanceStatus>('undecided');
  const [reason, setReason] = useState('');
  useEffect(() => {
    setStatus(mine?.status ?? 'undecided');
    setReason(mine?.reason ?? '');
  }, [mine?.status, mine?.reason, selected?.id]);

  const needReason = status === 'partial' || status === 'no';
  const canSave = !!selected && (!needReason || reason.trim().length > 0);

  function saveAttendance() {
    if (!selected || !canSave) return;
    putAtt.mutate({ id: selected.id, data: { status, reason: needReason ? reason.trim() : undefined } });
  }

  const approved = (members ?? []).filter((m) => m.status === 'approved');
  const attStatus = new Map((attendances ?? []).map((a) => [a.memberId, a.status]));
  const attReason = new Map((attendances ?? []).map((a) => [a.memberId, a.reason]));
  const st = (id: string): AttendanceStatus => attStatus.get(id) ?? 'undecided';
  const nonSenior = approved.filter((m) => !m.isSenior);
  const seniors = approved.filter((m) => m.isSenior);
  const cnt = {
    yes: nonSenior.filter((m) => st(m.id) === 'yes').length,
    partial: nonSenior.filter((m) => st(m.id) === 'partial').length,
    no: nonSenior.filter((m) => st(m.id) === 'no').length,
  };
  const seniorJoin = seniors.filter((m) => st(m.id) === 'yes' || st(m.id) === 'partial').length;

  return (
    <main className="mx-auto min-h-dvh max-w-[400px] space-y-3 bg-appbg px-5 pb-12 pt-6">
      <header className="flex items-center gap-2">
        <Link href="/calendar" className="text-2xl text-[#11161F]">
          ‹
        </Link>
        <h1 className="text-xl font-bold text-[#11161F]">{fmtDate(date)}</h1>
      </header>

      {daySessions.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-gray-400">이 날은 등록된 연습이 없어요</p>
        </Card>
      ) : (
        <>
          {/* 세션 선택 */}
          <div className="space-y-2">
            <p className="px-1 text-[13px] font-bold text-gray-600">오늘의 연습 · {daySessions.length}개</p>
            {daySessions.map((s) => {
              const active = s.id === selected?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelId(s.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left shadow-soft transition ${active ? 'border-primary-500 bg-surface-blue' : 'border-transparent bg-white'}`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-300'}`}
                  >
                    {active && <span className="text-[10px]">✓</span>}
                  </span>
                  <div className="flex-1">
                    <p className="text-[14.5px] font-bold text-[#11161F]">{s.title ?? s.room}</p>
                    <p className="text-xs font-medium text-gray-500">
                      {s.startTime.slice(0, 5)}~{s.endTime.slice(0, 5)} · {s.room}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 내 참여 */}
          <Card>
            <p className="mb-3 text-sm font-bold text-[#11161F]">내 참여 여부</p>
            <div className="flex rounded-[13px] bg-gray-50 p-1">
              {STEPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 rounded-[10px] py-2.5 text-[13px] ${status === s ? 'bg-white font-bold text-primary-600 shadow-soft' : 'font-medium text-gray-500'}`}
                >
                  {STATUS[s].label}
                </button>
              ))}
            </div>
            {needReason && (
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={status === 'partial' ? '언제/얼마나 참여하나요?' : '불참 사유'}
                className="mt-3 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-primary-400"
              />
            )}
            <button
              type="button"
              onClick={saveAttendance}
              disabled={!canSave || putAtt.isPending}
              className="mt-3 w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {putAtt.isPending ? '저장 중…' : '참여 저장'}
            </button>
          </Card>

          {/* 멤버 현황 */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-[#11161F]">멤버 참여 현황</p>
              <p className="text-[11px] font-bold text-gray-500">
                참여 {cnt.yes} · 부분 {cnt.partial} · 불참 {cnt.no}
                {seniors.length > 0 && <span className="text-senior"> · 선배 {seniorJoin}명</span>}
              </p>
            </div>
            <ul className="divide-y divide-gray-100">
              {[...nonSenior, ...seniors].map((m) => {
                const s = st(m.id);
                const r = attReason.get(m.id);
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <Avatar member={m} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#11161F]">{m.name}</p>
                      {r && <p className="truncate text-[11px] text-gray-400">“{r}”</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS[s].chip}`}>
                      {STATUS[s].label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* 배운 것 */}
          {selected && (
            <NotesSection
              sessionId={selected.id}
              memberById={memberById}
              me={{ id: meId, name: meName, color: meColor }}
              isAdmin={isAdmin}
            />
          )}
        </>
      )}
    </main>
  );
}

type UploadedMedia = { url: string; storagePath: string; sizeBytes: number };

function NotesSection({
  sessionId,
  memberById,
  me,
  isAdmin,
}: {
  sessionId: string;
  memberById: Map<string, Member>;
  me: { id: string; name: string; color: string };
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const guard = useSubmitGuard();
  const { data: notes } = useGetSessionsIdNotes(sessionId);
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedMedia | null>(null);
  const post = usePostSessionsIdNotes({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSessionsIdNotesQueryKey(sessionId) });
        setContent('');
        setLink('');
        setUploaded(null);
      },
    },
  });

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'mp4';
      const path = `${sessionId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('note-media').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('note-media').getPublicUrl(path);
      setUploaded({ url: data.publicUrl, storagePath: path, sizeBytes: file.size });
    } catch (err) {
      alert('영상 업로드 실패: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!content.trim()) return;
    const media: { kind: 'upload' | 'link'; url: string; storagePath?: string; sizeBytes?: number }[] = [];
    if (uploaded) media.push({ kind: 'upload', url: uploaded.url, storagePath: uploaded.storagePath, sizeBytes: uploaded.sizeBytes });
    if (link.trim()) media.push({ kind: 'link', url: link.trim() });
    guard(post.mutate, { id: sessionId, data: { sessionId, content: content.trim(), media } });
  }

  return (
    <>
      <p className="flex items-center gap-1.5 px-1 pt-1 text-base font-bold text-[#11161F]">
        <PencilIcon className="h-[18px] w-[18px] text-primary-500" /> 오늘 배운 것
      </p>
      <p className="-mt-2 px-1 text-xs font-medium text-gray-500">각자 기록하고 서로 볼 수 있어요</p>
      {(notes ?? [])
        .filter((n) => memberById.has(n.authorId))
        .map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            memberById={memberById}
            sessionId={sessionId}
            meId={me.id}
            isAdmin={isAdmin}
          />
        ))}
      <Card>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="오늘 배운 것을 기록해보세요"
          rows={2}
          className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-primary-400"
        />

        {uploaded ? (
          <div className="mt-2 overflow-hidden rounded-xl bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={uploaded.url} controls className="max-h-56 w-full" />
          </div>
        ) : null}

        <div className="mt-2 flex gap-2">
          <label className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-xs font-bold ${uploading ? 'text-gray-300' : 'text-primary-600'}`}>
            {uploading ? '업로드 중…' : uploaded ? '🎥 영상 교체' : '🎥 영상 올리기'}
            <input type="file" accept="video/*" onChange={onPickFile} disabled={uploading} className="hidden" />
          </label>
          {uploaded && (
            <button type="button" onClick={() => setUploaded(null)} className="rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-400">
              제거
            </button>
          )}
        </div>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="또는 영상 링크 (유튜브 등)"
          className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:border-primary-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!content.trim() || post.isPending || uploading}
          className="mt-2 w-full rounded-xl bg-primary-500 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          내 기록 작성
        </button>
      </Card>
    </>
  );
}

function NoteCard({
  note,
  memberById,
  sessionId,
  meId,
  isAdmin,
}: {
  note: Note;
  memberById: Map<string, Member>;
  sessionId: string;
  meId: string;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const guard = useSubmitGuard();
  const author = memberById.get(note.authorId);
  const notesKey = getGetSessionsIdNotesQueryKey(sessionId);
  const like = usePostNotesIdLike({
    mutation: {
      // 낙관적 업데이트: 누르는 즉시 하트/숫자 반영
      onMutate: async () => {
        await qc.cancelQueries({ queryKey: notesKey });
        const prev = qc.getQueryData<Note[]>(notesKey);
        qc.setQueryData<Note[]>(notesKey, (old) =>
          old?.map((n) =>
            n.id === note.id
              ? { ...n, likedByMe: !n.likedByMe, likeCount: n.likeCount + (n.likedByMe ? -1 : 1) }
              : n,
          ),
        );
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(notesKey, ctx.prev);
      },
      onSettled: () => qc.invalidateQueries({ queryKey: notesKey }),
    },
  });
  const { data: comments } = useGetNotesIdComments(note.id);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const invalidateComments = () => {
    qc.invalidateQueries({ queryKey: getGetNotesIdCommentsQueryKey(note.id) });
    qc.invalidateQueries({ queryKey: getGetSessionsIdNotesQueryKey(sessionId) });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  const commentsKey = getGetNotesIdCommentsQueryKey(note.id);
  const postComment = usePostNotesIdComments({
    mutation: {
      // 낙관적 업데이트: 입력 즉시 댓글이 보이게
      onMutate: async (vars) => {
        await qc.cancelQueries({ queryKey: commentsKey });
        const prev = qc.getQueryData<Comment[]>(commentsKey);
        const temp = {
          id: `temp-${Math.random().toString(36).slice(2)}`,
          noteId: note.id,
          authorId: meId,
          parentId: vars.data.parentId ?? null,
          content: vars.data.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Comment;
        qc.setQueryData<Comment[]>(commentsKey, (old) => [...(old ?? []), temp]);
        setText('');
        setReplyTo(null);
        return { prev };
      },
      onError: (_e, _v, ctx) => {
        if (ctx?.prev) qc.setQueryData(commentsKey, ctx.prev);
      },
      onSettled: () => invalidateComments(),
    },
  });
  const roots = (comments ?? []).filter((c) => !c.parentId && memberById.has(c.authorId));
  const repliesOf = (id: string) => (comments ?? []).filter((c) => c.parentId === id && memberById.has(c.authorId));

  function submitComment() {
    if (!text.trim()) return;
    guard(postComment.mutate, { id: note.id, data: { content: text.trim(), parentId: replyTo?.id } });
  }

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        {author && <Avatar member={author} size={30} />}
        <div className="flex-1">
          <p className="text-[13.5px] font-bold text-[#11161F]">{author?.name ?? '알 수 없음'}</p>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#384150]">{note.content}</p>
      {note.media.map((m) => (
        <MediaPlayer key={m.id} media={m} />
      ))}
      <div className="mt-4 border-t border-gray-100 pt-3.5">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => like.mutate({ id: note.id })}
            className={`flex items-center gap-1.5 text-[13.5px] font-bold ${note.likedByMe ? 'text-[#F2555A]' : 'text-gray-500'}`}
          >
            <HeartIcon className="h-[17px] w-[17px]" fill={note.likedByMe ? 'currentColor' : 'none'} /> 좋아요 {note.likeCount}
          </button>
          <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-gray-500">
            <MessageIcon className="h-[16px] w-[16px]" /> 댓글 {note.commentCount}
          </span>
        </div>
        {note.likers.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-snug text-gray-400">
            <HeartIcon className="mt-[1px] h-3 w-3 shrink-0 text-[#F2555A]" fill="currentColor" />
            <span>{note.likers.join(', ')}</span>
          </p>
        )}
      </div>

      {roots.length > 0 && (
        <ul className="mt-3.5 space-y-3.5">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentRow
                comment={c}
                author={memberById.get(c.authorId)}
                canManage={isAdmin || c.authorId === meId}
                onReply={() => setReplyTo({ id: c.id, name: memberById.get(c.authorId)?.name ?? '' })}
                onChanged={invalidateComments}
              />
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-8 mt-2.5">
                  <CommentRow
                    comment={r}
                    author={memberById.get(r.authorId)}
                    canManage={isAdmin || r.authorId === meId}
                    onChanged={invalidateComments}
                    size={22}
                  />
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {replyTo && (
          <div className="mb-1.5 flex items-center gap-2 px-1 text-[11.5px] font-bold text-primary-600">
            <span>↪ {replyTo.name}님에게 답글</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-gray-400">
              취소
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            placeholder={replyTo ? `${replyTo.name}님에게 답글…` : '댓글 달기…'}
            className="flex-1 rounded-full bg-gray-50 px-4 py-2.5 text-[13px] outline-none focus:bg-gray-100"
          />
          <button
            type="button"
            onClick={submitComment}
            disabled={!text.trim() || postComment.isPending}
            className="rounded-full bg-primary-500 px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>
      </div>
    </Card>
  );
}

function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

function MediaPlayer({ media }: { media: Note['media'][number] }) {
  if (media.kind === 'upload') {
    return (
      <div className="mt-2 overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={media.url} controls className="max-h-72 w-full" />
      </div>
    );
  }
  const yt = youtubeId(media.url);
  if (yt) {
    return (
      <div className="mt-2 aspect-video overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          title="영상"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-bold text-primary-600"
    >
      ▶ 영상 보기 (외부 링크)
    </a>
  );
}

function CommentRow({
  comment,
  author,
  canManage,
  onChanged,
  onReply,
  size = 24,
}: {
  comment: Comment;
  author?: Member;
  canManage: boolean;
  onChanged: () => void;
  onReply?: () => void;
  size?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(comment.content);
  const patch = useMutation({
    mutationFn: () => customFetch({ url: `/comments/${comment.id}`, method: 'PATCH', data: { content: val.trim() } }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const del = useMutation({
    mutationFn: () => customFetch({ url: `/comments/${comment.id}`, method: 'DELETE' }),
    onSuccess: onChanged,
  });

  return (
    <div className="flex items-start gap-2.5">
      {author && <Avatar member={author} size={size} />}
      <div className="flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-primary-400"
            />
            <button
              type="button"
              disabled={!val.trim() || patch.isPending}
              onClick={() => patch.mutate()}
              className="rounded-lg bg-primary-500 px-2.5 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50"
            >
              저장
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-[11.5px] font-bold text-gray-400">
              취소
            </button>
          </div>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-[#384150]">
              <span className="font-bold text-[#11161F]">{author?.name ?? '?'}</span> {comment.content}
            </p>
            <div className="mt-1 flex items-center gap-3 text-[11.5px] font-bold text-gray-400">
              {onReply && (
                <button type="button" onClick={onReply} className="hover:text-primary-500">
                  답글
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setVal(comment.content);
                    setEditing(true);
                  }}
                  className="hover:text-primary-500"
                >
                  수정
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={() => confirm('댓글을 삭제할까요?') && del.mutate()}
                  className="hover:text-danger"
                >
                  삭제
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
