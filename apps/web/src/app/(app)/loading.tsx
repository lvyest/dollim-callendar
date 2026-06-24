// 탭 콘텐츠 로딩 스켈레톤 — 하단바는 레이아웃에서 유지되고, 이 영역만 로딩된다.
export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[400px] bg-appbg px-5 pb-28 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-6 w-28 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-72 animate-pulse rounded-[22px] bg-gray-100" />
      </div>
    </main>
  );
}
