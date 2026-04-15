import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API 요청을 Express 서버(포트 3001)로 프록시
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:3001/api/v1/:path*',
      },
    ];
  },
  // 파일 업로드 등 대용량 요청을 위해 body 크기 제한 해제
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
