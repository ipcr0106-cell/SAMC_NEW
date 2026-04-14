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
};

export default nextConfig;
