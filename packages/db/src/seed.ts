import { config } from 'dotenv';

config({ path: '../../apps/web/.env.local' });

import { like } from 'drizzle-orm';

import {
  attendances,
  comments,
  eventMembers,
  events,
  fixedSlots,
  getDb,
  guestbookLikes,
  guestbookPosts,
  members,
  noteLikes,
  noteMedia,
  notes,
  practiceSessions,
} from './index';

const pad = (n: number) => String(n).padStart(2, '0');

async function main() {
  const db = getDb();

  // 오늘 기준 동적 날짜 (언제 시드해도 "오늘" 데이터가 보이도록)
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const T = now.getDate();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const within = (d: number) => Math.min(Math.max(d, 1), daysInMonth);
  const dateOf = (d: number) => `${y}-${pad(mo + 1)}-${pad(within(d))}`;

  console.log('🧹 기존 mock 데이터 정리 (실제 가입 유저는 보존)…');
  await db.delete(guestbookPosts);
  await db.delete(events);
  await db.delete(practiceSessions);
  await db.delete(fixedSlots).where(like(fixedSlots.yearMonth, `${y}-%`));
  await db.delete(members).where(like(members.kakaoId, 'seed-%'));

  console.log('👥 멤버…');
  const m = await db
    .insert(members)
    .values([
      { name: '라경', generation: 13, role: 'member', isSenior: false, color: '#3B73EF', kakaoId: 'seed-1', status: 'approved', approvedAt: new Date() },
      { name: '소은', generation: 13, role: 'member', isSenior: false, color: '#1F49B4', kakaoId: 'seed-2', status: 'approved', approvedAt: new Date() },
      { name: '민수', generation: 13, role: 'member', isSenior: false, color: '#8B5CF6', kakaoId: 'seed-3', status: 'approved', approvedAt: new Date() },
      { name: '해린', generation: 13, role: 'member', isSenior: false, color: '#EC4899', kakaoId: 'seed-4', status: 'approved', approvedAt: new Date() },
      { name: '도윤', generation: 13, role: 'member', isSenior: false, color: '#0EA5E9', kakaoId: 'seed-9', status: 'approved', approvedAt: new Date() },
      { name: '하늘', generation: 13, role: 'member', isSenior: false, color: '#14B8A6', kakaoId: 'seed-10', status: 'approved', approvedAt: new Date() },
      { name: '지은', generation: 12, role: 'member', isSenior: true, color: '#E0A400', kakaoId: 'seed-5', status: 'approved', approvedAt: new Date() },
      { name: '연주', generation: 12, role: 'member', isSenior: true, color: '#4F46E5', kakaoId: 'seed-6', status: 'approved', approvedAt: new Date() },
      { name: '규원', generation: 11, role: 'member', isSenior: true, color: '#16A34A', kakaoId: 'seed-11', status: 'approved', approvedAt: new Date() },
      { name: '이도현', generation: 14, role: 'member', isSenior: false, color: '#F97316', kakaoId: 'seed-7', status: 'pending' },
      { name: '박서연', generation: 14, role: 'member', isSenior: false, color: '#84CC16', kakaoId: 'seed-8', status: 'pending' },
      { name: '최유진', generation: 14, role: 'member', isSenior: false, color: '#06B6D4', kakaoId: 'seed-12', status: 'pending' },
    ])
    .returning();

  const byName = new Map(m.map((x) => [x.name, x.id]));
  const id = (name: string) => {
    const v = byName.get(name);
    if (!v) throw new Error(`멤버 없음: ${name}`);
    return v;
  };

  console.log('📌 고정 연습실 (이번 달)…');
  const ym = `${y}-${pad(mo + 1)}`;
  await db.insert(fixedSlots).values([
    { yearMonth: ym, weekday: 2, room: '청벽', startTime: '19:00:00', endTime: '21:00:00' },
    { yearMonth: ym, weekday: 3, room: 'A연습실', startTime: '10:00:00', endTime: '12:00:00' },
    { yearMonth: ym, weekday: 4, room: 'A연습실', startTime: '17:00:00', endTime: '20:00:00' },
    { yearMonth: ym, weekday: 5, room: 'A연습실', startTime: '14:00:00', endTime: '17:00:00' },
  ]);

  console.log('🗓️ 세션 (한 달 분량)…');
  type Spec = { day: number; room: string; start: string; end: string; type: 'fixed' | 'variable' | 'hapgut'; title: string | null };
  const specs: Spec[] = [];
  for (const d of [2, 4, 9, 11, 16, 18, 25, 27, 30]) {
    if (d > daysInMonth) continue;
    const odd = d % 2 === 1;
    specs.push({
      day: d,
      room: odd ? 'A연습실' : '청벽',
      start: odd ? '17:00:00' : '19:00:00',
      end: odd ? '20:00:00' : '21:00:00',
      type: odd ? 'fixed' : 'hapgut',
      title: odd ? null : '청벽 합굿',
    });
  }
  // 오늘: 연습 2개 (멀티 세션 확인용)
  specs.push({ day: T, room: 'A연습실', start: '14:00:00', end: '17:00:00', type: 'fixed', title: '상뽑 준비 연습' });
  specs.push({ day: T, room: '청벽', start: '19:00:00', end: '21:00:00', type: 'hapgut', title: '청벽 합굿' });

  const s = await db
    .insert(practiceSessions)
    .values(specs.map((sp) => ({ date: dateOf(sp.day), room: sp.room, startTime: sp.start, endTime: sp.end, type: sp.type, title: sp.title, createdBy: id('라경') })))
    .returning();
  const todayA = s.find((x) => x.title === '상뽑 준비 연습')!.id;
  const recent = s.find((x) => x.date === dateOf(2))?.id ?? s[0]!.id;

  console.log('✅ 참여…');
  await db.insert(attendances).values([
    { sessionId: todayA, memberId: id('라경'), status: 'yes' },
    { sessionId: todayA, memberId: id('소은'), status: 'partial', reason: '16시 이후 합류' },
    { sessionId: todayA, memberId: id('민수'), status: 'undecided' },
    { sessionId: todayA, memberId: id('해린'), status: 'no', reason: '알바 시간과 겹침' },
    { sessionId: todayA, memberId: id('도윤'), status: 'yes' },
    { sessionId: todayA, memberId: id('하늘'), status: 'partial', reason: '15시까지만' },
    { sessionId: todayA, memberId: id('지은'), status: 'yes' },
    { sessionId: todayA, memberId: id('연주'), status: 'partial', reason: '잠깐 들러요' },
    { sessionId: recent, memberId: id('라경'), status: 'yes' },
    { sessionId: recent, memberId: id('소은'), status: 'yes' },
    { sessionId: recent, memberId: id('민수'), status: 'no', reason: '시험기간' },
  ]);

  console.log('📝 배운 것 + 영상 + 좋아요 + 댓글/답글…');
  const n = await db
    .insert(notes)
    .values([
      { sessionId: todayA, authorId: id('라경'), content: '윗놀음 8박 외사→양사 전환 완성! 발동작 합도 맞춰봄. 사위 각도 더 크게 가는 거 연습 필요 🔥' },
      { sessionId: todayA, authorId: id('소은'), content: '앞 1시간만 참여했지만 손목 스냅 위주로 점검함. 라경이 영상 보고 따라하니 금방 맞춰짐 👍' },
      { sessionId: todayA, authorId: id('지은'), content: '후배들 많이 늘었다! 다음 주 합굿 전까지 대형 한 번만 더 맞춰보자.' },
    ])
    .returning();
  await db.insert(noteMedia).values([
    { noteId: n[0]!.id, kind: 'link', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnailUrl: null, storagePath: null, durationSec: 48, sizeBytes: null },
    { noteId: n[1]!.id, kind: 'link', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnailUrl: null, storagePath: null, durationSec: 35, sizeBytes: null },
  ]);
  await db.insert(noteLikes).values([
    { noteId: n[0]!.id, memberId: id('소은') },
    { noteId: n[0]!.id, memberId: id('지은') },
    { noteId: n[0]!.id, memberId: id('도윤') },
    { noteId: n[2]!.id, memberId: id('라경') },
  ]);
  const c = await db
    .insert(comments)
    .values([{ noteId: n[0]!.id, authorId: id('소은'), parentId: null, content: '사위 각도 진짜 좋아졌다 👏' }])
    .returning();
  await db.insert(comments).values([
    { noteId: n[0]!.id, authorId: id('지은'), parentId: null, content: '다음엔 박 더 빠르게 가보자!' },
    { noteId: n[0]!.id, authorId: id('라경'), parentId: c[0]!.id, content: 'ㄱㅅㅎ 다음엔 더 크게 가볼게요!' },
  ]);

  console.log('⭐ 특이일정 (전 유형)…');
  const ev = await db
    .insert(events)
    .values([
      { type: 'performance', title: '타 동아리 합동공연', description: 'OO문화홀 · 이 기간 정규 연습 없음', dateStart: dateOf(T - 3), dateEnd: dateOf(T - 2), location: 'OO문화홀', createdBy: id('라경') },
      { type: 'training', title: '신입생 전수', description: '소은 선배 진행 · 정규 연습 휴무', dateStart: dateOf(T + 2), dateEnd: null, location: '동아리방', createdBy: id('소은') },
      { type: 'training', title: '여름 연수 (1박 2일)', description: '단체 합 맞추기 + 친목', dateStart: dateOf(T + 5), dateEnd: dateOf(T + 6), location: '양평', createdBy: id('라경') },
      { type: 'hapgut', title: '정기 합굿 공연', description: '대운동장 본공연', dateStart: dateOf(T + 9), dateEnd: null, location: '대운동장', createdBy: id('지은') },
      { type: 'etc', title: '동아리 회식', description: '공연 뒤풀이 🍻', dateStart: dateOf(T - 7), dateEnd: null, location: null, createdBy: id('규원') },
    ])
    .returning();
  await db.insert(eventMembers).values([
    { eventId: ev[0]!.id, memberId: id('소은') },
    { eventId: ev[0]!.id, memberId: id('연주') },
    { eventId: ev[0]!.id, memberId: id('지은') },
    { eventId: ev[2]!.id, memberId: id('라경') },
    { eventId: ev[2]!.id, memberId: id('도윤') },
    { eventId: ev[2]!.id, memberId: id('하늘') },
    { eventId: ev[3]!.id, memberId: id('지은') },
  ]);

  console.log('📓 방명록…');
  const g = await db
    .insert(guestbookPosts)
    .values([
      { authorId: id('지은'), content: '다들 상뽑 준비 고생 많아요! 영상 보니까 실력 진짜 많이 늘었더라 ㅎㅎ' },
      { authorId: id('민수'), content: '연습실 에어컨 좀 더 일찍 틀어주면 좋겠어요~ (소소한 피드백입니다!)' },
      { authorId: id('연주'), content: '신입생들 너무 잘 따라와줘서 든든해요. 우리 청천벽력 화이팅!' },
      { authorId: id('규원'), content: '졸업했지만 항상 응원합니다 🙌 합굿 공연 보러 갈게요!' },
      { authorId: id('도윤'), content: '다음 곡 선정 의견 받아요~ 방명록에 댓글 말고 단톡에 남겨주세요!' },
      { authorId: id('하늘'), content: '연습 끝나고 같이 밥 먹을 사람 모집합니다 🍚' },
    ])
    .returning();
  await db.insert(guestbookLikes).values([
    { postId: g[0]!.id, memberId: id('라경') },
    { postId: g[0]!.id, memberId: id('소은') },
    { postId: g[0]!.id, memberId: id('민수') },
    { postId: g[3]!.id, memberId: id('지은') },
    { postId: g[3]!.id, memberId: id('연주') },
  ]);

  console.log('🎉 시드 완료! (멤버 12 · 세션 ' + s.length + ' · 특이일정 5 · 방명록 6)');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
