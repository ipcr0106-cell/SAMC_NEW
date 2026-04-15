"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const FEATURES = [
  { num: 1, label: "수입가능여부 판정", short: "수입가능여부", color: "bg-blue-500" },
  { num: 2, label: "식품유형 분류",     short: "식품유형",     color: "bg-indigo-500" },
  { num: 3, label: "수입필요서류 안내", short: "필요서류",     color: "bg-violet-500" },
  { num: 4, label: "수출국표시사항 검토",short: "표시사항",    color: "bg-amber-500" },
  { num: 5, label: "한글표시사항 시안", short: "한글표시사항", color: "bg-emerald-500" },
];

interface SidebarProps {
  caseId?: string;
}

export default function Sidebar({ caseId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
      {/* 케이스 목록 링크 */}
      <div className="p-3 border-b border-slate-100">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/dashboard"
              ? "bg-navy-50 text-navy-700 font-medium"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
          </svg>
          케이스 목록
        </Link>
        <Link
          href="/cases/new"
          className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 케이스
        </Link>
      </div>

      {/* 현재 케이스 기능 목록 */}
      {caseId && (
        <div className="p-3 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">검토 단계</p>
          <nav className="space-y-0.5">
            {FEATURES.map((f) => {
              const href = `/cases/${caseId}/feature${f.num}`;
              const isActive = pathname === href;
              const isCasePage = pathname === `/cases/${caseId}`;
              return (
                <Link
                  key={f.num}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full ${f.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {f.num}
                  </span>
                  <span className="truncate">{f.short}</span>
                  {isActive && (
                    <svg className="w-3 h-3 ml-auto text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* 하단 */}
      <div className="p-3 border-t border-slate-100">
        <Link href="/admin/laws" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          법령 DB 관리
        </Link>
      </div>
    </aside>
  );
}
