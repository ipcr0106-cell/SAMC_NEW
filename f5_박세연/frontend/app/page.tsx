"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Case {
  id: string;
  product_name: string;
  importer_name: string;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  processing:  { label: "검토 중",  color: "bg-blue-100 text-blue-700" },
  completed:   { label: "완료",     color: "bg-emerald-100 text-emerald-700" },
  on_hold:     { label: "보류",     color: "bg-amber-100 text-amber-700" },
  error:       { label: "오류",     color: "bg-red-100 text-red-700" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  // 최근 케이스 목록 불러오기
  useEffect(() => {
    fetch(`${BASE_URL}/api/v1/cases`)
      .then((r) => r.json())
      .then((data) => setCases(data.cases ?? []))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false));
  }, []);

  // 새 케이스 생성 → 검토 화면으로 이동
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = productName.trim();
    if (!name) return;

    setCreating(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/api/v1/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name }),
      });
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
      const data = await res.json();
      router.push(`/cases/${data.id}/label`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "케이스 생성에 실패했습니다.");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">SAMC 한글표시사항</h1>
            <p className="text-xs text-slate-400">수입식품 한글표시사항 2단계 교차검증 시스템</p>
          </div>
        </div>

        {/* 새 검토 시작 */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">새 검토 시작</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">제품명</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 수입 피스타치오 퓨레 A"
                disabled={creating}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={creating || !productName.trim()}
              className="w-full py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.83-3.5M20 15a9 9 0 01-15.83 3.5"/>
                  </svg>
                  생성 중...
                </>
              ) : (
                "검토 시작"
              )}
            </button>
          </form>
        </div>

        {/* 최근 검토 목록 */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">최근 검토 목록</h2>
          </div>

          {loadingCases ? (
            <div className="py-10 text-center text-xs text-slate-400">불러오는 중...</div>
          ) : cases.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">아직 검토 내역이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cases.map((c) => {
                const st = STATUS_LABEL[c.status] ?? { label: c.status, color: "bg-slate-100 text-slate-500" };
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => router.push(`/cases/${c.id}/label`)}
                      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.product_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
