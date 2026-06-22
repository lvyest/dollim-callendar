import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 워크스페이스 패키지를 TS 소스 그대로 트랜스파일.
  transpilePackages: ['@dollim/contracts', '@dollim/db'],
};

export default nextConfig;
