import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";

const MOCK_CASES = [
  {
    id: "case-001",
    product: "Pistabella 피스타치오 스프레드",
    origin: "튀르키예",
    status: "completed",
    progress: 5,
    updatedAt: "2026-04-12",
  },
  {
    id: "case-002",
    product: "카다이프 (Pre-Roasted Shredded Kadayif)",
    origin: "튀르키예",
    status: "in_progress",
    progress: 1,
    updatedAt: "2026-04-13",
  },
  {
    id: "case-003",
    product: "Italian Sparkling Water",
    origin: "이탈리아",
    status: "pending",
    progress: 0,
    updatedAt: "2026-04-13",
  },
];

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  completed:   { label: "완료",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { label: "진행중",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  pending:     { label: "대기",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const FEATURE_COLORS = ["bg-blue-500","bg-indigo-500","bg-violet-500","bg-amber-500","bg-emerald-500"];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">케이스 목록</h1>
            <p className="text-sm text-slate-500 mt-0.5">수입식품 검역 검토 케이스를 관리합니다</p>
          </div>
          <Link
            href="/cases/new"
            className="flex items-center gap-2 bg-navy-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 케이스
          </Link>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "전체 케이스", value: "3", icon: "📋" },
            { label: "진행중",      value: "1", icon: "⚡" },
            { label: "완료",        value: "1", icon: "✅" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm">{s.label}</span>
                <span>{s.icon}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            </div>
          ))}
        </div>

        {/* 케이스 목록 */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">전체 케이스</span>
            <input
              type="text"
              placeholder="케이스 검색..."
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-600 placeholder-slate-400"
            />
          </div>
          <div className="divide-y divide-slate-100">
            {MOCK_CASES.map((c) => {
              const st = STATUS_LABEL[c.status];
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 truncate group-hover:text-navy-700 transition-colors">
                        {c.product}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls} shrink-0`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">원산지: {c.origin}</span>
                      <span className="text-xs text-slate-300">|</span>
                      <span className="text-xs text-slate-400">최종 수정: {c.updatedAt}</span>
                    </div>
                  </div>
                  {/* 진행 단계 표시 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {FEATURE_COLORS.map((col, i) => (
                      <div
                        key={i}
                        className={`w-5 h-1.5 rounded-full ${i < c.progress ? col : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
