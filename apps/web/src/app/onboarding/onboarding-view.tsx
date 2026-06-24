'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { customFetch } from '@/lib/api/http';

function Av({ c, t, size = 28 }: { c: string; t: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: c }}
    >
      {t}
    </span>
  );
}

// 슬라이드 1 — 참여 체크
function SlideAttendance() {
  return (
    <div className="rounded-[18px] bg-white p-4 shadow-card">
      <p className="text-[12.5px] font-bold text-gray-500">6월 14일 (토) · 상뽑 준비</p>
      <ul className="mt-3 space-y-2.5">
        {[
          { c: '#3B73EF', t: '경', n: '라경', s: '참여', chip: 'bg-success-soft text-success' },
          { c: '#1F49B4', t: '은', n: '소은', s: '부분참여', chip: 'bg-partial-soft text-[#8a6a00]' },
          { c: '#E0A400', t: '은', n: '지은', s: '불참', chip: 'bg-danger-soft text-danger' },
        ].map((r) => (
          <li key={r.n} className="flex items-center gap-2.5">
            <Av c={r.c} t={r.t} />
            <span className="flex-1 text-[13.5px] font-bold text-[#11161F]">{r.n}</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${r.chip}`}>{r.s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 슬라이드 2 — 배운 것 + 영상 + 댓글 (실제 UI 기준)
function SlideNote() {
  return (
    <div className="rounded-[18px] bg-white p-4 shadow-card">
      <div className="flex items-center gap-2.5">
        <Av c="#F0A81B" t="가" size={26} />
        <span className="text-[13px] font-bold text-[#11161F]">김가영</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-[#384150]">오금질 영상 참고해보면 좋을 것 같아! 🔥</p>
      {/* 유튜브 임베드 느낌 */}
      <div className="mt-2 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#b23a23] via-[#d98b2b] to-[#caa24a]">
        <span className="flex h-8 w-12 items-center justify-center rounded-[7px] bg-[#FF0000]">
          <span className="text-[11px] text-white">▶</span>
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-4 border-t border-gray-100 pt-2.5 text-[12px] font-bold">
        <span className="text-[#F2555A]">♥ 좋아요 1</span>
        <span className="text-gray-500">💬 댓글 2</span>
      </div>
      <div className="mt-2.5 flex items-start gap-2">
        <Av c="#F0A81B" t="가" size={20} />
        <div>
          <p className="text-[12px] leading-snug text-[#384150]">
            <span className="font-bold text-[#11161F]">김가영</span> 유튜브 링크 등록, 직접 영상 첨부도 가능해요!
          </p>
          <div className="mt-1 flex gap-2.5 text-[10.5px] font-bold text-gray-400">
            <span>답글</span>
            <span>수정</span>
            <span>삭제</span>
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-full bg-gray-50 px-3.5 py-2 text-[11.5px] text-gray-400">
        댓글 달기…
        <span className="ml-auto rounded-full bg-primary-500 px-3 py-1 text-[11px] font-bold text-white">등록</span>
      </div>
    </div>
  );
}

// 슬라이드 3 — 특이일정 + 방명록
function SlideSocial() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 rounded-[18px] bg-white p-3.5 shadow-card">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-lg">🎤</span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-gray-500">외부공연 · 6.20~6.21</p>
          <p className="text-[14px] font-bold text-[#11161F]">타 동아리 합동공연</p>
        </div>
      </div>
      <div className="rounded-[18px] bg-white p-3.5 shadow-card">
        <div className="flex items-center gap-2">
          <Av c="#E0A400" t="은" size={26} />
          <span className="text-[13px] font-bold text-[#11161F]">지은</span>
          <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[9.5px] font-bold text-[#8a6a00]">선배</span>
        </div>
        <p className="mt-2 text-[13px] text-[#384150]">다음 상뽑 준비 고생 많았어요! 화이팅 🔥</p>
      </div>
    </div>
  );
}

const SLIDES = [
  {
    emoji: '✅',
    tint: 'bg-surface-blue',
    glow: '#3B73EF',
    title: (
      <>
        매일 참여를 <span className="text-primary-600">한눈에</span> 체크
      </>
    ),
    sub: '연습마다 참여·부분참여·불참을 칩으로 빠르게 남겨요',
    visual: <SlideAttendance />,
  },
  {
    emoji: '🎬',
    tint: 'bg-accent-50',
    glow: '#F0A81B',
    title: (
      <>
        배운 것과 <span className="text-senior">영상</span>까지 함께
      </>
    ),
    sub: '각자 기록하고, 영상엔 댓글로 피드백까지 주고받아요',
    visual: <SlideNote />,
  },
  {
    emoji: '💬',
    tint: 'bg-surface-mint',
    glow: '#16B364',
    title: (
      <>
        특이일정·<span className="text-senior">방명록</span>으로 소통
      </>
    ),
    sub: '연습 외 일정은 특이일정으로, 동아리 피드백은 방명록에 남겨요',
    visual: <SlideSocial />,
  },
];

export function OnboardingView({ preview }: { preview: boolean }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i]!;

  async function finish() {
    if (done) return;
    setDone(true);
    if (preview) {
      router.replace('/mypage');
      return;
    }
    try {
      await customFetch({ url: '/me/onboarded', method: 'POST' });
    } catch {
      /* 실패해도 진행 */
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex h-dvh max-w-[400px] flex-col bg-appbg px-6 pb-8 pt-14">
      <div className="flex h-6 shrink-0 items-center justify-end">
        {!last && (
          <button type="button" onClick={finish} className="text-[13px] font-bold text-gray-400">
            건너뛰기
          </button>
        )}
      </div>

      <div key={i} className="flex flex-1 flex-col overflow-y-auto [animation:obUp_0.35s_ease]">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl [animation:obPop_0.4s_ease] ${slide.tint}`}
        >
          {slide.emoji}
        </span>
        <h1 className="mt-4 break-keep text-[23px] font-bold leading-snug text-[#11161F]">{slide.title}</h1>
        <p className="mt-2 break-keep text-[14px] leading-relaxed text-gray-500">{slide.sub}</p>
        <div className="mb-2 mt-6">{slide.visual}</div>
      </div>

      <div className="mt-5 shrink-0">
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-primary-500' : 'w-1.5 bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI((v) => v - 1)}
              className="rounded-2xl border border-gray-200 px-5 py-3.5 text-[15px] font-bold text-gray-500"
            >
              이전
            </button>
          )}
          <button
            type="button"
            onClick={last ? finish : () => setI((v) => v + 1)}
            disabled={done}
            className="flex-1 rounded-2xl bg-primary-500 py-3.5 text-[15px] font-bold text-white shadow-soft disabled:opacity-60"
          >
            {last ? (preview ? '닫기' : '시작하기') : '다음'}
          </button>
        </div>
      </div>
    </main>
  );
}
