"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  caseId?: string;
}

export default function Sidebar({ caseId }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
      {/* 현재 케이스 기능 목록 */}
      {caseId && (
        <div className="p-3 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">검토 단계</p>
          <nav className="space-y-0.5">
            {(() => {
              const href = `/cases/${caseId}/label`;
              const isActive = pathname === href;
              return (
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    5
                  </span>
                  <span className="truncate">한글표시사항</span>
                  {isActive && (
                    <svg className="w-3 h-3 ml-auto text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                </Link>
              );
            })()}
          </nav>
        </div>
      )}
    </aside>
  );
}
