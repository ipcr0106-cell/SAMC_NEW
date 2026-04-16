import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAMC — 식품유형 분류',
  description: '수입식품 검역 AI 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
