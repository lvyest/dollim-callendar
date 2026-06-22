import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/lib/query/provider';

import './globals.css';

export const metadata: Metadata = {
  // 카톡 등 공유 썸네일은 절대경로가 필요 — 배포 도메인 기준(환경변수로 덮어쓰기 가능).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dollim-callendar-web.vercel.app'),
  title: '돌림력',
  description: '상모도 돌리고, 일정도 돌리는 채상인들을 위한 캘린더',
  applicationName: '돌림력',
  // 링크 공유 미리보기 카드. og:image 는 app/opengraph-image.png 가 자동 연결됩니다.
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '돌림력',
    title: '돌림력',
    description: '상모도 돌리고, 일정도 돌리는 청천벽력 채상인들을 위한 캘린더',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B73EF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
