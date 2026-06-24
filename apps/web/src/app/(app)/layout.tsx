import { BottomNav } from '@/components/BottomNav';

// 탭 화면 공통 레이아웃 — 하단 네비게이션을 여기서 들고 있어
// 탭 전환 시에도 유지되고, 콘텐츠(페이지)만 로딩된다.
export default function AppTabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
