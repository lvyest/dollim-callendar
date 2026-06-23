'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { KebabIcon, PencilIcon, PinIcon, TrashIcon } from '@/components/icons';
import { NotificationBell } from '@/components/NotificationBell';
import { useGetEvents } from '@/lib/api/generated/events/events';
import { useGetMembers } from '@/lib/api/generated/members/members';
import type { Attendance, Event, EventType, Member, PracticeSession } from '@/lib/api/generated/model';
import { getGetSessionsQueryKey, useGetSessions, usePostSessions } from '@/lib/api/generated/sessions/sessions';
import { customFetch } from '@/lib/api/http';
import { useSubmitGuard } from '@/lib/submit-guard';
import { initial } from '@/lib/avatar';

type FixedSlot = {
  id: string;
  yearMonth: string;
  weekday: number;
  room: string;
  startTime: string;
  endTime: string;
};
type SlotDraft = { weekday: number; room: string; startTime: string; endTime: string };

type SessionType = 'outside' | 'variable' | 'hapgut' | 'etc'; 
const SESSION_TYPES: { v: SessionType; label: string }[] = [
  { v: 'variable', label: '추가' },
  { v: 'outside', label: '외부공연' },
  { v: 'hapgut', label: '합굿' },
  { v: 'etc', label: '기타' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];
const hhmm = (t: string) => t.slice(0, 5);

const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ymOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function sundayKey(key: string) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return keyOf(d);
}
function addDaysKey(key: string, n: number) {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}
function toFloat(t: string) {
  const p = t.split(':');
  return Number(p[0]) + Number(p[1] ?? 0) / 60;
}
function dedupeById<T extends { id: string }>(arr: T[]) {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return [...m.values()];
}

const CAT: Record<EventType, { label: string; emoji: string; tile: string }> = {
  performance: { label: '외부공연', emoji: '🤹', tile: 'bg-accent-50' },
  training: { label: '전수', emoji: '🏕️', tile: 'bg-surface-blue' },
  hapgut: { label: '청벽일정', emoji: '🥁', tile: 'bg-surface-mint' },
  etc: { label: '기타', emoji: '⭐', tile: 'bg-gray-100' },
};

export function CalendarView({ isAdmin, meId }: { isAdmin: boolean; meId: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const guard = useSubmitGuard();
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(todayKey);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState(() => sundayKey(todayKey));
  const monthStr = `${cursor.y}-${pad(cursor.m + 1)}`;

  const weekStartDate = new Date(`${weekStart}T00:00:00`);
  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + i));
  const weekEndDate = weekDays[6]!;
  // 주간은 달 경계를 넘을 수 있어 시작/끝 달 둘 다 조회 후 합친다.
  const baseMonth = view === 'week' ? ymOf(weekStartDate) : monthStr;
  const altMonth = view === 'week' ? ymOf(weekEndDate) : monthStr;

  const sA = useGetSessions({ month: baseMonth });
  const sB = useGetSessions({ month: altMonth });
  const eA = useGetEvents({ month: baseMonth });
  const eB = useGetEvents({ month: altMonth });
  const sessions = useMemo(() => dedupeById([...(sA.data ?? []), ...(sB.data ?? [])]), [sA.data, sB.data]);
  const events = useMemo(() => dedupeById([...(eA.data ?? []), ...(eB.data ?? [])]) as Event[], [eA.data, eB.data]);
  // 선배가 참여/부분참여한 연습이 있는 날짜 (금색 테두리 표시용)
  const seniorA = useQuery({
    queryKey: ['senior-days', baseMonth],
    queryFn: () => customFetch<string[]>({ url: '/calendar/senior-days', method: 'GET', params: { month: baseMonth } }),
  });
  const seniorB = useQuery({
    queryKey: ['senior-days', altMonth],
    queryFn: () => customFetch<string[]>({ url: '/calendar/senior-days', method: 'GET', params: { month: altMonth } }),
  });
  const seniorDays = useMemo(() => new Set([...(seniorA.data ?? []), ...(seniorB.data ?? [])]), [seniorA.data, seniorB.data]);
  const invalidateSessions = () => {
    qc.invalidateQueries({ queryKey: getGetSessionsQueryKey({ month: baseMonth }) });
    if (altMonth !== baseMonth) qc.invalidateQueries({ queryKey: getGetSessionsQueryKey({ month: altMonth }) });
  };
  const { data: members } = useGetMembers();
  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    // 승인된 멤버만 — 내보낸/미승인 멤버는 참여 표시에서 제외
    for (const m of members ?? []) if (m.status === 'approved') map.set(m.id, m);
    return map;
  }, [members]);

  // 고정 연습실 슬롯 (월별)
  const slotsKey = ['fixed-slots', baseMonth];
  const { data: slots } = useQuery({
    queryKey: slotsKey,
    queryFn: () => customFetch<FixedSlot[]>({ url: '/fixed-slots', method: 'GET', params: { month: baseMonth } }),
  });
  const slotList = slots ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // 연습 추가 폼 (직접 입력)
  const [room, setRoom] = useState('');
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [stype, setStype] = useState<SessionType>('variable');
  const [stitle, setStitle] = useState('');

  const addSession = usePostSessions({
    mutation: {
      onSuccess: () => {
        invalidateSessions();
        setAddOpen(false);
        setStitle('');
      },
    },
  });

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, PracticeSession[]>();
    for (const s of sessions ?? []) {
      const arr = map.get(s.date);
      if (arr) arr.push(s);
      else map.set(s.date, [s]);
    }
    return map;
  }, [sessions]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of (events ?? []) as Event[]) {
      const start = new Date(`${e.dateStart}T00:00:00`);
      const end = new Date(`${e.dateEnd ?? e.dateStart}T00:00:00`);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const arr = map.get(k);
        if (arr) arr.push(e);
        else map.set(k, [e]);
      }
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const key = (d: number) => `${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`;
  const selDate = new Date(`${selected}T00:00:00`);
  const selLabel = `${selDate.getMonth() + 1}월 ${selDate.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][selDate.getDay()]})`;
  const selSessions = sessionsByDate.get(selected) ?? [];
  const selEvents = eventsByDate.get(selected) ?? [];
  // 선택일 요일에 고정 슬롯이 있으면 추가 폼을 그 값으로 미리 채운다
  const selDow = (selDate.getDay() + 6) % 7;
  const matchSlot = slotList.find((s) => s.weekday === selDow);

  function openAdd() {
    if (matchSlot) {
      setRoom(matchSlot.room);
      setStart(hhmm(matchSlot.startTime));
      setEnd(hhmm(matchSlot.endTime));
    } else {
      setRoom('');
      setStart('19:00');
      setEnd('21:00');
    }
    setStype('variable');
    setStitle('');
    setAddOpen(true);
  }

  function shift(delta: number) {
    setAddOpen(false);
    if (view === 'week') setWeekStart((w) => addDaysKey(w, delta * 7));
    else
      setCursor((c) => {
        const nm = c.m + delta;
        return { y: c.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 };
      });
  }

  function switchView(v: 'month' | 'week') {
    if (v === view) return;
    if (v === 'week') setWeekStart(sundayKey(selected));
    else setCursor({ y: selDate.getFullYear(), m: selDate.getMonth() });
    setAddOpen(false);
    setView(v);
  }

  function goToday() {
    setSelected(todayKey);
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    setWeekStart(sundayKey(todayKey));
  }

  const viewingToday =
    view === 'week'
      ? weekStart === sundayKey(todayKey)
      : cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-[400px] bg-appbg px-5 pb-28 pt-6">
        <div className="mb-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              qc.invalidateQueries();
              router.refresh();
            }}
            className="flex items-center gap-2.5"
            aria-label="새로고침"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="h-14 w-14" />
            <span className="font-display text-[30px] font-bold text-primary-600">돌림력</span>
          </button>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <div className="flex rounded-full bg-gray-100 p-0.5 text-[12px] font-bold">
            <button
              type="button"
              onClick={() => switchView('week')}
              className={`rounded-full px-3 py-1 ${view === 'week' ? 'bg-white text-primary-700 shadow-soft' : 'text-gray-400'}`}
            >
              주간
            </button>
            <button
              type="button"
              onClick={() => switchView('month')}
              className={`rounded-full px-3 py-1 ${view === 'month' ? 'bg-white text-primary-700 shadow-soft' : 'text-gray-400'}`}
            >
              월간
            </button>
          </div>
          {!viewingToday && (
            <button
              type="button"
              onClick={goToday}
              className="ml-auto rounded-full bg-surface-blue px-3 py-1.5 text-xs font-bold text-primary-700"
            >
              오늘로
            </button>
          )}
        </div>

        <div className="mb-3 flex items-center justify-center gap-3">
          <button type="button" onClick={() => shift(-1)} className="text-xl text-gray-400">
            ‹
          </button>
          <span className="text-[20px] font-bold text-[#11161F]">
            {view === 'week'
              ? `${weekStartDate.getMonth() + 1}.${weekStartDate.getDate()} – ${weekEndDate.getMonth() + 1}.${weekEndDate.getDate()}`
              : `${cursor.y}년 ${cursor.m + 1}월`}
          </span>
          <button type="button" onClick={() => shift(1)} className="text-xl text-gray-400">
            ›
          </button>
        </div>

        {/* 고정 연습실 (이번 달 기준) — 월간 뷰에서만 */}
        {view === 'month' && (
        <div className="mb-3 rounded-[16px] bg-white p-3.5 shadow-soft">
          <div className="flex items-center">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#11161F]">
              <PinIcon className="h-[15px] w-[15px] text-primary-500" /> 고정 연습실
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
              이번 달 기준
              {isAdmin && (
                <button type="button" onClick={() => setEditOpen(true)} aria-label="고정 연습실 편집" className="text-gray-400">
                  <PencilIcon className="h-[14px] w-[14px]" />
                </button>
              )}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {slotList.length ? (
              slotList.map((s) => (
                <span key={s.id} className="rounded-lg bg-surface-blue px-2.5 py-1.5 text-[11px] font-medium text-primary-700">
                  {WEEKDAYS[s.weekday]} {s.room} {hhmm(s.startTime)}~{hhmm(s.endTime)}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-gray-400">
                설정된 고정 연습실이 없어요{isAdmin ? ' · 연필을 눌러 설정하세요' : ''}
              </span>
            )}
          </div>
        </div>
        )}

        {view === 'month' ? (
        <div className="rounded-[22px] bg-white p-3 shadow-card">
          <div className="mb-1.5 flex">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`flex-1 text-center text-[11.5px] font-bold ${i === 6 ? 'text-danger' : i === 5 ? 'text-primary-500' : 'text-gray-400'}`}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              if (d === null) return <div key={idx} className="h-[52px]" />;
              const k = key(d);
              const isToday = k === todayKey;
              const isSel = k === selected;
              const daySessions = sessionsByDate.get(k) ?? [];
              const hasPractice = daySessions.length > 0;
              const hasEvent = eventsByDate.has(k);
              const hasSenior = seniorDays.has(k);
              const dow = idx % 7;
              const numTone = isToday
                ? 'font-bold text-white'
                : hasPractice
                  ? 'font-bold text-primary-700'
                  : dow === 6
                    ? 'text-danger'
                    : dow === 5
                      ? 'text-primary-500'
                      : 'font-medium text-[#11161F]';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelected(k)}
                  className={`flex h-[52px] flex-col items-center justify-center gap-1 rounded-[13px] ${
                    isToday ? 'bg-primary-500' : hasPractice ? 'bg-surface-blue' : ''
                  } ${hasSenior ? 'ring-2 ring-[#E0A400]' : ''} ${isSel ? 'outline outline-2 -outline-offset-[3px] outline-primary-400' : ''}`}
                >
                  <span className={`text-[13.5px] ${numTone}`}>{d}</span>
                  <span className="flex h-[3px] items-center gap-0.5">
                    {hasPractice && (
                      <span className={`h-[3px] w-[3px] rounded-full ${isToday ? 'bg-white' : 'bg-primary-500'}`} />
                    )}
                    {hasEvent && <span className="h-[3px] w-3 rounded-full bg-accent-300" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-3.5 border-t border-gray-100 pt-2.5 text-[10.5px] font-medium text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary-500" /> 연습
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-accent-300" /> 특이일정
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-md bg-surface-blue" /> 연습일
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full ring-2 ring-[#E0A400]" /> 선배 참여
            </span>
          </div>
        </div>
        ) : (
          <WeekGrid
            weekDays={weekDays}
            sessionsByDate={sessionsByDate}
            eventsByDate={eventsByDate}
            seniorDays={seniorDays}
            todayKey={todayKey}
            selected={selected}
            now={now}
            onSelect={setSelected}
          />
        )}

        {/* 선택한 날짜의 정보 */}
        <div className="mt-4 space-y-2">
          <p className="px-1 text-[15px] font-bold text-[#11161F]">
            {selected === todayKey ? '오늘' : selLabel}
          </p>

          {selEvents.map((e) => {
            const c = CAT[e.type];
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-[18px] bg-white p-3.5 shadow-soft">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${c.tile}`}>{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold text-[#11161F]">{e.title}</p>
                  <p className="text-xs font-medium text-gray-500">{c.label}</p>
                </div>
              </div>
            );
          })}

          {selSessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              memberById={memberById}
              todayKey={todayKey}
              canManage={isAdmin || s.createdBy === meId}
              onChanged={invalidateSessions}
            />
          ))}

          {selSessions.length === 0 && selEvents.length === 0 && !addOpen && (
            <p className="rounded-2xl bg-white p-5 text-center text-sm text-gray-400 shadow-soft">이 날은 일정이 없어요</p>
          )}

          {addOpen ? (
            <section className="space-y-2 rounded-[18px] bg-white p-4 shadow-soft">
              <p className="text-[13px] font-bold text-gray-600">{selLabel} 연습 추가</p>
              {matchSlot && (
                <p className="rounded-lg bg-surface-blue px-3 py-2 text-[11px] font-medium text-primary-700">
                  📍 이 요일 고정 연습실({matchSlot.room} {hhmm(matchSlot.startTime)}~{hhmm(matchSlot.endTime)})로 채웠어요 · 추가 연습이면 직접 바꾸세요
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {SESSION_TYPES.map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setStype(t.v)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${stype === t.v ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="연습실 (예: A연습실, 청벽)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
              />
              <div className="flex items-center gap-2">
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none" />
                <span className="text-gray-300">~</span>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none" />
              </div>
              <input
                value={stitle}
                onChange={(e) => setStitle(e.target.value)}
                placeholder="제목 (선택 · 예: 상뽑 준비 연습)"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-500">
                  취소
                </button>
                <button
                  type="button"
                  onClick={() =>
                    room.trim() &&
                    guard(addSession.mutate, {
                      data: { date: selected, room: room.trim(), startTime: start, endTime: end, type: stype, title: stitle.trim() || undefined },
                    })
                  }
                  disabled={!room.trim() || addSession.isPending}
                  className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  추가
                </button>
              </div>
            </section>
          ) : (
            <button
              type="button"
              onClick={openAdd}
              className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-bold text-gray-400"
            >
              + {selLabel.split(' (')[0]} 연습 추가
            </button>
          )}
        </div>
      </main>

      {editOpen && (
        <SlotEditor
          monthStr={monthStr}
          month={cursor.m + 1}
          initial={slotList}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: slotsKey });
            setEditOpen(false);
          }}
        />
      )}

    </>
  );
}

const WK_START = 8;
const WK_END = 23;
const HOUR_H = 42;

function WeekGrid({
  weekDays,
  sessionsByDate,
  eventsByDate,
  seniorDays,
  todayKey,
  selected,
  now,
  onSelect,
}: {
  weekDays: Date[];
  sessionsByDate: Map<string, PracticeSession[]>;
  eventsByDate: Map<string, Event[]>;
  seniorDays: Set<string>;
  todayKey: string;
  selected: string;
  now: Date;
  onSelect: (k: string) => void;
}) {
  const hours = Array.from({ length: WK_END - WK_START + 1 }, (_, i) => WK_START + i);
  const totalH = (WK_END - WK_START + 1) * HOUR_H;
  const nowFloat = now.getHours() + now.getMinutes() / 60;
  const showNow = weekDays.some((d) => keyOf(d) === todayKey) && nowFloat >= WK_START && nowFloat <= WK_END + 1;
  const tint = (t: string) =>
    t === 'hapgut'
      ? { bg: '#FEF3C7', bar: '#F0A81B', tx: '#92660a' }
      : t === 'variable'
        ? { bg: '#EEE9FF', bar: '#8B5CF6', tx: '#5b4b8a' }
        : { bg: '#E7F0FF', bar: '#3B73EF', tx: '#1f49b4' };

  return (
    <div className="rounded-[20px] bg-white p-2 shadow-card">
      <div className="flex">
        <div className="w-7 shrink-0" />
        {weekDays.map((d) => {
          const k = keyOf(d);
          const isToday = k === todayKey;
          const isSel = k === selected;
          const dow = d.getDay();
          return (
            <button key={k} type="button" onClick={() => onSelect(k)} className="flex flex-1 flex-col items-center py-1">
              <span className={`text-[10px] font-bold ${dow === 0 ? 'text-danger' : dow === 6 ? 'text-primary-500' : 'text-gray-400'}`}>
                {DOW_KR[dow]}
              </span>
              <span
                className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                  isToday ? 'bg-primary-500 text-white' : isSel ? 'bg-surface-blue text-primary-700' : 'text-[#11161F]'
                } ${seniorDays.has(k) ? 'ring-2 ring-[#E0A400]' : ''}`}
              >
                {d.getDate()}
              </span>
              <span className="mt-0.5 h-[3px]">
                {eventsByDate.has(k) && <span className="block h-[3px] w-3 rounded-full bg-accent-300" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-1 max-h-[56dvh] overflow-y-auto">
        <div className="relative flex" style={{ height: totalH }}>
          <div className="w-7 shrink-0">
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_H }} className="relative">
                <span className="absolute -top-1.5 right-1 text-[8px] text-gray-300">
                  {h % 12 === 0 ? 12 : h % 12}
                  {h < 12 ? 'a' : 'p'}
                </span>
              </div>
            ))}
          </div>
          {weekDays.map((d) => {
            const k = keyOf(d);
            const daySessions = sessionsByDate.get(k) ?? [];
            return (
              <div key={k} className="relative flex-1 border-l border-gray-100">
                {hours.map((h) => (
                  <div key={h} style={{ height: HOUR_H }} className="border-b border-gray-50" />
                ))}
                {daySessions.map((s) => {
                  const top = (toFloat(s.startTime) - WK_START) * HOUR_H;
                  const h = Math.max((toFloat(s.endTime) - toFloat(s.startTime)) * HOUR_H, 20);
                  const c = tint(s.type);
                  return (
                    <Link
                      key={s.id}
                      href={`/day/${s.date}`}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1 py-0.5"
                      style={{ top, height: h, backgroundColor: c.bg, borderLeft: `2px solid ${c.bar}` }}
                    >
                      <span className="block text-[8px] font-bold leading-tight" style={{ color: c.tx }}>
                        {hhmm(s.startTime)}
                      </span>
                      <span className="block truncate text-[9px] font-bold leading-tight" style={{ color: c.tx }}>
                        {s.title ?? s.room}
                      </span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
          {showNow && (
            <div className="pointer-events-none absolute left-7 right-0 z-10" style={{ top: (nowFloat - WK_START) * HOUR_H }}>
              <div className="h-[1.5px] w-full bg-danger" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ddayLabel(date: string, todayKey: string) {
  const diff = Math.round(
    (new Date(`${date}T00:00:00`).getTime() - new Date(`${todayKey}T00:00:00`).getTime()) / 86_400_000,
  );
  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return null;
}

function AvatarSm({ member }: { member: Member }) {
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-white"
      style={{ backgroundColor: member.color, boxShadow: member.isSenior ? 'inset 0 0 0 2px #E0A400' : undefined }}
    >
      {initial(member.name)}
    </span>
  );
}

function SessionCard({
  session,
  memberById,
  todayKey,
  canManage,
  onChanged,
}: {
  session: PracticeSession;
  memberById: Map<string, Member>;
  todayKey: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { data: atts } = useQuery({
    queryKey: ['attendances', session.id],
    queryFn: () => customFetch<Attendance[]>({ url: `/sessions/${session.id}/attendances`, method: 'GET' }),
  });
  const del = useMutation({
    mutationFn: () => customFetch({ url: `/sessions/${session.id}`, method: 'DELETE' }),
    onSuccess: onChanged,
  });

  const participants = (atts ?? [])
    .filter((a) => a.status === 'yes' || a.status === 'partial')
    .map((a) => memberById.get(a.memberId))
    .filter((m): m is Member => Boolean(m));
  const seniorCount = participants.filter((m) => m.isSenior).length;
  const memberCount = participants.length - seniorCount;
  const dday = ddayLabel(session.date, todayKey);

  return (
    <div className="relative rounded-[18px] bg-white p-4 shadow-soft">
      <Link href={`/day/${session.date}`} className="block">
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-1.5 rounded-full"
            style={{ backgroundColor: session.type === 'hapgut' ? '#F0A81B' : '#3B73EF' }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[15px] font-bold text-[#11161F]">{session.title ?? session.room}</p>
              {dday && (
                <span className="shrink-0 rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {dday}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-gray-500">
              {hhmm(session.startTime)}~{hhmm(session.endTime)} · {session.room}
            </p>
          </div>
          {canManage ? <span className="w-5" /> : <span className="text-gray-300">›</span>}
        </div>
        {participants.length > 0 && (
          <div className="mt-3 flex items-center gap-2.5 border-t border-gray-100 pt-3">
            <div className="flex -space-x-2">
              {participants.slice(0, 5).map((m) => (
                <AvatarSm key={m.id} member={m} />
              ))}
              {participants.length > 5 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 ring-2 ring-white">
                  +{participants.length - 5}
                </span>
              )}
            </div>
            <p className="text-[11.5px] font-medium text-gray-500">
              멤버 {memberCount}명 참여{seniorCount > 0 ? ` · 선배 ${seniorCount}명` : ''}
            </p>
          </div>
        )}
      </Link>

      {canManage && (
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="연습 관리"
          className="absolute right-2.5 top-3 text-gray-300"
        >
          <KebabIcon className="h-4 w-4" />
        </button>
      )}
      {menuOpen && (
        <>
          <button type="button" aria-label="닫기" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2.5 top-9 z-20 w-32 overflow-hidden rounded-xl bg-white py-1 shadow-float ring-1 ring-gray-100">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditing(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-medium text-[#11161F] hover:bg-gray-50"
            >
              ✏️ 수정
            </button>
            <button
              type="button"
              disabled={del.isPending}
              onClick={() => {
                setMenuOpen(false);
                if (confirm('이 연습을 삭제할까요? 참여·기록도 함께 삭제됩니다.')) del.mutate();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13.5px] font-medium text-danger hover:bg-gray-50"
            >
              <TrashIcon className="h-4 w-4" /> 삭제
            </button>
          </div>
        </>
      )}

      {editing && (
        <SessionEditor
          session={session}
          onClose={() => setEditing(false)}
          onSaved={() => {
            onChanged();
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function SessionEditor({
  session,
  onClose,
  onSaved,
}: {
  session: PracticeSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [room, setRoom] = useState(session.room);
  const [start, setStart] = useState(hhmm(session.startTime));
  const [end, setEnd] = useState(hhmm(session.endTime));
  const [stype, setStype] = useState<SessionType>(session.type as SessionType);
  const [stitle, setStitle] = useState(session.title ?? '');

  const save = useMutation({
    mutationFn: () =>
      customFetch({
        url: `/sessions/${session.id}`,
        method: 'PATCH',
        data: { room: room.trim(), startTime: start, endTime: end, type: stype, title: stitle.trim() || null },
      }),
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[400px] space-y-2 rounded-t-[24px] bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center">
          <p className="text-[17px] font-bold text-[#11161F]">연습 수정</p>
          <button type="button" onClick={onClose} className="ml-auto text-2xl leading-none text-gray-300">
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SESSION_TYPES.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setStype(t.v)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${stype === t.v ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="연습실"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
        />
        <div className="flex items-center gap-2">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none" />
          <span className="text-gray-300">~</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none" />
        </div>
        <input
          value={stitle}
          onChange={(e) => setStitle(e.target.value)}
          placeholder="제목 (선택)"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-primary-400"
        />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500">
            취소
          </button>
          <button
            type="button"
            disabled={!room.trim() || save.isPending}
            onClick={() => save.mutate()}
            className="flex-[2] rounded-xl bg-primary-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {save.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => `${pad(h)}:00`).concat(
  Array.from({ length: 24 }, (_, h) => `${pad(h)}:30`),
).sort();

function SlotEditor({
  monthStr,
  month,
  initial,
  onClose,
  onSaved,
}: {
  monthStr: string;
  month: number;
  initial: FixedSlot[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<SlotDraft[]>(
    initial.map((s) => ({ weekday: s.weekday, room: s.room, startTime: hhmm(s.startTime), endTime: hhmm(s.endTime) })),
  );

  const save = useMutation({
    mutationFn: () =>
      customFetch<FixedSlot[]>({
        url: '/fixed-slots',
        method: 'PUT',
        data: { month: monthStr, slots: draft.filter((d) => d.room.trim()) },
      }),
    onSuccess: onSaved,
  });

  function update(i: number, patch: Partial<SlotDraft>) {
    setDraft((arr) => arr.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function remove(i: number) {
    setDraft((arr) => arr.filter((_, idx) => idx !== i));
  }
  function add() {
    setDraft((arr) => [...arr, { weekday: 2, room: 'A연습실', startTime: '19:00', endTime: '21:00' }]);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-[400px] overflow-y-auto rounded-t-[24px] bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center">
          <p className="text-[17px] font-bold text-[#11161F]">고정 연습실 · {month}월</p>
          <button type="button" onClick={onClose} className="ml-auto text-2xl leading-none text-gray-300">
            ×
          </button>
        </div>
        <p className="mb-4 text-[12px] font-medium text-gray-500">
          요일별 연습실/시간을 정해두면, 날짜에 연습 추가할 때 여기서 골라 넣어요.
        </p>

        <div className="space-y-2.5">
          {draft.map((d, i) => (
            <div key={i} className="rounded-[16px] bg-appbg p-3">
              <div className="mb-2 flex items-center gap-1">
                {WEEKDAYS.map((w, wi) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => update(i, { weekday: wi })}
                    className={`h-8 flex-1 rounded-lg text-[12px] font-bold ${
                      d.weekday === wi ? 'bg-primary-500 text-white' : 'bg-white text-gray-400'
                    }`}
                  >
                    {w}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="삭제"
                  className="ml-1 h-8 w-8 shrink-0 rounded-lg bg-white text-danger"
                >
                  ×
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={d.room}
                  onChange={(e) => update(i, { room: e.target.value })}
                  placeholder="연습실"
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400"
                />
                <select
                  value={d.startTime}
                  onChange={(e) => update(i, { startTime: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-sm outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <span className="self-center text-gray-300">~</span>
                <select
                  value={d.endTime}
                  onChange={(e) => update(i, { endTime: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-sm outline-none"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={add}
          className="mt-2.5 w-full rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-bold text-gray-400"
        >
          + 연습실 추가
        </button>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500">
            취소
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="flex-[2] rounded-xl bg-primary-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {save.isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
