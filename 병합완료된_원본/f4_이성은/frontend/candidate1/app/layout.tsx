import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAMC AI | 수입식품 검역 AI 플랫폼",
  description: "관세법인 SAMC의 AI 기반 수입식품 검역 자동화 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
