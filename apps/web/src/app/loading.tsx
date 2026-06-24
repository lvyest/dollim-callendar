// 탭/페이지 전환 시 즉시 보여줄 로딩 UI.
// 이게 있으면 동적 라우트도 클릭 즉시 로딩 상태가 뜨고, 프리페치가 개선돼 전환이 빨라 보인다.
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[400px] items-center justify-center bg-appbg">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-primary-500" />
    </div>
  );
}
