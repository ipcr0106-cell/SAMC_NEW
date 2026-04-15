"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-slate-200 flex items-center px-6">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-navy-700 flex items-center justify-center">
          <span className="text-white text-xs font-bold">S</span>
        </div>
        <span className="font-bold text-navy-700 text-base tracking-tight">SAMC AI</span>
      </Link>

      <div className="ml-8 hidden md:flex items-center gap-6 text-sm text-slate-500">
        {isLanding && (
          <>
            <a href="#features" className="hover:text-navy-700 transition-colors">주요 기능</a>
            <a href="#how" className="hover:text-navy-700 transition-colors">이용 안내</a>
          </>
        )}
        {!isLanding && (
          <>
            <Link href="/dashboard" className="hover:text-navy-700 transition-colors">케이스 목록</Link>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {isLanding ? (
          <>
            <Link href="/login" className="text-sm text-slate-600 hover:text-navy-700 transition-colors">로그인</Link>
            <Link href="/login" className="text-sm bg-navy-700 text-white px-4 py-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              시작하기
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/admin/laws" className="text-xs text-slate-500 hover:text-navy-700 transition-colors px-2 py-1 rounded">
              관리자
            </Link>
            <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 text-xs font-bold cursor-pointer">
              담
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
